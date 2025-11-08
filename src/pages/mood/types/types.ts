export interface Vendor {
  id: number;
  name: string;
  owner_name: string;
  college_id: number;
  geolocation: { lat: number; lng: number };
  is_open: boolean;
}

export interface MenuItem {
  id: number;
  vendor_id: number;
  name: string;
  description: string;
  category: "breakfast" | "lunch" | "dinner" | "snacks" | "drinks";
  price: number;
  is_available: boolean;
  image_url: string;
}
