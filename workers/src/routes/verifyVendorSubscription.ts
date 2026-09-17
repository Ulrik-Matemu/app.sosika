/**
 * Verifies a Google Play Billing purchase token via the Play Developer API
 * v3 REST endpoints directly (no `googleapis`, which is Node-only). Ported
 * from functions/src/index.ts's verifyVendorSubscription. Any signed-in
 * user may call this — it's scoped to their own uid, not admin-gated.
 */
import { Hono } from "hono";
import type { Env, Variables } from "../lib/env";
import { firestoreServiceAccount, playServiceAccount } from "../lib/env";
import { FirestoreClient, getAccessToken } from "../lib/firestoreRest";
import { requireAuth } from "../lib/adminGuard";
import { invalidArgument, internal } from "../lib/errors";

const PLAY_SCOPE = "https://www.googleapis.com/auth/androidpublisher";

export const verifyVendorSubscriptionRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

verifyVendorSubscriptionRoutes.post("/verifyVendorSubscription", requireAuth, async (c) => {
  const body = await c.req.json<{ purchaseToken?: string; sku?: string; packageName?: string }>();
  const { purchaseToken, sku, packageName: customPackageName } = body;

  if (!purchaseToken || !sku) throw invalidArgument("Both 'purchaseToken' and 'sku' are required fields.");

  const user = c.get("user")!;
  const vendorId = user.uid;
  const packageName = customPackageName || c.env.ANDROID_PACKAGE_NAME || "app.sosika";

  try {
    const sa = playServiceAccount(c.env);
    const token = await getAccessToken(sa, PLAY_SCOPE);

    let isVerifiedActive = false;
    let expiryTimestampMs: number | null = null;
    let subscriptionStateString = "UNKNOWN";

    const v2Resp = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${purchaseToken}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (v2Resp.ok) {
      const subV2 = (await v2Resp.json()) as {
        subscriptionState?: string;
        lineItems?: { expiryTime?: string }[];
      };
      subscriptionStateString = subV2.subscriptionState || "UNKNOWN";
      if (subscriptionStateString === "SUBSCRIPTION_STATE_ACTIVE" || subscriptionStateString === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") {
        isVerifiedActive = true;
      }
      const expiryTimeStr = subV2.lineItems?.[0]?.expiryTime;
      if (expiryTimeStr) {
        expiryTimestampMs = new Date(expiryTimeStr).getTime();
        if (expiryTimestampMs < Date.now()) isVerifiedActive = false;
      }
    } else {
      console.warn(`[verifyVendorSubscription] subscriptionsv2 failed (${v2Resp.status}), trying legacy subscriptions.get`);
      const v1Resp = await fetch(
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${sku}/tokens/${purchaseToken}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!v1Resp.ok) throw new Error(`Legacy subscriptions.get also failed: ${v1Resp.status} ${await v1Resp.text()}`);
      const subV1 = (await v1Resp.json()) as { expiryTimeMillis?: string; paymentState?: number };
      const expiryMs = parseInt(subV1.expiryTimeMillis || "0", 10);
      const paymentState = subV1.paymentState;
      if (expiryMs > Date.now() && (paymentState === 1 || paymentState === 2 || paymentState === 3)) {
        isVerifiedActive = true;
        expiryTimestampMs = expiryMs;
      }
    }

    const db = new FirestoreClient(c.env.FIREBASE_PROJECT_ID, firestoreServiceAccount(c.env));

    if (!isVerifiedActive) {
      await db.patchDoc(`vendors/${vendorId}`, {
        "subscription.tier": "free",
        "subscription.status": "inactive",
        "subscription.last_verified": new Date(),
      });
      return c.json({ success: false, message: `Subscription status '${subscriptionStateString}' is inactive or expired.` });
    }

    await db.patchDoc(`vendors/${vendorId}`, {
      "subscription.tier": "premium",
      "subscription.status": "active",
      "subscription.sku": sku,
      "subscription.purchase_token": purchaseToken,
      "subscription.expires_at": expiryTimestampMs ? new Date(expiryTimestampMs).toISOString() : null,
      "subscription.last_verified": new Date(),
      "subscription.features_enabled.analytics": true,
      "subscription.features_enabled.recommendations": true,
      "subscription.features_enabled.sms_notifications": true,
    });

    return c.json({ success: true, message: "Vendor premium subscription successfully verified and activated." });
  } catch (err) {
    console.error("[verifyVendorSubscription] Verification error:", err);
    throw internal(`Failed to verify purchase with Google Play Developer API: ${err instanceof Error ? err.message : String(err)}`);
  }
});
