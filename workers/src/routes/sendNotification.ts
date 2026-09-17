/**
 * Admin-gated FCM push notification dispatch. Ported from
 * functions/src/index.ts's sendNotification, now backed by the shared
 * lib/fcm.ts sender.
 */
import { Hono } from "hono";
import type { Env, Variables } from "../lib/env";
import { firestoreServiceAccount } from "../lib/env";
import { FirestoreClient } from "../lib/firestoreRest";
import { sendToTokens, sendToTopic, sendPushToPhone } from "../lib/fcm";
import { requireAuth, requireAdmin } from "../lib/adminGuard";
import { invalidArgument, internal } from "../lib/errors";

interface SendNotificationBody {
  title?: string;
  body?: string;
  icon?: string;
  url?: string;
  targetType?: "all" | "user" | "topic" | "phone";
  targetValue?: string;
}

export const sendNotificationRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

sendNotificationRoutes.post("/sendNotification", requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json<SendNotificationBody>();
  const { title, body: messageBody, icon, url, targetType, targetValue } = body;

  if (!title || !messageBody) throw invalidArgument("Both 'title' and 'body' are required fields.");

  const notification = { title, body: messageBody, icon, url };
  const db = new FirestoreClient(c.env.FIREBASE_PROJECT_ID, firestoreServiceAccount(c.env));
  const user = c.get("user")!;

  let successCount = 0;
  let failureCount = 0;

  try {
    await db.createDoc("notifications", {
      title,
      body: messageBody,
      icon: icon || null,
      url: url || null,
      targetType,
      targetValue: targetValue || null,
      sentBy: user.uid,
      sentAt: new Date(),
    });

    if (targetType === "all") {
      const tokenDocs = await db.listCollection<{ token?: string }>("fcm_tokens");
      const tokens = tokenDocs.map((d) => d.data.token).filter((t): t is string => Boolean(t));
      const result = await sendToTokens(c.env, tokens, notification);
      successCount = result.success;
      failureCount = result.failure;
    } else if (targetType === "user" && targetValue) {
      // Historical "user" target: targetValue is a raw fcm_tokens document id
      // (the token itself), not a uid/phone — kept for backward compatibility
      // with any existing console usage. Prefer "phone" for new integrations.
      const tokenDoc = await db.getDoc<{ token?: string }>(`fcm_tokens/${targetValue}`);
      if (tokenDoc?.token) {
        const result = await sendToTokens(c.env, [tokenDoc.token], notification);
        successCount = result.success;
        failureCount = result.failure;
      }
    } else if (targetType === "phone" && targetValue) {
      const result = await sendPushToPhone(c.env, db, targetValue, notification);
      successCount = result.success;
      failureCount = result.failure;
    } else if (targetType === "topic" && targetValue) {
      const ok = await sendToTopic(c.env, targetValue, notification);
      successCount = ok ? 1 : 0;
      failureCount = ok ? 0 : 1;
    }

    return c.json({
      success: true,
      successCount,
      failureCount,
      message: `Notification processed. ${successCount} delivered, ${failureCount} failed.`,
    });
  } catch (error) {
    console.error("[sendNotification] Error sending FCM message:", error);
    throw internal(`FCM delivery error: ${error instanceof Error ? error.message : String(error)}`);
  }
});
