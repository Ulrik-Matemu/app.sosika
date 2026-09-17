/**
 * Server-authoritative Sosika Cash wallet operations.
 *
 * Every wallet credit in the app now goes through `creditWalletAtomic` below.
 * The client-side equivalents this replaces (src/context/WalletContext.tsx's
 * `creditWalletBalance` self-reconciliation, and the direct wallet writes in
 * src/components/admin/PhotoModerationConsole.tsx and
 * src/components/admin/WalletConsole.tsx) are removed as part of the same
 * change — Firestore rules now deny client writes to `wallets` and
 * `wallet_transactions` entirely.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { assertIsAdmin } from "./adminGuard";
import { normalizePhone } from "./phone";

type WalletTransactionType =
  | "photo_reward"
  | "manual_topup"
  | "gateway_topup"
  | "order_payment"
  | "admin_adjustment"
  | "refund";

const DEFAULT_PHOTO_REWARD_TZS = 1000;

interface CreditParams {
  phone: string; // already normalized (+255...)
  amount: number; // positive TZS amount
  description: string;
  type: WalletTransactionType;
  referenceId?: string;
  /**
   * When provided, used as the wallet_transactions document ID so the
   * credit is idempotent — retrying (e.g. a re-delivered Firestore trigger
   * event) is a safe no-op instead of a double payout. Omit only for
   * one-shot admin actions that have no natural retry path.
   */
  idempotencyKey?: string;
}

async function creditWalletAtomic(params: CreditParams): Promise<number> {
  const db = admin.firestore();
  const walletRef = db.collection("wallets").doc(params.phone);
  const txRef = params.idempotencyKey
    ? db.collection("wallet_transactions").doc(params.idempotencyKey)
    : db.collection("wallet_transactions").doc();

  return db.runTransaction(async (transaction) => {
    const txSnap = await transaction.get(txRef);
    if (txSnap.exists) {
      // Already credited under this idempotency key — read the current
      // balance for the caller rather than re-applying the credit.
      const existingWallet = await transaction.get(walletRef);
      return existingWallet.exists ? (existingWallet.data()?.balance || 0) : 0;
    }

    const walletSnap = await transaction.get(walletRef);
    const currentBalance = walletSnap.exists ? (walletSnap.data()?.balance || 0) : 0;
    const newBalance = currentBalance + params.amount;

    transaction.set(
      walletRef,
      { phone: params.phone, balance: newBalance, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    transaction.set(txRef, {
      id: txRef.id,
      phone: params.phone,
      amount: params.amount,
      type: params.type,
      description: params.description,
      referenceId: params.referenceId || "",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return newBalance;
  });
}

/**
 * onFoodPhotoApproved
 *
 * Fires when an admin flips a food_photo_submissions doc's status to
 * "approved" (src/components/admin/PhotoModerationConsole.tsx, which no
 * longer touches wallets itself). Credits the reward from
 * system_settings/global.photoRewardAmount — never from the submission's
 * own `rewardAmount` field, which is client-supplied at upload time
 * (src/components/my-components/UploadFoodPhotoModal.tsx) and therefore not
 * trustworthy.
 */
export const onFoodPhotoApproved = onDocumentUpdated(
  "food_photo_submissions/{submissionId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;
    // Only act on the pending/rejected -> approved transition, so re-saving
    // an already-approved doc (or approving twice) never re-credits.
    if (before.status === "approved" || after.status !== "approved") return;

    const phone = normalizePhone(after.phone || "");
    if (!phone) {
      console.warn(
        `[onFoodPhotoApproved] submission ${event.params.submissionId} has no usable phone; skipping credit.`
      );
      return;
    }

    let rewardAmount = DEFAULT_PHOTO_REWARD_TZS;
    try {
      const settingsSnap = await admin.firestore().collection("system_settings").doc("global").get();
      const configured = settingsSnap.data()?.photoRewardAmount;
      if (typeof configured === "number" && configured > 0) {
        rewardAmount = configured;
      }
    } catch (err) {
      console.warn("[onFoodPhotoApproved] Failed to read reward config, using default:", err);
    }

    await creditWalletAtomic({
      phone,
      amount: rewardAmount,
      description: `Reward for approved food photo (${after.menuItemName || "Meal"})`,
      type: "photo_reward",
      referenceId: event.params.submissionId,
      idempotencyKey: `photo_reward_${event.params.submissionId}`,
    });
  }
);

interface AdminCreditWalletData {
  phone: string;
  amount: number;
  description?: string;
  type?: "manual_topup" | "refund" | "admin_adjustment";
}

/**
 * adminCreditWallet
 *
 * Replaces the direct wallet write in src/components/admin/WalletConsole.tsx.
 * Used for manual Lipa Namba top-ups and one-off adjustments/refunds.
 */
export const adminCreditWallet = onCall({ cors: true }, async (request) => {
  assertIsAdmin(request);

  const { phone: rawPhone, amount, description, type } = (request.data || {}) as AdminCreditWalletData;
  const phone = normalizePhone(rawPhone || "");

  if (!phone) {
    throw new HttpsError("invalid-argument", "A valid phone number is required.");
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError("invalid-argument", "Amount must be a positive number.");
  }

  const allowedTypes: AdminCreditWalletData["type"][] = ["manual_topup", "refund", "admin_adjustment"];
  const creditType = allowedTypes.includes(type) ? (type as NonNullable<typeof type>) : "manual_topup";

  const newBalance = await creditWalletAtomic({
    phone,
    amount,
    description: description?.trim() || "Admin wallet adjustment",
    type: creditType,
  });

  return { success: true, phone, balance: newBalance };
});
