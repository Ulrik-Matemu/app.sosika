import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from "react-leaflet";
import { useParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Loader2Icon,
  MapPinIcon,
  NavigationIcon
} from "lucide-react";

// Helper to create a custom map icon
const createCustomIcon = (color: string) =>
  L.divIcon({
    className: "custom-marker-icon",
    html: `
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        width="32" 
        height="32" 
        fill="${color}"
        stroke="white"
        stroke-width="2"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" fill="white" stroke="${color}" stroke-width="2" />
      </svg>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

// Sub-component to automatically zoom map to include both markers
const LocationTracker: React.FC<{
  userLocation: { lat: number; lng: number };
  deliveryLocation: { lat: number; lng: number };
}> = ({ userLocation, deliveryLocation }) => {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds(
      [userLocation.lat, userLocation.lng],
      [deliveryLocation.lat, deliveryLocation.lng]
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [userLocation, deliveryLocation, map]);

  return null;
};

const OrderTracking: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  const [orderStatus, setOrderStatus] = useState<string>("Pending");
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch order details
  useEffect(() => {
    let isMounted = true;

    const fetchOrderStatus = async () => {
      if (!orderId) {
        setError("Invalid Order ID.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data } = await axios.get(
          `https://sosika-backend.onrender.com/api/orders/${orderId}/status`,
          { timeout: 10000 }
        );

        if (isMounted) {
          setOrderStatus(data.status || "Pending");
          setDeliveryLocation(data.delivery_location);
          setError(null);
        }
      } catch (err) {
        console.error("Order status error:", err);
        if (isMounted) setError("Failed to fetch order status. Please try again.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchOrderStatus();
    const interval = setInterval(fetchOrderStatus, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderId]);

  // Fetch user location from backend
  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        const { data } = await axios.get(
          `https://sosika-backend.onrender.com/api/auth/users/location`,
          {
            timeout: 10000,
            params: { userId }
          }
        );

        if (data?.custom_address) {
          setUserLocation(data.custom_address);
        }
      } catch (err) {
        console.error("User location error:", err);
      }
    };

    fetchUserLocation();

    // Optional: fallback to browser geolocation
    if ("geolocation" in navigator && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setUserLocation({ lat: coords.latitude, lng: coords.longitude });
        },
        (err) => {
          console.error("Geolocation error:", err);
        }
      );
    }
  }, []);

  if (error) {
    return (
      <div className="max-w-md mx-auto p-4 bg-red-50 text-red-600 text-center">
        <MapPinIcon className="mx-auto mb-4" size={48} />
        <p>{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
        <div className="flex flex-col justify-center items-center h-screen bg-black text-gray-400">
        <Loader2Icon size={48} className="animate-spin text-blue-400 mb-4" />
        <p className="text-sm">Connecting to your order...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
  {(userLocation && deliveryLocation) && (
    <MapContainer
      center={[
        (userLocation.lat + deliveryLocation.lat) / 2,
        (userLocation.lng + deliveryLocation.lng) / 2
      ]}
      zoom={13}
      className="absolute top-0 left-0 w-full h-full z-0"
    >
      <LocationTracker userLocation={userLocation} deliveryLocation={deliveryLocation} />

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      <Marker position={[deliveryLocation.lat, deliveryLocation.lng]} icon={createCustomIcon("deepskyblue")}>
        <Popup className="font-semibold text-sm text-blue-700">Delivery Location 🚚</Popup>
      </Marker>

      <Marker position={[userLocation.lat, userLocation.lng]} icon={createCustomIcon("limegreen")}>
        <Popup className="font-semibold text-sm text-green-700">Your Location 📍</Popup>
      </Marker>
    </MapContainer>
  )}

  {/* Floating Card */}
  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] sm:w-[400px] bg-black/70 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl text-white px-6 py-5 z-10 animate-fade-in-up">
    <h2 className="text-lg sm:text-xl font-bold mb-2 tracking-wide">Tracking Your Order</h2>

    <div className="flex justify-between items-center mb-4">
      <span className="text-sm text-gray-300">Status</span>
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium
          ${orderStatus === "Pending"
            ? "bg-yellow-600/20 text-yellow-400 animate-pulse"
            : "bg-green-600/20 text-green-400 animate-bounce"}`}
      >
        {orderStatus}
      </span>
    </div>

    {userLocation && (
      <div className="flex items-center gap-2 text-sm font-medium text-blue-300">
        <NavigationIcon size={18} className="animate-wiggle" />
        Live location tracked
      </div>
    )}
  </div>
</div>

  );
};

export default OrderTracking;
