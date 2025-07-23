import { useEffect, useState } from 'react';
import axios from 'axios';

type Vendor = {
  id: number;
  name: string;
  geolocation: [number, number];
  // Add other vendor fields as needed
};

type MenuItem = {
  id: number;
  name: string;
  price: number;
  image_url: string;
  description: string;
  category: string;
  is_available: boolean;
  vendor_id: number;
  total_sold: number;
};

const API_BASE = 'https://sosika-backend.onrender.com/api';

export default function useExploreData(radiusMeters: number = 3000) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [popularItems, setPopularItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async (latitude: number, longitude: number) => {
      try {
        const vendorRes = await axios.get<Vendor[]>(`${API_BASE}/vendor`, {
          params: {
            lat: latitude,
            lng: longitude,
            radius: radiusMeters,
          },
        });
        const fetchedVendors = vendorRes.data;
        setVendors(fetchedVendors);

        if (fetchedVendors.length === 0) {
          setPopularItems([]);
          return;
        }

        const vendorIds = fetchedVendors.map((v) => v.id).join(',');

        const itemsRes = await axios.get(`${API_BASE}/menuItem/popular-menu-items`, {
          params: { vendorIds },
        });

        if (itemsRes.data.success) {
          setPopularItems(itemsRes.data.items);
        } else {
          setError('Failed to load popular menu items');
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError('Something went wrong while fetching data');
      } finally {
        setLoading(false);
      }
    };

    if ('geolocation' in navigator) {
      // Options for getCurrentPosition for better reliability
      const geolocationOptions = {
        enableHighAccuracy: false, // Set to true if you need more precise (but slower) results
        timeout: 10000, // 10 seconds timeout
        maximumAge: 0 // Don't use a cached position, get a fresh one
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchData(latitude, longitude);
        },
        (err) => {
          console.error("Geolocation error:", err);
          let errorMessage = 'Geolocation access denied';
          if (err.code === 1) {
            errorMessage = 'Geolocation access denied. Please allow location access in your browser settings and ensure the site is running on HTTPS.';
          } else if (err.code === 2) {
            errorMessage = 'Location unavailable. Please check your device settings or try again later.';
          } else if (err.code === 3) {
            errorMessage = 'Geolocation request timed out. Please try again.';
          }
          setError(errorMessage);
          setLoading(false);
        },
        geolocationOptions // Pass the options here
      );
    } else {
      setError('Geolocation is not supported in this browser');
      setLoading(false);
    }
  }, [radiusMeters]);

  return { loading, error, vendors, popularItems };
}
