import { vendors, menuItems } from "../data/MockData";
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
  console.log("Mock request received:", req);

  // Filter vendors by location proximity (within 10 km)
  const nearbyVendors = vendors.filter(v => calculateDistance(v.geolocation, req.location) < 10 ); // 

  console.log(`Found ${nearbyVendors.length} nearby vendors:`, nearbyVendors.map(v => v.name));

  // Get valid categories for this mood
  const validCategories = mapMoodToCategories(req.mood);
  console.log(`Mood "${req.mood}" mapped to categories:`, validCategories);

  // Filter menu items by mood/category and vendor
  const filteredItems = menuItems.filter(item => {
    const isNearbyVendor = nearbyVendors.some(v => v.id === item.vendor_id);
    const matchesCategory = validCategories.includes(item.category);
    
    return isNearbyVendor && matchesCategory;
  });

  console.log(`Found ${filteredItems.length} menu items:`, filteredItems.map(i => i.name));

  // Simulate delay
  await new Promise(res => setTimeout(res, 800));

  return { vendors: nearbyVendors, menuItems: filteredItems };
};