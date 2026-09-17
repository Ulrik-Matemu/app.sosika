/**
 * Server-side SMS relay via Meseji, replacing the direct client -> Meseji
 * API call that used to live in src/services/meseji.ts. That call shipped
 * VITE_MESEJI_API_KEY inside the compiled JS bundle (readable by anyone —
 * see dist/assets/*.js), letting anyone send SMS from the SOSIKA sender ID
 * on Sosika's account. The key now lives only in this function's secret.
 *
 * Checkout is anonymous by design (no required sign-in), so this callable
 * can't be gated on `request.auth` the way sendNotification/
 * adminCreditWallet are — doing so would break every order confirmation
 * SMS. Instead, every send must reference a real order, and the recipient
 * must be a party to that order (its customer, one of its vendors, or the
 * fixed ops number): an arbitrary phone/message pair with no matching
 * order is rejected. This isn't full abuse-proofing (a customer who has
 * just placed a real order could still send a handful of messages to that
 * order's own phone numbers), but it closes the "send anything to anyone"
 * relay that a bare API-key move-behind-a-function would otherwise still
 * leave open. Firebase App Check would close the remaining gap and is
 * worth adding later.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { normalizePhone } from "./phone";

const mesejiApiKey = defineSecret("MESEJI_API_KEY");

const MESEJI_API_URL = "https://meseji.co.tz/api/v1/sms/send";
const MESEJI_SENDER_ID = "SOSIKA";
const MAX_MESSAGE_LENGTH = 640; // ~4 SMS segments — generous for an order notification
const ADMIN_OPS_PHONE = normalizePhone("255778903468");

interface SendSmsData {
  toPhone: string;
  message: string;
  orderId: string;
}

interface SendSmsResult {
  success: boolean;
  message?: string;
}

async function isVendorPhoneOnOrder(vendorIds: string[], targetNormalized: string): Promise<boolean> {
  if (vendorIds.length === 0) return false;
  const db = admin.firestore();
  const snaps = await Promise.all(vendorIds.map((vid) => db.collection("vendors").doc(vid).get()));
  return snaps.some((snap) => {
    const v = snap.data();
    const vendorPhone = v?.phone || v?.listing_data?.phone || v?.auth_info?.phone_number;
    return vendorPhone && normalizePhone(vendorPhone) === targetNormalized;
  });
}

export const sendSms = onCall({ cors: true, secrets: [mesejiApiKey] }, async (request): Promise<SendSmsResult> => {
  const { toPhone, message, orderId } = (request.data || {}) as SendSmsData;

  if (!toPhone || !message || !orderId) {
    throw new HttpsError("invalid-argument", "toPhone, message and orderId are all required.");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new HttpsError("invalid-argument", `Message exceeds the ${MAX_MESSAGE_LENGTH} character limit.`);
  }

  const targetNormalized = normalizePhone(toPhone);

  if (targetNormalized !== ADMIN_OPS_PHONE) {
    const orderSnap = await admin.firestore().collection("orders").doc(orderId).get();
    if (!orderSnap.exists) {
      throw new HttpsError("not-found", "No order found matching orderId.");
    }

    const order = orderSnap.data() || {};
    const orderPhoneNormalized = normalizePhone(order.phone || "");
    const vendorIds: string[] = order.vendor_ids || [];

    const isOrderCustomer = targetNormalized === orderPhoneNormalized;
    const isOrderVendor = !isOrderCustomer && (await isVendorPhoneOnOrder(vendorIds, targetNormalized));

    if (!isOrderCustomer && !isOrderVendor) {
      throw new HttpsError(
        "permission-denied",
        "The recipient phone number is not associated with this order."
      );
    }
  }

  try {
    const response = await fetch(MESEJI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": mesejiApiKey.value(),
      },
      body: JSON.stringify({
        sender_id: MESEJI_SENDER_ID,
        message,
        contacts: toPhone,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn(`[sendSms] Meseji rejected send to [${toPhone}]:`, data);
      return { success: false, message: data?.message || "SMS failed to send." };
    }
    return { success: true };
  } catch (err: any) {
    console.warn(`[sendSms] Meseji send failed for [${toPhone}]:`, err);
    return { success: false, message: err?.message || "SMS failed to send." };
  }
});
