export interface Vendor {
  id: string;
  name: string;
  owner_name: string;
  college_id: number;
  geolocation: { lat: number; lng: number };
  is_open: boolean;
}

export interface MenuItem {
  id: string;
  vendor_id: string;
  name: string;
  description: string;
  category: "breakfast" | "lunch" | "dinner" | "snacks" | "drinks";
  price: string;
  is_available: boolean;
  image_url: string;
}