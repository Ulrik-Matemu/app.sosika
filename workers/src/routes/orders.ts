/**
 * Order status push notifications. The order status write itself still
 * happens client-side (vendor dashboard / admin console — Firestore rules
 * already gate who can write it); this endpoint only re-reads the order
 * fresh and pushes to the customer, so a stale or forged request body can't
 * spoof a status update or leak an order to the wrong recipient.
 */
import { Hono } from "hono";
import type { Env, Variables } from "../lib/env";
import { firestoreServiceAccount } from "../lib/env";
import { FirestoreClient } from "../lib/firestoreRest";
import { sendPushToPhone } from "../lib/fcm";
import { requireAuth } from "../lib/adminGuard";
import { invalidArgument, permissionDenied } from "../lib/errors";

const STATUS_MESSAGES: Record<string, (vendorName: string) => { title: string; body: string }> = {
  preparing: (vendorName) => ({
    title: "Order accepted!",
    body: `${vendorName} is preparing your order now.`,
  }),
  ready_for_pickup: (vendorName) => ({
    title: "Order ready!",
    body: `Your order from ${vendorName} is ready and on its way.`,
  }),
  delivered: (vendorName) => ({
    title: "Order delivered!",
    body: `Enjoy your meal from ${vendorName}. Bon appétit!`,
  }),
  declined: (vendorName) => ({
    title: "Order declined",
    body: `Sorry, ${vendorName} was unable to accept your order. Any payment will be refunded.`,
  }),
};

export const orderRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

orderRoutes.post("/notifyOrderStatus", requireAuth, async (c) => {
  const body = await c.req.json<{ orderId?: string }>();
  if (!body.orderId) throw invalidArgument("orderId is required.");

  const db = new FirestoreClient(c.env.FIREBASE_PROJECT_ID, firestoreServiceAccount(c.env));
  const order = await db.getDoc<{ status?: string; phone?: string; vendor_name?: string; vendor_ids?: string[] }>(`orders/${body.orderId}`);
  if (!order) return c.json({ success: true, notified: false, reason: "Order not found." });

  const user = c.get("user")!;
  const isOwningVendor = Array.isArray(order.vendor_ids) && order.vendor_ids.includes(user.uid);
  if (!user.admin && !isOwningVendor) {
    throw permissionDenied("You are not authorized to notify about this order.");
  }

  const status = order.status || "";
  const compose = STATUS_MESSAGES[status];
  if (!compose) {
    return c.json({ success: true, notified: false, reason: `No notification configured for status "${status}".` });
  }

  const phone = order.phone;
  if (!phone) {
    return c.json({ success: true, notified: false, reason: "Order has no phone on file." });
  }

  const notification = compose(order.vendor_name || "the vendor");
  const result = await sendPushToPhone(c.env, db, phone, { ...notification, url: "/orders" });

  return c.json({ success: true, notified: result.success > 0, devicesReached: result.success, devicesFailed: result.failure });
});
