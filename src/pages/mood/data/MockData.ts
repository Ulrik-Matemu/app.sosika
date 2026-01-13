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
  },
  {
    id: 2,
    name: "Tokyo Terrace",
    owner_name: "Yuki Tanaka",
    college_id: 1,
    geolocation: { lat: -3.4150, lng: 36.7150 },
    is_open: true,
  },
  {
    id: 3,
    name: "La Piazza Express",
    owner_name: "Marco Rossi",
    college_id: 1,
    geolocation: { lat: -3.4120, lng: 36.7100 },
    is_open: true,
  },
  {
    id: 4,
    name: "Andes Grill",
    owner_name: "Elena Gomez",
    college_id: 1,
    geolocation: { lat: -3.4165, lng: 36.7125 },
    is_open: false,
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
  },
  // Asian Cuisine (Tokyo Terrace)
  {
    id: 2,
    vendor_id: 2,
    name: "Fresh Salmon Sushi",
    description: "Premium Atlantic salmon over seasoned rice.",
    category: "lunch",
    price: "15000",
    is_available: true,
    image_url: "/images/salmon-sushi.jpg", // Search Pexels: "Sushi"
  },
  {
    id: 3,
    vendor_id: 2,
    name: "Miso Ramen",
    description: "Hearty noodles in a rich miso broth with soft-boiled egg.",
    category: "dinner",
    price: "18500",
    is_available: true,
    image_url: "/images/miso-ramen.jpg", // Search Pexels: "Ramen"
  },
  // Italian Cuisine (La Piazza)
  {
    id: 4,
    vendor_id: 3,
    name: "Margherita Pizza",
    description: "Classic tomato sauce, fresh mozzarella, and basil leaves.",
    category: "lunch",
    price: "22000",
    is_available: true,
    image_url: "/images/pizza.jpg", // Search Pexels: "Pizza"
  },
  // Latin American Cuisine (Andes Grill)
  {
    id: 5,
    vendor_id: 4,
    name: "Beef Tacos",
    description: "Three soft corn tortillas with seasoned beef and cilantro.",
    category: "lunch",
    price: "12000",
    is_available: true,
    image_url: "/images/beef-tacos.jpg", // Search Pexels: "Tacos"
  },
  // Desserts
  {
    id: 6,
    vendor_id: 3,
    name: "Berry Tiramisu",
    description: "Italian coffee-flavored cake topped with fresh berries.",
    category: "snacks",
    price: "9500",
    is_available: true,
    image_url: "/images/tiramisu.jpg", // Search Pexels: "Tiramisu"
  },
  // Extra Real
  {
    id: 7,
    vendor_id: 1,
    name: "Chips Mayai",
    description: "Tanzanian-style omelette with French fries.",
    category: "dinner",
    price: "3000",
    is_available: true,
    image_url: "/images/chips-mayai.jpg", // Search Pexels: "Omelette"
  },
   {
    id: 8,
    vendor_id: 1,
    name: "Chips Kavu",
    description: "Crispy fried potatoes, Tanzanian style.",
    category: "lunch",
    price: "2500",
    is_available: true,
    image_url: "/images/chips-kavu.jpg", // Search Pexels: "Fried Potatoes"
   },
   {
    id: 9,
    vendor_id: 1,
    name: "Mishkaki ya Ng'ombe (4 pcs)",
    description: "Grilled beef skewers marinated in Tanzanian spices.",
    category: "lunch",
    price: "2000",
    is_available: true,
    image_url: "/images/mishkaki-ngombe.webp", // Search Pexels: "Beef Skewers"
   },
   {
    id: 10,
    vendor_id: 1,
    name: "Mshikaki ya Kuku (4 pcs)",
    description: "Grilled chicken skewers marinated in Tanzanian spices.",
    category: "lunch",
    price: "4000",
    is_available: true,
    image_url: "/images/mishkaki-kuku.jpg", // Search Pexels: "Chicken Skewers"
   },
   {
    id: 11,
    vendor_id: 1,
    name: "Roasted Chicken",
    description: "Crispy roasted chicken with herbs and spices.",
    category: "lunch",
    price: "13000",
    is_available: true,
    image_url: "/images/kuku-rosti.jpeg", // Search Pexels: "Roasted Chicken"
   },
  {
    id: 12,
    vendor_id: 1,
    name: "Roasted Chicken 1/2",
    description: "Crispy roasted chicken with herbs and spices.",
    category: "lunch",
    price: "7500",
    is_available: true,
    image_url: "/images/kuku-rosti.jpeg", // Search Pexels: "Roasted Chicken"
  }
];