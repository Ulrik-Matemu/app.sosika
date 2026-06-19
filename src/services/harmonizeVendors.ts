import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase";

export const normalizeVendorSubscriptions = async () => {
  const vendorsSnapshot = await getDocs(collection(db, "vendors"));

  if (vendorsSnapshot.empty) {
    console.log('No vendors found to migrate.');
    return;
  }

  const batch = writeBatch(db);
  let updateCount = 0;

  vendorsSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const sub = data.subscription || {};

    // Build the fully normalized object safely without erasing existing structural elements
    const updatedSubscription = {
      tier: sub.tier || "free",
      status: sub.status || "active",
      expires_at: sub.expires_at || null,
      features_enabled: {
        analytics: sub.features_enabled?.analytics ?? false,
        recommendations: sub.features_enabled?.recommendations ?? false,
        extended_customer_info: sub.features_enabled?.extended_customer_info ?? false
      }
    };

    const docRef = doc(db, "vendors", docSnap.id);
    batch.update(docRef, { subscription: updatedSubscription });
    updateCount++;
  });

  await batch.commit();
  console.log(`Successfully normalized ${updateCount} vendor records.`);
};

export default normalizeVendorSubscriptions;
