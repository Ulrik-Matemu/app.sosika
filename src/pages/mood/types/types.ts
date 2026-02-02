export interface Vendor {
  id: string;
  name: string;
  owner_name: string;
  college_id: number;
  geolocation: { lat: number; lng: number };
  is_open: boolean;
  address: string;
  averageRating?: number;
  ratingCount?: number;
}

export interface MenuItem {
  id: string;
  vendor_id: string;
  name: string;
  description: string;
  category: "breakfast" | "lunch" | "dinner" | "snacks" | "drinks" | "salads" | "burgers" | "starters" | "pizza" | "mains" | "sides" | "sandwiches";
  price: string;
  is_available: boolean;
  image_url: string;
  averageRating?: number;
  ratingCount?: number;
}

export interface Review {
  id?: string;
  userId?: string;
  userName?: string;
  targetId: string;
  targetType: 'vendor' | 'menuItem';
  rating: number;
  reviewText: string;
  createdAt: any;
}

export interface SectionProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  items: MenuItem[];
  vendors?: Vendor[];
  accentColor?: string;
}
