import { useEffect, useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, ChevronLeft, Loader2, ShoppingBag, ChevronRight, Sparkles, Flame, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMood } from "../../hooks/useMood";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { fetchMoodResults } from "./api/mood-api";
import { Vendor, MenuItem } from "../mood/types/types";
import { useCartContext } from "../../context/cartContext";
import Navbar from "../../components/my-components/navbar";

// --- Components ---

const LazyImage = ({ src, alt, className }: { src: string; alt: string; className: string }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative ${className} overflow-hidden`}>
      {isLoading && (
        <div className="absolute inset-0 bg-zinc-700 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={(e) => {
          e.currentTarget.src = `https://via.placeholder.com/400x300/27272a/71717a?text=${encodeURIComponent(alt)}`;
          setIsLoading(false);
        }}
      />
    </div>
  );
};

const FilterButton = ({ label, active, onClick, variant = "primary" }: {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary"
}) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${active
        ? variant === "primary"
          ? "bg-[#00bfff] text-black shadow-lg shadow-blue-500/20"
          : "bg-white text-black"
        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700/50"
      }`}
  >
    {label}
  </motion.button>
);

// --- Main Page ---

const ResultsPage = () => {
  const navigate = useNavigate();
  const { mood } = useMood();
  const { locations } = useLocationStorage();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtering States
  const [activeVendorId, setActiveVendorId] = useState<string | "all">("all");
  const [activeCriteria, setActiveCriteria] = useState<string>("all");

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

  const scrollToSection = (id: string) => {
    setActiveVendorId(id);
    if (id === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const element = document.getElementById(`vendor-section-${id}`);
    if (element) {
      const offset = 210; // Height of the sticky header + spacing
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: elementPosition - offset, behavior: "smooth" });
    }
  };

  const groupedItems = useMemo(() => {
    const availableItems = items.filter(item => item.is_available);

    return {
      featured: availableItems.slice(0, 6),
      byVendor: vendors.reduce((acc, vendor) => {
        const vendorItems = items.filter(item => item.vendor_id === vendor.id);
        if (vendorItems.length > 0) {
          acc.push({ vendor, items: vendorItems });
        }
        return acc;
      }, [] as { vendor: Vendor; items: MenuItem[] }[]),
      affordable: items
        .filter(item => {
          const priceNum = Number(item.price);
          return !Number.isNaN(priceNum) && priceNum < 5000;
        })
        .sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)),
      popular: availableItems.slice(0, 8),
    };
  }, [items, vendors]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900">
        <Loader2 className="w-12 h-12 text-[#00bfff] animate-spin mb-4" />
        <p className="text-zinc-400 font-medium">Curating your {mood} experience...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 pb-24">
      {/* STICKY NAVIGATION HEADER */}
      <div className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-4 mb-4">
            <motion.button
              onClick={() => navigate(-1)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-300" />
            </motion.button>
            <div className="flex-1">
              <h1 className="text-xl font-black text-[#00bfff] tracking-tight">SOSIKA</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Results for {mood || "Any Mood"}</p>
            </div>
          </div>

          {/* SCROLLBAR 1: VENDORS */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 pt-1">

            <FilterButton
              label="All Vendors"
              active={activeVendorId === "all"}
              onClick={() => scrollToSection("all")}
            />
            {vendors.map((v) => (
              <FilterButton
                key={v.id}
                label={v.name}
                active={activeVendorId === v.id.toString()}
                onClick={() => scrollToSection(v.id.toString())}
              />
            ))}
          </div>

          {/* SCROLLBAR 2: CRITERIA */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-3 border-t border-zinc-800/50 mt-1">
            {[
              { id: "all", label: "Everything" },
              { id: "featured", label: "Featured" },
              { id: "affordable", label: "Budget (Under 5k)" },
              { id: "popular", label: "Trending" }
            ].map((crit) => (
              <button
                key={crit.id}
                onClick={() => setActiveCriteria(crit.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeCriteria === crit.id
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-300"
                  }`}
              >
                {crit.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-12">
        {items.length === 0 ? (
          <EmptyState onReset={() => navigate("/mood")} />
        ) : (
          <>
            {/* Featured Section */}
            {(activeCriteria === "all" || activeCriteria === "featured") && groupedItems.featured.length > 0 && (
              <Section
                title="Featured for You"
                icon={<Sparkles className="w-5 h-5" />}
                items={groupedItems.featured}
                vendors={vendors}
                accentColor="text-yellow-400"
              />
            )}

            {/* Vendor Sections */}
            {groupedItems.byVendor.map(({ vendor, items: vendorItems }) => (
              <div key={vendor.id} id={`vendor-section-${vendor.id}`}>
                <Section
                  title={vendor.name}
                  subtitle={vendor.is_open ? "Open now" : "Closed"}
                  icon={<MapPin className="w-5 h-5" />}
                  items={vendorItems}
                  vendors={vendors}
                  accentColor={vendor.is_open ? "text-green-400" : "text-red-400"}
                />
              </div>
            ))}

            {/* Budget Section */}
            {(activeCriteria === "all" || activeCriteria === "affordable") && groupedItems.affordable.length > 0 && (
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
            {(activeCriteria === "all" || activeCriteria === "popular") && groupedItems.popular.length > 0 && (
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
      <Navbar />
    </div>
  );
};

// --- Sub-Components ---

const EmptyState = ({ onReset }: { onReset: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-zinc-800/50 backdrop-blur rounded-3xl p-12 text-center mt-12"
  >
    <ShoppingBag className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
    <h3 className="text-xl font-medium text-zinc-300 mb-2">No items found</h3>
    <p className="text-zinc-500 mb-6 text-sm">We couldn't find anything matching this mood in your area.</p>
    <button
      onClick={onReset}
      className="bg-[#00bfff] text-black px-8 py-3 rounded-xl font-bold"
    >
      Adjust Mood
    </button>
  </motion.div>
);

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
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-zinc-800 rounded-lg ${accentColor}`}>
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">{title}</h2>
            {subtitle && (
              <p className="text-xs font-medium text-zinc-500">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex gap-1.5">
          <button onClick={() => scroll('left')} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => scroll('right')} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 px-1"
      >
        {items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            vendor={vendors.find(v => v.id === item.vendor_id)}
          />
        ))}
      </div>
    </motion.div>
  );
};

const MenuItemCard = ({ item, vendor }: { item: MenuItem; vendor?: Vendor }) => {
  const { addToCart } = useCartContext();

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="flex-shrink-0 w-[260px] bg-zinc-800/40 border border-zinc-800/50 backdrop-blur rounded-2xl overflow-hidden"
    >
      <div className="relative h-40 bg-zinc-900">
        <LazyImage src={item.image_url} alt={item.name} className="w-full h-full" />
        <div className="absolute top-3 left-3">
          <span className="bg-black/60 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-lg font-bold border border-white/10">
            {Number(item.price).toLocaleString()} TZS
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-white text-sm mb-1 truncate">{item.name}</h3>
        <p className="text-zinc-500 text-[11px] line-clamp-2 mb-4">{item.description}</p>

        {vendor && (
          <div className="flex items-center gap-2 mb-4 opacity-70">
            <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-white">
              {vendor.name[0]}
            </div>
            <span className="text-[10px] text-zinc-400 font-medium truncate">{vendor.name}</span>
          </div>
        )}

        <button
          disabled={!item.is_available}
          onClick={() => {
            // Check if item has valid data before calling context
            if (item.id && item.price !== undefined) {
              addToCart({
                ...item, // Pass the whole item or the specific fields
                id: item.id, // Keep the original ID type (string or number)
                quantity: 1,
              } as any); // Type cast if your MenuItem type differs slightly from CartItem
            }
          }}
          className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${item.is_available
              ? "bg-[#00bfff] text-black shadow-lg shadow-blue-500/20 active:scale-95"
              : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
            }`}
        >
          {item.is_available ? "Add to Cart" : "Sold Out"}
        </button>
      </div>
    </motion.div>
  );
};

export default ResultsPage;