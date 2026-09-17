/**
 * Admin-gated FCM push notification dispatch. Ported from
 * functions/src/index.ts's sendNotification. The Admin SDK's
 * `admin.messaging()` is replaced with direct calls to FCM's v1 HTTP API
 * (messages:send), authorized with the same service-account OAuth flow used
 * for Firestore, just a different scope.
 */
import { Hono } from "hono";
import type { Env, Variables } from "../lib/env";
import { firestoreServiceAccount } from "../lib/env";
import { FirestoreClient, getAccessToken } from "../lib/firestoreRest";
import { requireAuth, requireAdmin } from "../lib/adminGuard";
import { invalidArgument, internal } from "../lib/errors";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const CONCURRENCY = 20;

interface SendNotificationBody {
  title?: string;
  body?: string;
  icon?: string;
  url?: string;
  targetType?: "all" | "user" | "topic";
  targetValue?: string;
}

async function sendOne(
  projectId: string,
  token: string,
  message: Record<string, unknown>
): Promise<boolean> {
  const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!resp.ok) {
    console.warn(`[sendNotification] FCM send failed (${resp.status}): ${await resp.text()}`);
    return false;
  }
  return true;
}

async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<boolean>): Promise<{ success: number; failure: number }> {
  let successCount = 0;
  let failureCount = 0;
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      const ok = await fn(items[i]).catch(() => false);
      if (ok) successCount++;
      else failureCount++;
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return { success: successCount, failure: failureCount };
}

export const sendNotificationRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

sendNotificationRoutes.post("/sendNotification", requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json<SendNotificationBody>();
  const { title, body: messageBody, icon, url, targetType, targetValue } = body;

  if (!title || !messageBody) throw invalidArgument("Both 'title' and 'body' are required fields.");

  const notification = { title, body: messageBody, ...(icon ? { image: icon } : {}) };
  const data: Record<string, string> = {};
  if (url) data.url = url;
  if (icon) data.icon = icon;

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

    const fcmToken = await getAccessToken(firestoreServiceAccount(c.env), FCM_SCOPE);

    if (targetType === "all") {
      const tokenDocs = await db.listCollection<{ token?: string }>("fcm_tokens");
      const tokens = tokenDocs.map((d) => d.data.token).filter((t): t is string => Boolean(t));
      const result = await mapWithConcurrency(tokens, CONCURRENCY, (token) =>
        sendOne(c.env.FIREBASE_PROJECT_ID, fcmToken, { token, notification, data })
      );
      successCount = result.success;
      failureCount = result.failure;
    } else if (targetType === "user" && targetValue) {
      const tokenDoc = await db.getDoc<{ token?: string }>(`fcm_tokens/${targetValue}`);
      if (tokenDoc?.token) {
        const ok = await sendOne(c.env.FIREBASE_PROJECT_ID, fcmToken, { token: tokenDoc.token, notification, data });
        successCount = ok ? 1 : 0;
        failureCount = ok ? 0 : 1;
      }
    } else if (targetType === "topic" && targetValue) {
      const ok = await sendOne(c.env.FIREBASE_PROJECT_ID, fcmToken, { topic: targetValue, notification, data });
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
