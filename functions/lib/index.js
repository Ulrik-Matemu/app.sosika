"use strict";
/**
 * Firebase Cloud Functions for Sosika Vendor Portal
 *
 * Implements Play Billing verification via Google Play Developer API v3
 * supporting Play Billing Library v8+ multi-offer subscription schemas.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerDailyRecipeGeneration = exports.generateDailyRecipes = exports.sendNotification = exports.verifyVendorSubscription = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const googleapis_1 = require("googleapis");
admin.initializeApp();
// Secret holding the Google Play Service Account JSON key (optional if using default GCP ADC)
const playServiceAccount = (0, params_1.defineSecret)("PLAY_SERVICE_ACCOUNT_KEY");
/**
 * verifyVendorSubscription
 *
 * Callable Cloud Function triggered from `usePlayBilling.ts` on client-side.
 * Validates Google Play purchase token via Google Developer API (androidpublisher v3)
 * and grants `tier: "premium"` + feature flags in Firestore upon success.
 */
exports.verifyVendorSubscription = (0, https_1.onCall)({ secrets: [playServiceAccount] }, async (request) => {
    // 1. Authenticate vendor user
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Vendor user must be authenticated to verify subscriptions.");
    }
    const { purchaseToken, sku, packageName: customPackageName } = request.data;
    if (!purchaseToken || !sku) {
        throw new https_1.HttpsError("invalid-argument", "Both 'purchaseToken' and 'sku' are required fields.");
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
            auth = new googleapis_1.google.auth.GoogleAuth({
                credentials,
                scopes: ["https://www.googleapis.com/auth/androidpublisher"],
            });
        }
        else {
            // Fallback to Application Default Credentials (ADC)
            auth = new googleapis_1.google.auth.GoogleAuth({
                scopes: ["https://www.googleapis.com/auth/androidpublisher"],
            });
        }
        const androidPublisher = googleapis_1.google.androidpublisher({ version: "v3", auth });
        let isVerifiedActive = false;
        let expiryTimestampMs = null;
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
            if (subscriptionStateString === "SUBSCRIPTION_STATE_ACTIVE" ||
                subscriptionStateString === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") {
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
        }
        catch (v2Err) {
            console.warn("[verifyVendorSubscription] subscriptionsv2.get failed, trying legacy subscriptions.get endpoint:", v2Err?.message || v2Err);
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
    }
    catch (err) {
        console.error("[verifyVendorSubscription] Verification error:", err);
        throw new https_1.HttpsError("internal", `Failed to verify purchase with Google Play Developer API: ${err?.message || err}`);
    }
});
/**
 * sendNotification
 *
 * Callable Cloud Function triggered from Admin Dashboard to send FCM push notifications.
 */
exports.sendNotification = (0, https_1.onCall)(async (request) => {
    const { title, body, icon, url, targetType, targetValue } = request.data;
    if (!title || !body) {
        throw new https_1.HttpsError("invalid-argument", "Both 'title' and 'body' are required fields.");
    }
    const notificationPayload = {
        title,
        body,
        ...(icon ? { imageUrl: icon } : {}),
    };
    const dataPayload = {};
    if (url)
        dataPayload.url = url;
    if (icon)
        dataPayload.icon = icon;
    let successCount = 0;
    let failureCount = 0;
    try {
        // 1. Record in Firestore notification history
        await admin.firestore().collection("notifications").add({
            title,
            body,
            icon: icon || null,
            url: url || null,
            targetType,
            targetValue: targetValue || null,
            sentBy: request.auth?.uid || "admin",
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // 2. Dispatch based on audience targeting
        if (targetType === "all") {
            const tokensSnapshot = await admin.firestore().collection("fcm_tokens").get();
            const tokens = tokensSnapshot.docs
                .map((doc) => doc.data()?.token)
                .filter((t) => Boolean(t));
            if (tokens.length > 0) {
                const batchSize = 500;
                for (let i = 0; i < tokens.length; i += batchSize) {
                    const batch = tokens.slice(i, i + batchSize);
                    const response = await admin.messaging().sendEachForMulticast({
                        tokens: batch,
                        notification: notificationPayload,
                        data: dataPayload,
                    });
                    successCount += response.successCount;
                    failureCount += response.failureCount;
                }
            }
        }
        else if (targetType === "user" && targetValue) {
            const tokenDoc = await admin.firestore().collection("fcm_tokens").doc(targetValue).get();
            if (tokenDoc.exists) {
                const token = tokenDoc.data()?.token;
                if (token) {
                    await admin.messaging().send({
                        token,
                        notification: notificationPayload,
                        data: dataPayload,
                    });
                    successCount = 1;
                }
            }
        }
        else if (targetType === "topic" && targetValue) {
            await admin.messaging().send({
                topic: targetValue,
                notification: notificationPayload,
                data: dataPayload,
            });
            successCount = 1;
        }
        return {
            success: true,
            successCount,
            failureCount,
            message: `Notification processed. ${successCount} delivered, ${failureCount} failed.`,
        };
    }
    catch (error) {
        console.error("[sendNotification] Error sending FCM message:", error);
        throw new https_1.HttpsError("internal", `FCM delivery error: ${error?.message || error}`);
    }
});
// Export Daily AI Recipe Generator Cloud Functions
var generateDailyRecipes_1 = require("./generateDailyRecipes");
Object.defineProperty(exports, "generateDailyRecipes", { enumerable: true, get: function () { return generateDailyRecipes_1.generateDailyRecipes; } });
Object.defineProperty(exports, "triggerDailyRecipeGeneration", { enumerable: true, get: function () { return generateDailyRecipes_1.triggerDailyRecipeGeneration; } });
//# sourceMappingURL=index.js.map