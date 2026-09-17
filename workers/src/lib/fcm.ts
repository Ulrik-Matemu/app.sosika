/**
 * Shared FCM v1 HTTP API sender, used by the admin broadcast console
 * (routes/sendNotification.ts) and by every server-side event that pushes to
 * a specific customer by phone (order status, wallet credits, free
 * delivery). Auth is the same service-account OAuth flow used for
 * Firestore, just a different scope.
 */
import type { Env } from "./env";
import { firestoreServiceAccount } from "./env";
import { FirestoreClient, getAccessToken } from "./firestoreRest";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const CONCURRENCY = 20;

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

async function sendOne(projectId: string, accessToken: string, message: Record<string, unknown>): Promise<boolean> {
  const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!resp.ok) {
    console.warn(`[fcm] send failed (${resp.status}): ${await resp.text()}`);
    return false;
  }
  return true;
}

export async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<boolean>
): Promise<{ success: number; failure: number }> {
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

function toMessagePayload(notification: PushNotification): { notification: Record<string, string>; data: Record<string, string> } {
  const msgNotification: Record<string, string> = { title: notification.title, body: notification.body };
  if (notification.icon) msgNotification.image = notification.icon;
  const data: Record<string, string> = {};
  if (notification.url) data.url = notification.url;
  if (notification.icon) data.icon = notification.icon;
  return { notification: msgNotification, data };
}

export async function sendToTokens(env: Env, tokens: string[], notification: PushNotification): Promise<{ success: number; failure: number }> {
  if (tokens.length === 0) return { success: 0, failure: 0 };
  const accessToken = await getAccessToken(firestoreServiceAccount(env), FCM_SCOPE);
  const { notification: msgNotification, data } = toMessagePayload(notification);
  return mapWithConcurrency(tokens, CONCURRENCY, (token) =>
    sendOne(env.FIREBASE_PROJECT_ID, accessToken, { token, notification: msgNotification, data })
  );
}

export async function sendToTopic(env: Env, topic: string, notification: PushNotification): Promise<boolean> {
  const accessToken = await getAccessToken(firestoreServiceAccount(env), FCM_SCOPE);
  const { notification: msgNotification, data } = toMessagePayload(notification);
  return sendOne(env.FIREBASE_PROJECT_ID, accessToken, { topic, notification: msgNotification, data });
}

/**
 * Finds every device registered for a phone number (fcm_tokens.phone — see
 * src/services/push-notifications.tsx) and pushes to all of them. A phone
 * with no tagged devices yet (not re-registered since this field was added,
 * or push never enabled) just means zero tokens found — never an error, so
 * callers can fire this best-effort without special-casing "no devices".
 */
export async function sendPushToPhone(env: Env, db: FirestoreClient, phone: string, notification: PushNotification): Promise<{ success: number; failure: number }> {
  if (!phone) return { success: 0, failure: 0 };
  const tokenDocs = await db.queryEquals<{ token?: string }>("fcm_tokens", [{ field: "phone", value: phone }]);
  const tokens = tokenDocs.map((d) => d.data.token).filter((t): t is string => Boolean(t));
  return sendToTokens(env, tokens, notification);
}
