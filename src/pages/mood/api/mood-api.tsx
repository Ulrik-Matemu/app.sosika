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
  isFallback?: boolean;
}

export const calculateDistance = (a: any, b: any) => {
  const latA = parseFloat(a?.lat);
  const lngA = parseFloat(a?.lng);
  const latB = parseFloat(b?.lat);
  const lngB = parseFloat(b?.lng);
  
  if (isNaN(latA) || isNaN(lngA) || isNaN(latB) || isNaN(lngB)) {
    return 0;
  }

  const R = 6371; // km
  const dLat = (latB - latA) * (Math.PI / 180);
  const dLng = (lngB - lngA) * (Math.PI / 180);
  const aVal =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(latA * (Math.PI / 180)) *
      Math.cos(latB * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
};

export const fetchVendorGeolocation = async (vendorId: string): Promise<{ lat: number; lng: number } | null> => {
  const vendorRef = doc(db, "vendors", vendorId);
  const vendorSnap = await getDoc(vendorRef);

  if (!vendorSnap.exists()) {
    console.warn(`Vendor with ID ${vendorId} not found.`);
    return null;
  }

  const vendorData = vendorSnap.data() as any; 
  
  // Support both root-level and nested listing_data geolocations.
  // We bypass isApproved and isOpen gates here because the physical location 
  // is static and needed to compute delivery fees for active/past carts 
  // even if the vendor's operational status changes.
  return vendorData.geolocation || vendorData.listing_data?.geolocation || null;
};

// Map user mood to menu item categories
const mapMoodToCategories = (mood: string): string[] => {
  const moodLower = mood.toLowerCase();
  
  const moodMap: Record<string, string[]> = {
    breakfast: ["breakfast", "sandwiches"],
    lunch: ["lunch", "dinner", "salads", "pizza", "burgers", "mains", "sides", "sandwiches", "Special Order"],
    dinner: ["dinner", "lunch", "salads", "pizza", "burgers", "mains", "sides", "Special Order"],
    drink: ["drinks"],
    drinks: ["drinks"],
    specialorder: ["Special Order"],
    snack: ["snacks"],
    snacks: ["snacks"],
    burger: ["burgers", "burger"],
    burgers: ["burgers", "burgers"],
    salad: ["salads"],
    salads: ["salads"],
    sandwiches: ["sandwiches"],
    mains: ["mains"],
    sides: ["sides"],
    nearby: ["breakfast", "lunch", "dinner", "drinks", "snacks", "starters", "burgers", "salads", "pizza", "mains", "sides", "sandwiches", "Special Order"],
    any: ["breakfast", "lunch", "dinner", "drinks", "snacks", "starters", "burgers", "salads", "pizza", "mains", "sides", "sandwiches", "Special Order"],
    bites: ["snacks", "starters", "bites"],
    softdrink: ["drinks", "soft drinks"],
    chicken: ["chicken"],
    swahili: ["swahili"],
    dessert: ["dessert"],
    coffee: ["coffee"],
    milkshakes: ["milkshakes"],
    mocktail: ["mocktails"],
    signaturecocktail: ["cocktails"],
    beers: ["beers"],
    cognac: ["cognac/brandy"],
    whiskey: ["whiskey"],
    whitewine: ["white wine"],
    soups: ["soups"],
    starters: ["starters"],
    vegeterian: ["vegetarian"],
    wraps: ["wraps"],
  };
  
  return moodMap[moodLower] || [moodLower];
};

export const fetchMoodResults = async (req: UserRequest): Promise<MoodResults> => {
  // 1. Fetch all vendors from Firestore
  const vendorsCollection = collection(db, "vendors");
  const vendorSnapshot = await getDocs(vendorsCollection);
  
  // Transform and filter vendors instantly based on verification state AND operational channel visibility status
  const allVendors: Vendor[] = vendorSnapshot.docs
    .map(doc => {
      const data = doc.data() as any;
      const hour = new Date().getHours();
      const isNightClosed = hour >= 22 || hour < 6;
      
      const is_open = isNightClosed ? false : (data.is_open === true);
      const listing_data = data.listing_data ? {
        ...data.listing_data,
        is_open: isNightClosed ? false : (data.listing_data.is_open === true)
      } : undefined;

      return {
        id: doc.id,
        ...data,
        is_open,
        ...(listing_data ? { listing_data } : {})
      } as any;
    })
    .filter(vendor => {
      // 1st Gate: Must be approved by system administration
      const approvedCheck = vendor.is_approved === true || vendor.auth_info?.is_approved === true;
      
      // 2nd Gate: Channel must be explicitly opened by the merchant (or it is nighttime closed, so they show up as Closed)
      const hour = new Date().getHours();
      const isNightClosed = hour >= 22 || hour < 6;
      const openCheck = isNightClosed ? true : (vendor.is_open === true || vendor.listing_data?.is_open === true);
      
      return approvedCheck && openCheck;
    });

  // 2. Filter vendors by location proximity (100 km radius limit)
  const nearbyVendors = allVendors.filter(v => calculateDistance(v.geolocation, req.location) < 100);
  
  if (nearbyVendors.length === 0) {
    return { vendors: [], menuItems: [] };
  }

  // 3. Get valid categories for this mood
  const validCategories = mapMoodToCategories(req.mood);

  // 3.5 Keyword injection match enhancement logic
  const keyword = req.mood.toLowerCase();
  if (!validCategories.includes(keyword)) {
    validCategories.push(keyword);
  }

  // 4. Fetch menu items for nearby authorized vendors
  const nearbyVendorIds = nearbyVendors.map(v => v.id);

  if (nearbyVendorIds.length === 0) {
      return { vendors: nearbyVendors, menuItems: [] };
  }

  const menuItemsCollection = collection(db, "menuItems");
  let itemsFromVendors: MenuItem[] = [];

  // Chunking mechanics mapping parameters for firestore arrays limits
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

  // Filter items by category client-side
  const filteredItems = itemsFromVendors.filter(item => validCategories.includes(item.category));

  // 3.6 String parsing filtering matching lookup vector algorithms
  const keywordItems = itemsFromVendors.filter(item => item.name.toLowerCase().includes(keyword));

  // Merge and deduplicate records safely inside cache array
  const filteredIds = new Set(filteredItems.map(item => item.id));
  const mergedItems = [...filteredItems, ...keywordItems.filter(item => !filteredIds.has(item.id))];

  if (mergedItems.length === 0) {
    return { vendors: nearbyVendors, menuItems: itemsFromVendors, isFallback: true };
  }

  return { vendors: nearbyVendors, menuItems: mergedItems, isFallback: false };
};

export const fetchVendorMenu = async (vendorId: string): Promise<{ vendor: Vendor; menuItems: MenuItem[] }> => {
  // 1. Fetch the vendor details
  const vendorRef = doc(db, "vendors", vendorId);
  const vendorSnap = await getDoc(vendorRef);

  if (!vendorSnap.exists()) {
    throw new Error("Vendor not found");
  }

  const data = vendorSnap.data() as any;
  const hour = new Date().getHours();
  const isNightClosed = hour >= 22 || hour < 6;
  
  const is_open = isNightClosed ? false : (data.is_open === true);
  const listing_data = data.listing_data ? {
    ...data.listing_data,
    is_open: isNightClosed ? false : (data.listing_data.is_open === true)
  } : undefined;

  const vendor = {
    id: vendorSnap.id,
    ...data,
    is_open,
    ...(listing_data ? { listing_data } : {})
  } as any;

  // Protect standalone page requests from showing unapproved vendors
  const isApproved = vendor.is_approved ?? vendor.auth_info?.is_approved ?? false;
  if (!isApproved) {
    throw new Error("This vendor spot has not been verified yet.");
  }

  // Allow single-page visits but safely check open state if you choose to show a banner on their menu page
  // 2. Fetch all menu items for that vendor
  const menuItemsCollection = collection(db, "menuItems");
  const q = query(menuItemsCollection, where("vendor_id", "==", vendorId));
  const querySnapshot = await getDocs(q);
  
  const menuItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));

  return { vendor, menuItems };
};