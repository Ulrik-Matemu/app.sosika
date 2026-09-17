/**
 * Replaces the onReviewCreated Firestore trigger. The review doc itself is
 * still written client-side (Firestore rules validate its shape); this RPC
 * re-reads the review fresh and re-derives targetId/targetType/rating from
 * it — never from the request body — before rolling the rating up onto the
 * target vendor/menuItem.
 *
 * Hardening beyond the original trigger: the original had no idempotency
 * protection (it assumed exactly-once Firestore trigger delivery). Since an
 * explicit client-triggered RPC is more likely to be double-fired (retry on
 * timeout, double-click) than a background trigger was to be redelivered,
 * this version records a `reviewRollups/{reviewId}` marker inside the same
 * transaction and short-circuits a repeat call for the same review.
 */
import { Hono } from "hono";
import type { Env, Variables } from "../lib/env";
import { firestoreServiceAccount } from "../lib/env";
import { FirestoreClient } from "../lib/firestoreRest";
import { invalidArgument } from "../lib/errors";

export const reviewRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

reviewRoutes.post("/rollupReview", async (c) => {
  const body = await c.req.json<{ reviewId?: string }>();
  if (!body.reviewId) throw invalidArgument("reviewId is required.");

  const db = new FirestoreClient(c.env.FIREBASE_PROJECT_ID, firestoreServiceAccount(c.env));

  const review = await db.getDoc<{ targetId?: string; targetType?: string; rating?: number }>(`reviews/${body.reviewId}`);
  if (!review) return c.json({ success: true, rolledUp: false, reason: "Review not found." });

  const { targetId, targetType, rating } = review;
  if (!targetId || (targetType !== "vendor" && targetType !== "menuItem") || typeof rating !== "number") {
    return c.json({ success: true, rolledUp: false, reason: "Review missing valid targetId/targetType/rating." });
  }

  const targetCollection = targetType === "vendor" ? "vendors" : "menuItems";
  const targetPath = `${targetCollection}/${targetId}`;
  const markerPath = `reviewRollups/${body.reviewId}`;

  const rolledUp = await db.runTransaction(async (tx) => {
    const marker = await tx.get(markerPath);
    if (marker) return false; // already rolled up — double-call, no-op

    const target = await tx.get(targetPath);
    if (!target) {
      console.warn(`[rollupReview] Review ${body.reviewId} targets missing ${targetPath}; skipping rollup.`);
      return false;
    }

    const currentRatingCount = (target.ratingCount as number) || 0;
    const currentAverageRating = (target.averageRating as number) || 0;
    const newRatingCount = currentRatingCount + 1;
    const newAverageRating = (currentAverageRating * currentRatingCount + rating) / newRatingCount;

    tx.set(targetPath, { ratingCount: newRatingCount, averageRating: newAverageRating });
    tx.set(markerPath, { reviewId: body.reviewId, targetPath, rolledUpAt: new Date() });
    return true;
  });

  return c.json({ success: true, rolledUp });
});
