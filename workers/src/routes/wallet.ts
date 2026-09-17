/**
 * Server-authoritative Sosika Cash wallet operations. Ported from
 * functions/src/wallet.ts. `creditWalletAtomic` is the single source of
 * truth for every wallet credit; `notifyPhotoApproved` replaces the old
 * onFoodPhotoApproved Firestore trigger with an explicit RPC that
 * re-validates everything server-side (see comments below).
 */
import { Hono } from "hono";
import type { Env, Variables } from "../lib/env";
import { firestoreServiceAccount } from "../lib/env";
import { FirestoreClient } from "../lib/firestoreRest";
import { normalizePhone } from "../lib/phone";
import { requireAuth, requireAdmin } from "../lib/adminGuard";
import { invalidArgument } from "../lib/errors";

const DEFAULT_PHOTO_REWARD_TZS = 1000;

type WalletTransactionType = "photo_reward" | "manual_topup" | "gateway_topup" | "order_payment" | "admin_adjustment" | "refund";

interface CreditParams {
  phone: string;
  amount: number;
  description: string;
  type: WalletTransactionType;
  referenceId?: string;
  idempotencyKey?: string;
}

async function creditWalletAtomic(db: FirestoreClient, params: CreditParams): Promise<number> {
  const walletPath = `wallets/${params.phone}`;
  const txPath = params.idempotencyKey ? `wallet_transactions/${params.idempotencyKey}` : `wallet_transactions/${crypto.randomUUID()}`;

  return db.runTransaction(async (tx) => {
    if (params.idempotencyKey) {
      const existingTx = await tx.get(txPath);
      if (existingTx) {
        const existingWallet = await tx.get(walletPath);
        return (existingWallet?.balance as number) || 0;
      }
    }

    const wallet = await tx.get(walletPath);
    const currentBalance = (wallet?.balance as number) || 0;
    const newBalance = currentBalance + params.amount;

    tx.set(walletPath, { phone: params.phone, balance: newBalance, updatedAt: new Date() });
    tx.set(txPath, {
      id: txPath.split("/").pop(),
      phone: params.phone,
      amount: params.amount,
      type: params.type,
      description: params.description,
      referenceId: params.referenceId || "",
      timestamp: new Date(),
    });

    return newBalance;
  });
}

export const walletRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * POST /adminCreditWallet — admin-gated manual top-up/refund/adjustment.
 * No idempotency key: intentional, matches original one-off-action design.
 */
walletRoutes.post("/adminCreditWallet", requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json<{ phone?: string; amount?: number; description?: string; type?: string }>();
  const phone = normalizePhone(body.phone || "");
  if (!phone) throw invalidArgument("A valid phone number is required.");
  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
    throw invalidArgument("Amount must be a positive number.");
  }

  const allowedTypes = ["manual_topup", "refund", "admin_adjustment"];
  const creditType = (allowedTypes.includes(body.type || "") ? body.type : "manual_topup") as WalletTransactionType;

  const db = new FirestoreClient(c.env.FIREBASE_PROJECT_ID, firestoreServiceAccount(c.env));
  const balance = await creditWalletAtomic(db, {
    phone,
    amount: body.amount,
    description: body.description?.trim() || "Admin wallet adjustment",
    type: creditType,
  });

  return c.json({ success: true, phone, balance });
});

/**
 * POST /notifyPhotoApproved — replaces the onFoodPhotoApproved Firestore
 * trigger. The client (PhotoModerationConsole.tsx) still flips
 * food_photo_submissions.status to "approved" itself (Firestore rules keep
 * that admin-only); this RPC only tells the Worker "go look at this one".
 * Everything sensitive — status, phone, reward amount — is re-read fresh
 * from Firestore here, never trusted from the request body, so a forged or
 * stale request body can't change the payout.
 */
walletRoutes.post("/notifyPhotoApproved", requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json<{ submissionId?: string }>();
  if (!body.submissionId) throw invalidArgument("submissionId is required.");

  const db = new FirestoreClient(c.env.FIREBASE_PROJECT_ID, firestoreServiceAccount(c.env));

  const submission = await db.getDoc<{ status?: string; phone?: string; menuItemName?: string }>(
    `food_photo_submissions/${body.submissionId}`
  );
  if (!submission) throw invalidArgument("No such submission.");
  if (submission.status !== "approved") {
    // Not actually approved (yet, or anymore) — no-op, matches the original
    // trigger's before/after status-transition guard.
    return c.json({ success: true, credited: false, reason: "Submission is not in approved status." });
  }

  const phone = normalizePhone(submission.phone || "");
  if (!phone) {
    return c.json({ success: true, credited: false, reason: "Submission has no usable phone." });
  }

  let rewardAmount = DEFAULT_PHOTO_REWARD_TZS;
  try {
    const settings = await db.getDoc<{ photoRewardAmount?: number }>("system_settings/global");
    if (typeof settings?.photoRewardAmount === "number" && settings.photoRewardAmount > 0) {
      rewardAmount = settings.photoRewardAmount;
    }
  } catch (err) {
    console.warn("[notifyPhotoApproved] Failed to read reward config, using default:", err);
  }

  const balance = await creditWalletAtomic(db, {
    phone,
    amount: rewardAmount,
    description: `Reward for approved food photo (${submission.menuItemName || "Meal"})`,
    type: "photo_reward",
    referenceId: body.submissionId,
    idempotencyKey: `photo_reward_${body.submissionId}`,
  });

  return c.json({ success: true, credited: true, balance });
});
