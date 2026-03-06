import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, ChevronLeft, Loader2, Clock, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMood } from "../../hooks/useMood";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { fetchMoodResults } from "./api/mood-api";
import { Vendor, MenuItem } from "../mood/types/types";
import Navbar from "../../components/my-components/navbar";

// --- Helpers ---

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
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

// --- VendorCard ---

const VendorCard = ({
  vendor,
  userLocation,
  index,
}: {
  vendor: Vendor;
  items: MenuItem[];
  userLocation: { lat: number; lng: number };
  index: number;
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
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={() => navigate(`/vendor/${vendor.id}/menu`)}
      className="group cursor-pointer mb-5"
    >
      <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/[0.06] transition-all duration-500 hover:border-white/[0.12] hover:shadow-2xl hover:shadow-black/60">

        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={vendor.cover_image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000"}
            alt={vendor.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/30 to-transparent" />

          {/* Open/Closed pill */}
          <div className="absolute top-3 left-3">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md ${
              vendor.is_open
                ? "bg-black/40 text-emerald-400 border border-emerald-500/30"
                : "bg-black/40 text-zinc-500 border border-zinc-700/50"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${vendor.is_open ? "bg-emerald-400" : "bg-zinc-600"}`} />
              {vendor.is_open ? "Open" : "Closed"}
            </div>
          </div>

          {/* Arrow icon top right */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
            <div className="w-8 h-8 rounded-full bg-[#00bfff]/20 border border-[#00bfff]/40 backdrop-blur-md flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-[#00bfff]" />
            </div>
          </div>
        </div>

        {/* Info row */}
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-[15px] font-black text-white tracking-tight truncate leading-tight">
              {vendor.name}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
                <MapPin className="w-3 h-3 text-[#00bfff]/70 flex-shrink-0" />
                {distance ? `${distance} km` : "Nearby"}
              </span>
              <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
              <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
                <Clock className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                25–35 min
              </span>
            </div>
          </div>

          {/* Explore CTA */}
          <div className="flex-shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-[#00bfff]/10 border border-[#00bfff]/20 group-hover:bg-[#00bfff]/20 group-hover:border-[#00bfff]/40 transition-all duration-300">
              <span className="text-[11px] font-black text-[#00bfff] uppercase tracking-wider">
                Menu
              </span>
            </div>
          </div>
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
    return vendors.map((vendor) => ({
      vendor,
      vendorItems: items.filter((item) => item.vendor_id === vendor.id),
    }));
  }, [vendors, items]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 px-8 text-center">
        <Loader2 className="w-10 h-10 text-[#00bfff] animate-spin mb-5" />
        <h2 className="text-lg font-black text-white mb-1.5 uppercase tracking-tighter">
          Setting the Vibe
        </h2>
        <p className="text-zinc-600 text-sm font-medium">
          Finding the best spots for your "{mood}" mood...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 pb-28 text-zinc-100">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors border border-white/[0.06]"
          >
            <ChevronLeft className="w-4.5 h-4.5 text-zinc-300" />
          </button>
          <div>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-none mb-0.5">
              Results
            </p>
            <h1 className="text-base font-black text-white uppercase tracking-tight leading-none">
              {mood || "Discovery"}{" "}
              <span className="text-zinc-600">Mood</span>
            </h1>
          </div>
          {vendorData.length > 0 && (
            <div className="ml-auto">
              <span className="text-[11px] font-bold text-zinc-600">
                {vendorData.length} spot{vendorData.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pt-5">
        {vendorData.length > 0 ? (
          vendorData.map(({ vendor, vendorItems }, index) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              items={vendorItems}
              userLocation={userLocation}
              index={index}
            />
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-24 text-center"
          >
            <p className="text-zinc-600 text-sm font-semibold mb-4">
              No spots found for this mood nearby.
            </p>
            <button
              onClick={() => navigate("/")}
              className="text-[#00bfff] text-xs font-black uppercase tracking-wider"
            >
              Try another mood
            </button>
          </motion.div>
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default ResultsPage;