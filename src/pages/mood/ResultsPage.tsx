import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, ChevronLeft, Loader2, ShoppingBag, ChevronRight, Sparkles, Flame, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMood } from "../../hooks/useMood";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { fetchMoodResults } from "../mood/api/mockApi";
import { Vendor, MenuItem } from "../mood/types/types";

const ResultsPage = () => {
  const navigate = useNavigate();
  const { mood } = useMood();
  const { locations } = useLocationStorage();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const location = locations[0] || { lat: -6.8, lng: 39.28 };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchMoodResults({ 
          mood: mood || "any", 
          location: { lat: location.lat, lng: location.lng } 
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
  }, [mood, location.lat, location.lng]);

  // Group items by different aspects
  const groupedItems = {
    featured: items.filter(item => item.is_available).slice(0, 6),
    byVendor: vendors.reduce((acc, vendor) => {
      const vendorItems = items.filter(item => item.vendor_id === vendor.id);
      if (vendorItems.length > 0) {
        acc.push({ vendor, items: vendorItems });
      }
      return acc;
    }, [] as { vendor: Vendor; items: MenuItem[] }[]),
    affordable: items.filter(item => item.price < 5000).sort((a, b) => a.price - b.price),
    popular: items.filter(item => item.is_available).slice(0, 8), // Mock popular items
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900">
        <Loader2 className="w-12 h-12 text-[#00bfff] animate-spin mb-4" />
        <p className="text-zinc-400">Finding your perfect match...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => navigate(-1)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-300" />
            </motion.button>
            
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold text-[#00bfff]">Sosika</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-zinc-400 capitalize">
                  {mood || "any"} mood
                </span>
                <span className="text-zinc-600">•</span>
                <div className="flex items-center gap-1 text-sm text-zinc-400">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{location.address || "Your location"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-800/50 backdrop-blur rounded-3xl p-12 text-center mt-12"
          >
            <ShoppingBag className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-zinc-300 mb-2">
              No items available
            </h3>
            <p className="text-zinc-500 mb-6">
              Try selecting a different mood or location
            </p>
            <motion.button
              onClick={() => navigate("/mood")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-[#00bfff] hover:bg-black text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
            >
              Change Mood
            </motion.button>
          </motion.div>
        ) : (
          <>
            {/* Featured Section */}
            {groupedItems.featured.length > 0 && (
              <Section
                title="Featured for You"
                icon={<Sparkles className="w-5 h-5" />}
                items={groupedItems.featured}
                vendors={vendors}
                accentColor="text-yellow-400"
              />
            )}

            {/* By Vendor Sections */}
            {groupedItems.byVendor.map(({ vendor, items: vendorItems }) => (
              <Section
                key={vendor.id}
                title={vendor.name}
                subtitle={vendor.is_open ? "Open now" : "Closed"}
                icon={<MapPin className="w-5 h-5" />}
                items={vendorItems}
                vendors={vendors}
                accentColor={vendor.is_open ? "text-green-400" : "text-red-400"}
              />
            ))}

            {/* Affordable Section */}
            {groupedItems.affordable.length > 0 && (
              <Section
                title="Budget Friendly"
                subtitle="Under 5,000 TZS"
                icon={<DollarSign className="w-5 h-5" />}
                items={groupedItems.affordable}
                vendors={vendors}
                accentColor="text-blue-400"
              />
            )}

            {/* Popular Section */}
            {groupedItems.popular.length > 0 && (
              <Section
                title="Popular Choices"
                icon={<Flame className="w-5 h-5" />}
                items={groupedItems.popular}
                vendors={vendors}
                accentColor="text-orange-400"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Carousel Section Component
interface SectionProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  items: MenuItem[];
  vendors: Vendor[];
  accentColor: string;
}

const Section = ({ title, subtitle, icon, items, vendors, accentColor }: SectionProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${accentColor}`}>
            {icon}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            {subtitle && (
              <p className="text-sm text-zinc-500">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <motion.button
            onClick={() => scroll('left')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-400" />
          </motion.button>
          <motion.button
            onClick={() => scroll('right')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </motion.button>
        </div>
      </div>

      {/* Carousel */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
      >
        {items.map((item) => {
          const vendor = vendors.find(v => v.id === item.vendor_id);
          return (
            <MenuItemCard key={item.id} item={item} vendor={vendor} />
          );
        })}
      </div>
    </motion.div>
  );
};

// Menu Item Card Component
interface MenuItemCardProps {
  item: MenuItem;
  vendor?: Vendor;
}

const MenuItemCard = ({ item, vendor }: MenuItemCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className="flex-shrink-0 w-[280px] bg-zinc-800/50 backdrop-blur rounded-2xl overflow-hidden group cursor-pointer"
    >
      {/* Image */}
      <div className="relative h-40 bg-zinc-900 overflow-hidden">
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src = `https://via.placeholder.com/400x300/27272a/71717a?text=${encodeURIComponent(item.name)}`;
          }}
        />
        
        {/* Availability Badge */}
        <div className="absolute top-2 right-2">
          {item.is_available ? (
            <span className="bg-green-500/90 backdrop-blur text-white text-xs px-2 py-1 rounded-full font-medium">
              Available
            </span>
          ) : (
            <span className="bg-red-500/90 backdrop-blur text-white text-xs px-2 py-1 rounded-full font-medium">
              Unavailable
            </span>
          )}
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-2 left-2">
          <span className="bg-[#00bfff]/90 backdrop-blur text-white text-sm px-3 py-1 rounded-full font-bold">
            {item.price.toLocaleString()} TZS
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Title */}
        <h3 className="font-semibold text-white text-base line-clamp-1">
          {item.name}
        </h3>

        {/* Description */}
        <p className="text-zinc-400 text-xs line-clamp-2 min-h-[2.5rem]">
          {item.description}
        </p>

        {/* Vendor Info */}
        {vendor && (
          <div className="flex items-center justify-between pt-2 border-t border-zinc-700/50">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-400 truncate max-w-[120px]">
                {vendor.name}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span className={`text-xs ${vendor.is_open ? "text-green-400" : "text-red-400"}`}>
                {vendor.is_open ? "Open" : "Closed"}
              </span>
            </div>
          </div>
        )}

        {/* Order Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={!item.is_available}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
            item.is_available
              ? "bg-[#00bfff] hover:bg-black text-white shadow-lg shadow-blue-500/20"
              : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
          }`}
        >
          {item.is_available ? "Order Now" : "Not Available"}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ResultsPage;