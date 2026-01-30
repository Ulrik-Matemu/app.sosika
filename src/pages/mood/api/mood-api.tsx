import { db } from "../../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Vendor, MenuItem } from "../types/types";

export interface UserRequest {
  mood: string;
  location: { lat: number; lng: number };
}

export interface MoodResults {
  vendors: Vendor[];
  menuItems: MenuItem[];
}

const calculateDistance = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371; // km
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLng = (b.lng - a.lng) * (Math.PI / 180);
  const aVal =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(a.lat * (Math.PI / 180)) *
      Math.cos(b.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
};

// Map user mood to menu item categories
const mapMoodToCategories = (mood: string): string[] => {
  const moodLower = mood.toLowerCase();
  
  // Map moods to their corresponding categories
  const moodMap: Record<string, string[]> = {
    breakfast: ["breakfast"],
    lunch: ["lunch"],
    dinner: ["dinner", "lunch"], // Dinner items could also be lunch items
    drink: ["drinks"],
    drinks: ["drinks"],
    snack: ["snacks"],
    snacks: ["snacks"],
    nearby: ["breakfast", "lunch", "dinner", "drinks", "snacks"], // Show all
    any: ["breakfast", "lunch", "dinner", "drinks", "snacks"], // Show all
  };
  
  return moodMap[moodLower] || [moodLower];
};

export const fetchMoodResults = async (req: UserRequest): Promise<MoodResults> => {
  console.log("Firestore request received:", req);

  // 1. Fetch all vendors from Firestore
  const vendorsCollection = collection(db, "vendors");
  const vendorSnapshot = await getDocs(vendorsCollection);
  const allVendors: Vendor[] = vendorSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));

  // 2. Filter vendors by location proximity
  const nearbyVendors = allVendors.filter(v => calculateDistance(v.geolocation, req.location) < 10000000);
  console.log(`Found ${nearbyVendors.length} nearby vendors:`, nearbyVendors.map(v => v.name));

  if (nearbyVendors.length === 0) {
    return { vendors: [], menuItems: [] };
  }

  // 3. Get valid categories for this mood
  const validCategories = mapMoodToCategories(req.mood);
  console.log(`Mood "${req.mood}" mapped to categories:`, validCategories);

  // 4. Fetch menu items for nearby vendors
  const nearbyVendorIds = nearbyVendors.map(v => v.id);

  if (nearbyVendorIds.length === 0) {
      return { vendors: nearbyVendors, menuItems: [] };
  }

  const menuItemsCollection = collection(db, "menuItems");
  let itemsFromVendors: MenuItem[] = [];

  // Chunking for 'in' query since it's limited to 10 values per query
  const CHUNK_SIZE = 10;
  for (let i = 0; i < nearbyVendorIds.length; i += CHUNK_SIZE) {
      const chunk = nearbyVendorIds.slice(i, i + CHUNK_SIZE);
      if (chunk.length > 0) {
          const q = query(menuItemsCollection, where("vendor_id", "in", chunk));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach(doc => {
              itemsFromVendors.push({ id: doc.id, ...doc.data() } as MenuItem);
          });
      }
  }

  // Now filter by category client-side
  const filteredItems = itemsFromVendors.filter(item => validCategories.includes(item.category));

  console.log(`Found ${filteredItems.length} menu items:`, filteredItems.map(i => i.name));

  return { vendors: nearbyVendors, menuItems: filteredItems };
};
