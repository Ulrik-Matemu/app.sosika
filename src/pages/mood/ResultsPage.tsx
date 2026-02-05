import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, ChevronLeft, Loader2, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMood } from "../../hooks/useMood";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { fetchMoodResults } from "./api/mood-api";
import { Vendor, MenuItem } from "../mood/types/types";
import Navbar from "../../components/my-components/navbar";

// --- Helpers ---

// const isIconImage = (url: string) => url?.includes("/icons/menu/");

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// --- Sub-Components ---

const VendorCard = ({
  vendor,
  userLocation,
}: {
  vendor: Vendor;
  items: MenuItem[];
  userLocation: { lat: number; lng: number };
}) => {
  const navigate = useNavigate();

  const distance = useMemo(() => {
    if (vendor.geolocation) {
      return getDistance(
        userLocation.lat,
        userLocation.lng,
        vendor.geolocation.lat,
        vendor.geolocation.lng
      ).toFixed(1);
    }
    return null;
  }, [vendor, userLocation]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-zinc-800/20 border border-zinc-800/60 rounded-[2rem] overflow-hidden mb-10 backdrop-blur-sm"
    >
      {/* Vendor Hero Section */}
      <div 
        className="relative h-56 cursor-pointer group"
        onClick={() => navigate(`/vendor/${vendor.id}/menu`)}
      >
        <img
          src={vendor.cover_image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000"}
          alt={vendor.name}
          className="w-full h-full object-cover transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border ${
            vendor.is_open 
              ? "bg-green-500/20 text-green-400 border-green-500/30" 
              : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
          }`}>
            {vendor.is_open ? "Open Now" : "Closed"}
          </span>
        </div>

        <div className="absolute bottom-4 left-6 right-6">
          <h2 className="text-2xl font-black text-white mb-1">{vendor.name}</h2>
          <div className="flex items-center gap-4 text-zinc-300">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#00bfff]" />
              <span className="text-xs font-bold">{distance ? `${distance} km` : "Nearby"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-bold">25-35 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Item Horizontal Preview */}
      <div className="p-6">
        <div className="flex justify-end items-end">
          <button 
            onClick={() => navigate(`/vendor/${vendor.id}/menu`)}
            className="flex items-center gap-1 text-[#00bfff] text-[14px] font-black uppercase tracking-wider group"
          >
            Explore Menu <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

      </div>
    </motion.div>
  );
};

// --- Main Results Page ---

const ResultsPage = () => {
  const navigate = useNavigate();
  const { mood } = useMood();
  const { locations } = useLocationStorage();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const userLocation = locations[0] || { lat: -3.37, lng: 36.7 };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchMoodResults({
          mood: mood || "any",
          location: { lat: userLocation.lat, lng: userLocation.lng },
        });
        setVendors(data.vendors);
        setItems(data.menuItems);
      } catch (error) {
        console.error("Failed to load results:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [mood, userLocation.lat, userLocation.lng]);

  const vendorData = useMemo(() => {
    return vendors
      .map((vendor) => ({
        vendor,
        vendorItems: items.filter((item) => item.vendor_id === vendor.id),
      }))
      .filter((v) => v.vendorItems.length > 0);
  }, [vendors, items]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 px-8 text-center">
        <Loader2 className="w-12 h-12 text-[#00bfff] animate-spin mb-6" />
        <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Setting the Vibe</h2>
        <p className="text-zinc-500 text-sm font-medium italic">
          Finding the best spots for your "{mood}" mood...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 pb-24 text-zinc-100">
      {/* Dynamic Header */}
      <div className="sticky top-0 z-30 bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 transition-colors shadow-inner"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-300" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tighter">
                {mood || "Discovery"} <span className="text-zinc-600">Mood</span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Results Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {vendorData.length > 0 ? (
          vendorData.map(({ vendor, vendorItems }) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              items={vendorItems}
              userLocation={userLocation}
            />
          ))
        ) : (
          <div className="py-20 text-center">
            <p className="text-zinc-500 font-bold italic">No spots found for this mood nearby.</p>
            <button 
              onClick={() => navigate('/')}
              className="mt-4 text-[#00bfff] text-sm font-black uppercase"
            >
              Try another mood
            </button>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default ResultsPage;