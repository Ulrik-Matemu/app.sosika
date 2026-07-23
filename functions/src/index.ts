/**
 * Firebase Cloud Functions for Sosika Vendor Portal
 *
 * Implements Play Billing verification via Google Play Developer API v3
 * supporting Play Billing Library v8+ multi-offer subscription schemas.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { google } from "googleapis";

admin.initializeApp();

// Secret holding the Google Play Service Account JSON key (optional if using default GCP ADC)
const playServiceAccount = defineSecret("PLAY_SERVICE_ACCOUNT_KEY");

interface VerifySubscriptionData {
  purchaseToken: string;
  sku: string;
  packageName?: string;
}

/**
 * verifyVendorSubscription
 *
 * Callable Cloud Function triggered from `usePlayBilling.ts` on client-side.
 * Validates Google Play purchase token via Google Developer API (androidpublisher v3)
 * and grants `tier: "premium"` + feature flags in Firestore upon success.
 */
export const verifyVendorSubscription = onCall(
  { secrets: [playServiceAccount] },
  async (request) => {
    // 1. Authenticate vendor user
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Vendor user must be authenticated to verify subscriptions."
      );
    }

    const { purchaseToken, sku, packageName: customPackageName } =
      request.data as VerifySubscriptionData;

    if (!purchaseToken || !sku) {
      throw new HttpsError(
        "invalid-argument",
        "Both 'purchaseToken' and 'sku' are required fields."
      );
    }

    const vendorId = request.auth.uid;
    const packageName = customPackageName || process.env.ANDROID_PACKAGE_NAME || "app.sosika.twa";

    try {
      // 2. Initialize Google Play Publisher API client
      let auth;
      const secretValue = playServiceAccount.value();

      if (secretValue) {
        // Use JSON key from Firebase Secret Manager
        const credentials = JSON.parse(secretValue);
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/androidpublisher"],
        });
      } else {
        // Fallback to Application Default Credentials (ADC)
        auth = new google.auth.GoogleAuth({
          scopes: ["https://www.googleapis.com/auth/androidpublisher"],
        });
      }

      const androidPublisher = google.androidpublisher({ version: "v3", auth });

      let isVerifiedActive = false;
      let expiryTimestampMs: number | null = null;
      let subscriptionStateString = "UNKNOWN";

      // 3. Try Play Billing Library v8+ API (subscriptionsv2.get)
      try {
        const v2Response = await androidPublisher.purchases.subscriptionsv2.get({
          packageName,
          token: purchaseToken,
        });

        const subV2 = v2Response.data;
        subscriptionStateString = subV2.subscriptionState || "UNKNOWN";

        // Active States in subscriptionsv2:
        // SUBSCRIPTION_STATE_ACTIVE, SUBSCRIPTION_STATE_IN_GRACE_PERIOD
        if (
          subscriptionStateString === "SUBSCRIPTION_STATE_ACTIVE" ||
          subscriptionStateString === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
        ) {
          isVerifiedActive = true;
        }

        // Calculate line item expiry if available
        if (subV2.lineItems && subV2.lineItems.length > 0) {
          const expiryTimeStr = subV2.lineItems[0].expiryTime;
          if (expiryTimeStr) {
            expiryTimestampMs = new Date(expiryTimeStr).getTime();
            if (expiryTimestampMs < Date.now()) {
              isVerifiedActive = false;
            }
          }
        }
      } catch (v2Err: any) {
        console.warn(
          "[verifyVendorSubscription] subscriptionsv2.get failed, trying legacy subscriptions.get endpoint:",
          v2Err?.message || v2Err
        );

        // Fallback to v1 subscriptions.get API if v2 is not configured for legacy SKUs
        const v1Response = await androidPublisher.purchases.subscriptions.get({
          packageName,
          subscriptionId: sku,
          token: purchaseToken,
        });

        const subV1 = v1Response.data;
        const expiryMs = parseInt(subV1.expiryTimeMillis || "0", 10);
        const paymentState = subV1.paymentState; // 1 = Payment Received, 2 = Free Trial

        if (expiryMs > Date.now() && (paymentState === 1 || paymentState === 2 || paymentState === 3)) {
          isVerifiedActive = true;
          expiryTimestampMs = expiryMs;
        }
      }

      if (!isVerifiedActive) {
        // Mark subscription as inactive if verification failed
        await admin.firestore().collection("vendors").doc(vendorId).update({
          "subscription.tier": "free",
          "subscription.status": "inactive",
          "subscription.last_verified": admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          success: false,
          message: `Subscription status '${subscriptionStateString}' is inactive or expired.`,
        };
      }

      // 4. Update Firestore vendor profile on successful verification
      const vendorRef = admin.firestore().collection("vendors").doc(vendorId);
      await vendorRef.update({
        "subscription.tier": "premium",
        "subscription.status": "active",
        "subscription.sku": sku,
        "subscription.purchase_token": purchaseToken,
        "subscription.expires_at": expiryTimestampMs ? new Date(expiryTimestampMs).toISOString() : null,
        "subscription.last_verified": admin.firestore.FieldValue.serverTimestamp(),
        "subscription.features_enabled.analytics": true,
        "subscription.features_enabled.recommendations": true,
        "subscription.features_enabled.sms_notifications": true,
      });

      return {
        success: true,
        message: "Vendor premium subscription successfully verified and activated.",
      };
    } catch (err: any) {
      console.error("[verifyVendorSubscription] Verification error:", err);
      throw new HttpsError(
        "internal",
        `Failed to verify purchase with Google Play Developer API: ${err?.message || err}`
      );
    }
  }
);
