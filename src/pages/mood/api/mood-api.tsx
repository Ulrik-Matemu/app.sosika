import { db } from "../../../firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
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
    breakfast: ["breakfast", "sandwiches"],
    lunch: ["lunch", "dinner", "salads", "pizza", "burgers", "mains", "sides", "sandwiches"], // Lunch items could also be dinner items
    dinner: ["dinner", "lunch", "salads", "pizza", "burgers", "mains", "sides"], // Dinner items could also be lunch items
    drink: ["drinks"],
    drinks: ["drinks"],
    snack: ["snacks"],
    snacks: ["snacks"],
    burger: ["burgers"],
    burgers: ["burgers"],
    salad: ["salads"],
    salads: ["salads"],
    sandwiches: ["sandwiches"],
    mains: ["mains"],
    sides: ["sides"],
    nearby: ["breakfast", "lunch", "dinner", "drinks", "snacks", "starters", "burgers", "salads", "pizza", "mains", "sides", "sandwiches"], // Show all
    any: ["breakfast", "lunch", "dinner", "drinks", "snacks", "starters", "burgers", "salads", "pizza", "mains", "sides", "sandwiches"], // Show all
  };
  
  return moodMap[moodLower] || [moodLower];
};

export const fetchMoodResults = async (req: UserRequest): Promise<MoodResults> => {

  // 1. Fetch all vendors from Firestore
  const vendorsCollection = collection(db, "vendors");
  const vendorSnapshot = await getDocs(vendorsCollection);
  const allVendors: Vendor[] = vendorSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));

  // 2. Filter vendors by location proximity
  const nearbyVendors = allVendors.filter(v => calculateDistance(v.geolocation, req.location) < 50); // 50 km radius
  

  if (nearbyVendors.length === 0) {
    return { vendors: [], menuItems: [] };
  }

  // 3. Get valid categories for this mood
  const validCategories = mapMoodToCategories(req.mood);

  //3.5 Check names of menu items for keywords matching the mood (e.g., "burger" in name for burger mood)
  // This is a simple keyword check and can be enhanced with more sophisticated NLP techniques if needed.
  const keyword = req.mood.toLowerCase();
  if (!validCategories.includes(keyword)) {
    validCategories.push(keyword);
  }

 

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

   //3.6 Check name of menu items individually from menu items fetched from nearby vendors for keyword matching
  const keywordItems = itemsFromVendors.filter(item => item.name.toLowerCase().includes(keyword));

  // If we found items matching the keyword, add them to validCategories
  if (keywordItems.length > 0) {
    validCategories.push(keyword);
  }

  return { vendors: nearbyVendors, menuItems: filteredItems };
};

export const fetchVendorMenu = async (vendorId: string): Promise<{ vendor: Vendor; menuItems: MenuItem[] }> => {
  // 1. Fetch the vendor details
  const vendorRef = doc(db, "vendors", vendorId);
  const vendorSnap = await getDoc(vendorRef);

  if (!vendorSnap.exists()) {
    throw new Error("Vendor not found");
  }

  const vendor = { id: vendorSnap.id, ...vendorSnap.data() } as Vendor;

  // 2. Fetch all menu items for that vendor
  const menuItemsCollection = collection(db, "menuItems");
  const q = query(menuItemsCollection, where("vendor_id", "==", vendorId));
  const querySnapshot = await getDocs(q);
  
  const menuItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));

  return { vendor, menuItems };
};
