/**
 * Recomputes a vendor's or menu item's aggregate rating whenever a review is
 * created. Replaces the direct `transaction.update(vendors|menuItems, ...)`
 * that used to run from the anonymous customer's own browser
 * (src/services/reviews-api.ts:66) — that write is what forced `vendors`
 * and `menuItems` to stay writable by anyone. The review submission itself
 * still happens client-side (Firestore rules validate its shape); only the
 * aggregate rollup on the target document moves server-side.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

export const onReviewCreated = onDocumentCreated("reviews/{reviewId}", async (event) => {
  const review = event.data?.data();
  if (!review) return;

  const targetId = review.targetId as string | undefined;
  const targetType = review.targetType as "vendor" | "menuItem" | undefined;
  const rating = review.rating;

  if (!targetId || (targetType !== "vendor" && targetType !== "menuItem")) return;
  if (typeof rating !== "number") return;

  const db = admin.firestore();
  const targetCollection = targetType === "vendor" ? "vendors" : "menuItems";
  const targetRef = db.collection(targetCollection).doc(targetId);

  // Transactional read-modify-write: two reviews landing on the same target
  // in the same instant must not clobber each other's rating contribution.
  await db.runTransaction(async (transaction) => {
    const targetSnap = await transaction.get(targetRef);
    if (!targetSnap.exists) {
      console.warn(
        `[onReviewCreated] Review ${event.params.reviewId} targets missing ${targetCollection}/${targetId}; skipping rollup.`
      );
      return;
    }

    const data = targetSnap.data() || {};
    const currentRatingCount = data.ratingCount || 0;
    const currentAverageRating = data.averageRating || 0;

    const newRatingCount = currentRatingCount + 1;
    const newAverageRating = (currentAverageRating * currentRatingCount + rating) / newRatingCount;

    transaction.update(targetRef, {
      ratingCount: newRatingCount,
      averageRating: newAverageRating,
    });
  });
});
