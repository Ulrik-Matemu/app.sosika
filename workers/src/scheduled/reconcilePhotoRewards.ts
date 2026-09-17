/**
 * Reconciliation sweep for the notifyPhotoApproved RPC (see
 * routes/wallet.ts). Since photo-reward crediting is no longer an automatic
 * Firestore trigger, a network blip between the admin's approve action and
 * the RPC call can leave a submission "approved" with no matching wallet
 * credit. This heals that gap by finding approved submissions with no
 * corresponding wallet_transactions/photo_reward_{id} doc and crediting them
 * — reusing the same idempotent credit path, so this is always safe to
 * re-run.
 */
import type { Env } from "../lib/env";
import { firestoreServiceAccount } from "../lib/env";
import { FirestoreClient } from "../lib/firestoreRest";
import { normalizePhone } from "../lib/phone";
import { sendPushToPhone } from "../lib/fcm";

const DEFAULT_PHOTO_REWARD_TZS = 1000;

export async function reconcilePhotoRewards(env: Env): Promise<{ checked: number; healed: number; errors: string[] }> {
  const db = new FirestoreClient(env.FIREBASE_PROJECT_ID, firestoreServiceAccount(env));
  const errors: string[] = [];
  let healed = 0;

  const approved = await db.queryEquals<{ status?: string; phone?: string; menuItemName?: string }>("food_photo_submissions", [
    { field: "status", value: "approved" },
  ]);

  let rewardAmount = DEFAULT_PHOTO_REWARD_TZS;
  try {
    const settings = await db.getDoc<{ photoRewardAmount?: number }>("system_settings/global");
    if (typeof settings?.photoRewardAmount === "number" && settings.photoRewardAmount > 0) {
      rewardAmount = settings.photoRewardAmount;
    }
  } catch (err) {
    console.warn("[reconcilePhotoRewards] Failed to read reward config, using default:", err);
  }

  for (const submission of approved) {
    const txPath = `wallet_transactions/photo_reward_${submission.id}`;
    const existing = await db.getDoc(txPath);
    if (existing) continue; // already credited

    const phone = normalizePhone(submission.data.phone || "");
    if (!phone) continue; // nothing to credit, matches original skip behavior

    const description = `Reward for approved food photo (${submission.data.menuItemName || "Meal"}) [reconciled]`;
    try {
      await db.runTransaction(async (tx) => {
        const txSnap = await tx.get(txPath);
        if (txSnap) return;
        const wallet = await tx.get(`wallets/${phone}`);
        const currentBalance = (wallet?.balance as number) || 0;
        const newBalance = currentBalance + rewardAmount;
        tx.set(`wallets/${phone}`, { phone, balance: newBalance, updatedAt: new Date() });
        tx.set(txPath, {
          id: `photo_reward_${submission.id}`,
          phone,
          amount: rewardAmount,
          type: "photo_reward",
          description,
          referenceId: submission.id,
          timestamp: new Date(),
        });
      });
      healed++;
      console.log(`[reconcilePhotoRewards] Healed missing credit for submission ${submission.id}`);
      try {
        await sendPushToPhone(env, db, phone, {
          title: "Sosika Cash credited!",
          body: `TZS ${rewardAmount.toLocaleString()} added — ${description}`,
          url: "/wallet",
        });
      } catch (pushErr) {
        console.warn(`[reconcilePhotoRewards] Failed to send credit push to ${phone}:`, pushErr);
      }
    } catch (err) {
      errors.push(`submission ${submission.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { checked: approved.length, healed, errors };
}
