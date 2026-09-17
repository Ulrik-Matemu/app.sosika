/**
 * Server-side SMS relay via Meseji. Ported 1:1 from functions/src/sms.ts.
 * Unauthenticated by design (checkout is anonymous) — authorization instead
 * comes from an order-relationship check: the recipient must be the order's
 * customer or one of its vendors, unless it's the fixed ops number.
 */
import { Hono } from "hono";
import type { Env, Variables } from "../lib/env";
import { firestoreServiceAccount } from "../lib/env";
import { FirestoreClient } from "../lib/firestoreRest";
import { normalizePhone } from "../lib/phone";
import { invalidArgument, notFound, permissionDenied } from "../lib/errors";

const MESEJI_API_URL = "https://meseji.co.tz/api/v1/sms/send";
const MESEJI_SENDER_ID = "SOSIKA";
const MAX_MESSAGE_LENGTH = 640;
const ADMIN_OPS_PHONE = normalizePhone("255778903468");

async function isVendorPhoneOnOrder(db: FirestoreClient, vendorIds: string[], targetNormalized: string): Promise<boolean> {
  if (vendorIds.length === 0) return false;
  const vendors = await db.batchGet(vendorIds.map((vid) => `vendors/${vid}`));
  return vendors.some((v) => {
    if (!v) return false;
    const nested = v.listing_data as Record<string, unknown> | undefined;
    const authInfo = v.auth_info as Record<string, unknown> | undefined;
    const vendorPhone = (v.phone as string) || (nested?.phone as string) || (authInfo?.phone_number as string);
    return Boolean(vendorPhone) && normalizePhone(vendorPhone) === targetNormalized;
  });
}

export const smsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

smsRoutes.post("/sendSms", async (c) => {
  const body = await c.req.json<{ toPhone?: string; message?: string; orderId?: string }>();
  const { toPhone, message, orderId } = body;

  if (!toPhone || !message || !orderId) throw invalidArgument("toPhone, message and orderId are all required.");
  if (message.length > MAX_MESSAGE_LENGTH) throw invalidArgument(`Message exceeds the ${MAX_MESSAGE_LENGTH} character limit.`);

  const targetNormalized = normalizePhone(toPhone);
  const db = new FirestoreClient(c.env.FIREBASE_PROJECT_ID, firestoreServiceAccount(c.env));

  if (targetNormalized !== ADMIN_OPS_PHONE) {
    const order = await db.getDoc<{ phone?: string; vendor_ids?: string[] }>(`orders/${orderId}`);
    if (!order) throw notFound("No order found matching orderId.");

    const orderPhoneNormalized = normalizePhone(order.phone || "");
    const vendorIds = order.vendor_ids || [];

    const isOrderCustomer = targetNormalized === orderPhoneNormalized;
    const isOrderVendor = !isOrderCustomer && (await isVendorPhoneOnOrder(db, vendorIds, targetNormalized));

    if (!isOrderCustomer && !isOrderVendor) {
      throw permissionDenied("The recipient phone number is not associated with this order.");
    }
  }

  try {
    const response = await fetch(MESEJI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": c.env.MESEJI_API_KEY },
      body: JSON.stringify({ sender_id: MESEJI_SENDER_ID, message, contacts: toPhone }),
    });

    const data = await response.json().catch(() => ({}) as Record<string, unknown>);
    if (!response.ok) {
      console.warn(`[sendSms] Meseji rejected send to [${toPhone}]:`, data);
      return c.json({ success: false, message: (data as { message?: string })?.message || "SMS failed to send." });
    }
    return c.json({ success: true });
  } catch (err) {
    console.warn(`[sendSms] Meseji send failed for [${toPhone}]:`, err);
    return c.json({ success: false, message: err instanceof Error ? err.message : "SMS failed to send." });
  }
});
