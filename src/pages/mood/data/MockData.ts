
import { Vendor, MenuItem } from "../types/types";

// Dar es Salaam area coordinates
export const vendors: Vendor[] = [
  {
    id: 1,
    name: "Campus Bites",
    owner_name: "Anna John",
    college_id: 101,
    geolocation: { lat: -6.7924, lng: 39.2083 }, // Near University of Dar es Salaam
    is_open: true,
  },
  {
    id: 2,
    name: "Juice Junction",
    owner_name: "Peter Kimaro",
    college_id: 101,
    geolocation: { lat: -6.7930, lng: 39.2090 }, // Nearby location
    is_open: true,
  },
  {
    id: 3,
    name: "Snack Hub",
    owner_name: "Grace Mushi",
    college_id: 102,
    geolocation: { lat: -6.7950, lng: 39.2100 }, // Another nearby spot
    is_open: false,
  },
  {
    id: 4,
    name: "City Center Eats",
    owner_name: "David Mwenda",
    college_id: 103,
    geolocation: { lat: -6.8160, lng: 39.2803 }, // City center area
    is_open: true,
  },
];

export const menuItems: MenuItem[] = [
  // Breakfast items
  {
    id: 1,
    vendor_id: 1,
    name: "Pancake Combo",
    description: "Soft pancakes served with fruit and honey",
    category: "breakfast",
    price: "4500",
    is_available: true,
    image_url: "/images/7f4ae9ca0446cbc23e71d8d395a98428.jpeg",
  },
  {
    id: 2,
    vendor_id: 4,
    name: "Chapati & Beans",
    description: "Traditional breakfast with chapati and maharage",
    category: "breakfast",
    price: "3000",
    is_available: true,
    image_url: "/images/images.jpeg",
  },
  {
    id: 3,
    vendor_id: 1,
    name: "Egg Sandwich",
    description: "Toasted sandwich with scrambled eggs and veggies",
    category: "breakfast",
    price: "3500",
    is_available: true,
    image_url: "/images/bca8d172-ca20-42fb-9642-94eb36e620dd.avif",
  },

  // Lunch items
  {
    id: 4,
    vendor_id: 1,
    name: "Grilled Chicken Rice",
    description: "Tasty grilled chicken with pilau rice",
    category: "lunch",
    price: "7000",
    is_available: true,
    image_url: "/images/660ac8bac40176ff0d3eae9b_660ac37329d894752af82dcc_f3a2f9eb-cd9c-484c-b084-8417ee62b2d8.webp",
  },
  {
    id: 5,
    vendor_id: 4,
    name: "Fish & Chips",
    description: "Crispy fried fish with chips and salad",
    category: "lunch",
    price: "8000",
    is_available: true,                                                         
    image_url: "/images/59736398.jpeg",
  },
  {
    id: 6,
    vendor_id: 4,
    name: "Beef Stew & Ugali",
    description: "Rich beef stew served with ugali",
    category: "lunch",
    price: "6500",
    is_available: true,
    image_url: "/images/images (9).jpeg",
  },

  // Drinks
  {
    id: 7,
    vendor_id: 2,
    name: "Fresh Mango Juice",
    description: "Pure mango juice with no sugar added",
    category: "drinks",
    price: "2500",
    is_available: true,
    image_url: "/images/mango-juice-featured-2-500x500.jpg",
  },
  {
    id: 8,
    vendor_id: 2,
    name: "Passion Fruit Juice",
    description: "Refreshing passion fruit juice",
    category: "drinks",
    price: "2500",
    is_available: true,
    image_url: "/images/Passion-Fruit-Juice-square-option.jpeg",
  },
  {
    id: 9,
    vendor_id: 2,
    name: "Coconut Water",
    description: "Fresh coconut water straight from the shell",
    category: "drinks",
    price: "2000",
    is_available: true,
    image_url: "/images/AdobeStock_203678537-scaled.jpeg",
  },

  // Snacks
  {
    id: 10,
    vendor_id: 3,
    name: "Crispy Chips",
    description: "Fresh potato chips with ketchup",
    category: "snacks",
    price: "3000",
    is_available: false,
    image_url: "/images/images (1).jpeg",
  },
  {
    id: 11,
    vendor_id: 3,
    name: "Samosas (4 pcs)",
    description: "Golden fried samosas with meat filling",
    category: "snacks",
    price: "2000",
    is_available: true,
    image_url: "/images/x640_Sambus.jpg",
  },
  {
    id: 12,
    vendor_id: 1,
    name: "Mandazi (6 pcs)",
    description: "Sweet fried dough, perfect with chai",
    category: "snacks",
    price: "1500",
    is_available: true,
    image_url: "/images/image.jpg",
  },
  {
    id: 13,
    vendor_id: 4,
    name: "Chicken Wings",
    description: "Spicy grilled chicken wings",
    category: "snacks",
    price: "5000",
    is_available: true,
    image_url: "/images/images (2).jpeg",
  },
];