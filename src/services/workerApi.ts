/**
 * Client for the Cloudflare Worker that replaced Firebase Cloud Functions
 * (see workers/). httpsCallable used to attach the caller's Firebase ID
 * token automatically; a plain fetch doesn't, so `auth: true` callers pull
 * it from the signed-in `auth` instance (src/firebase.ts) themselves.
 */
import { auth } from "../firebase";

const WORKER_BASE_URL = import.meta.env.VITE_WORKER_API_URL as string;

interface WorkerErrorBody {
  error?: string;
  message?: string;
}

async function callWorker<T>(path: string, body: unknown, opts?: { auth?: boolean }): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (opts?.auth) {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in.");
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  const resp = await fetch(`${WORKER_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const json = (await resp.json().catch(() => ({}))) as WorkerErrorBody & T;
  if (!resp.ok) {
    throw new Error(json?.message || json?.error || `Request to ${path} failed (${resp.status})`);
  }
  return json as T;
}

export function verifyVendorSubscription(data: { purchaseToken: string; sku: string }) {
  return callWorker<{ success: boolean; message?: string }>("/verifyVendorSubscription", data, { auth: true });
}

export function sendNotification(data: {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  targetType: "all" | "user" | "topic";
  targetValue?: string;
}) {
  return callWorker<{ success: boolean; successCount: number; failureCount: number; message: string }>(
    "/sendNotification",
    data,
    { auth: true }
  );
}

export function adminCreditWallet(data: { phone: string; amount: number; description?: string; type?: string }) {
  return callWorker<{ success: boolean; phone: string; balance: number }>("/adminCreditWallet", data, { auth: true });
}

export function triggerDailyRecipeGeneration(resetQuota = false) {
  return callWorker<{ success: boolean; message: string; details?: unknown }>(
    "/triggerDailyRecipeGeneration",
    { resetQuota },
    { auth: true }
  );
}

export function sendSmsViaWorker(data: { toPhone: string; message: string; orderId: string }) {
  return callWorker<{ success: boolean; message?: string }>("/sendSms", data);
}

export function semanticSearchMenuItems(data: { query: string; candidateItemIds: string[] }) {
  return callWorker<{ degraded: boolean; reason?: string; ranked: { id: string; score: number }[] }>(
    "/semanticSearchMenuItems",
    data
  );
}

export function notifyPhotoApproved(submissionId: string) {
  return callWorker<{ success: boolean; credited: boolean; reason?: string; balance?: number }>(
    "/notifyPhotoApproved",
    { submissionId },
    { auth: true }
  );
}

export function rollupReview(reviewId: string) {
  return callWorker<{ success: boolean; rolledUp: boolean; reason?: string }>("/rollupReview", { reviewId });
}

export function triggerReembed(itemId: string) {
  return callWorker<{ success: boolean; embedded: boolean; reason?: string }>(
    "/reembedMenuItem",
    { itemId },
    { auth: true }
  );
}
