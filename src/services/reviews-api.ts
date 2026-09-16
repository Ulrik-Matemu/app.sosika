import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
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
 * Adds a review for a vendor or menu item. The target's aggregate rating
 * (ratingCount / averageRating) is recomputed server-side by the
 * onReviewCreated Cloud Function trigger (functions/src/reviews.ts) — this
 * used to run as a client-side transaction that also wrote directly to
 * `vendors`/`menuItems`, which is why those collections had to stay
 * world-writable. The client now only ever creates the review document.
 * @param review The review object to be added.
 */
export const addReview = async (review: Omit<Review, "id" | "createdAt">) => {
  await addDoc(collection(db, "reviews"), {
    ...review,
    createdAt: serverTimestamp(),
  });
};
