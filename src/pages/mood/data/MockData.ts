import { Vendor, MenuItem } from "../types/types";

// Dar es Salaam area coordinates
export const vendors: Vendor[] = [
  {
    id: 1,
    name: "Sosika Snacks",
    owner_name: "Sosika Delivery Co.",
    college_id: 1,
    geolocation: { lat: -3.4138, lng: 36.7112 }, // Near University of Dar es Salaam
    is_open: true,
  }
];

export const menuItems: MenuItem[] = [
  // Breakfast items
  {
    id: 1,
    vendor_id: 1,
    name: "Chocolate Chip Banana Bread",
    description: "Delicious banana bread with chocolate chips.",
    category: "breakfast",
    price: "7500",
    is_available: true,
    image_url: "/images/chocolate-chip-banana-bread.jpeg",
  }
];