import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { Review } from "../pages/mood/types/types";

/**
 * Fetches all reviews for a specific target (vendor or menu item).
 * @param targetId The ID of the vendor or menu item.
 * @param targetType The type of the target ('vendor' or 'menuItem').
 * @returns A promise that resolves to an array of reviews.
 */
export const getReviews = async (
  targetId: string,
  targetType: "vendor" | "menuItem"
): Promise<Review[]> => {
  const reviewsCollection = collection(db, "reviews");
  const q = query(
    reviewsCollection,
    where("targetId", "==", targetId),
    where("targetType", "==", targetType)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Review));
};

/**
 * Adds a review for a vendor or menu item and updates the target's average rating.
 * @param review The review object to be added.
 * @returns A promise that resolves when the transaction is complete.
 */
export const addReview = async (review: Omit<Review, "id" | "createdAt">) => {
  const targetCollection =
    review.targetType === "vendor" ? "vendors" : "menuItems";
  const targetRef = doc(db, targetCollection, review.targetId);
  const reviewsCollection = collection(db, "reviews");

  await runTransaction(db, async (transaction) => {
    const targetDoc = await transaction.get(targetRef);
    if (!targetDoc.exists()) {
      throw new Error("Target document does not exist!");
    }

    // 1. Add the new review
    const newReviewRef = doc(reviewsCollection); // Create a new doc ref with an auto-generated ID
    transaction.set(newReviewRef, {
      ...review,
      createdAt: serverTimestamp(),
    });

    // 2. Update the aggregate rating on the target document
    const data = targetDoc.data();
    const currentRatingCount = data.ratingCount || 0;
    const currentAverageRating = data.averageRating || 0;

    const newRatingCount = currentRatingCount + 1;
    const newAverageRating =
      (currentAverageRating * currentRatingCount + review.rating) / newRatingCount;

    transaction.update(targetRef, {
      ratingCount: newRatingCount,
      averageRating: newAverageRating,
    });
  });
};
