import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronLeft, Clock, ArrowUpRight, ShoppingBag, Check, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMood } from "../../hooks/useMood";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { useCartContext } from "../../context/cartContext";
import { fetchMoodResults, peekMoodResultsCache } from "./api/mood-api";
import { Vendor, MenuItem } from "../mood/types/types";
import Navbar from "../../components/my-components/navbar";
import { getDistance } from "../../lib/utils";
import posthog from "posthog-js";
import { triggerAddToCartToast } from "../../components/my-components/AddToCartToast";

// --- Skeleton Loader ---
const SkeletonCard = () => (
  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
    <div className="h-4 w-3/4 rounded-md skeleton-shimmer bg-white/[0.04]" />
    <div className="h-3 w-full rounded-md skeleton-shimmer bg-white/[0.03]" />
    <div className="h-3 w-1/2 rounded-md skeleton-shimmer bg-white/[0.03]" />
    <div className="flex items-center justify-between pt-2">
      <div className="h-5 w-20 rounded-md skeleton-shimmer bg-white/[0.04]" />
      <div className="h-8 w-8 rounded-full skeleton-shimmer bg-white/[0.04]" />
    </div>
  </div>
);

// const SkeletonVendor = () => (
//   <div className="flex-shrink-0 w-56 bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
//     <div className="h-28 skeleton-shimmer bg-white/[0.04]" />
//     <div className="p-3 space-y-2">
//       <div className="h-4 w-3/4 rounded-md skeleton-shimmer bg-white/[0.04]" />
//       <div className="h-3 w-1/2 rounded-md skeleton-shimmer bg-white/[0.03]" />
//     </div>
//   </div>
// );

// --- Menu Item Card (text-based, no images, no emoji/icons) ---
const MenuItemCard = ({
  item,
  vendorName,
  index,
  isVendorOpen = true,
}: {
  item: MenuItem;
  vendorName: string;
  index: number;
  isVendorOpen?: boolean;
}) => {
  const { addToCart } = useCartContext();
  const [isAdded, setIsAdded] = useState(false);

  const isAvailable = item.is_available !== false;
  const canAdd = isAvailable && isVendorOpen;

  const handleAdd = useCallback(() => {
    if (!canAdd) return;
    addToCart({ ...item, quantity: 1 } as any);
    triggerAddToCartToast(item);
    posthog.capture("order_started", {
      platform: "app",
      item_id: item.id,
      item_name: item.name,
      source: "results_page",
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);
  }, [item, addToCart, canAdd]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.2), ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`group bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 transition-all duration-300 ${
        canAdd
          ? "hover:bg-white/[0.05] hover:border-white/[0.1]"
          : "opacity-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Item name */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-white text-[15px] leading-snug truncate">
              {item.name}
            </h3>
            {!isAvailable && (
              <span className="text-[9px] font-bold text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded uppercase tracking-wider">
                Out of Stock
              </span>
            )}
            {!isVendorOpen && isAvailable && (
              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                Closed
              </span>
            )}
          </div>
          {/* Description */}
          {item.description && (
            <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2 mb-2.5">
              {item.description}
            </p>
          )}
          {/* Price */}
          <p className="text-[#00bfff] font-bold text-sm">
            {Number(item.price).toLocaleString()} TZS
          </p>
          {/* Vendor name */}
          <p className="text-zinc-600 text-[11px] font-medium mt-1.5">
            {vendorName}
          </p>
        </div>

        {/* Add to cart button */}
        <button
          onClick={handleAdd}
          disabled={isAdded || !canAdd}
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
            isAdded
              ? "bg-emerald-500/20 border border-emerald-500/30"
              : !canAdd
              ? "bg-zinc-800/20 border border-white/[0.02] cursor-not-allowed opacity-40"
              : "bg-white/[0.05] border border-white/[0.08] hover:bg-[#00bfff]/[0.12] hover:border-[#00bfff]/30 active:scale-90"
          }`}
          aria-label={!isAvailable ? `${item.name} is out of stock` : !isVendorOpen ? `${item.name} is unavailable (Vendor is closed)` : `Add ${item.name} to cart`}
        >
          <AnimatePresence mode="wait">
            {isAdded ? (
              <motion.div
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Check className="w-4 h-4 text-emerald-400" />
              </motion.div>
            ) : (
              <motion.div
                key="bag"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <ShoppingBag className={`w-4 h-4 ${!canAdd ? "text-zinc-600" : "text-zinc-400 group-hover:text-[#00bfff] transition-colors"}`} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
};

// --- Vendor Card (horizontal scroll) ---
const VendorScrollCard = ({
  vendor,
  userLocation,
}: {
  vendor: Vendor;
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        posthog.capture("vendor_clicked", { vendor_id: vendor.id, vendor_name: vendor.name, platform: "app" });
        navigate(`/vendor/${vendor.id}/menu`);
      }}
      className="flex-shrink-0 w-56 cursor-pointer group"
    >
      <div className="rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300">
        {/* Cover image */}
        <div className="relative h-28 overflow-hidden">
          <img
            src={vendor.cover_image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600"}
            alt={vendor.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-transparent" />

          {/* Status pill */}
          <div className="absolute top-2 left-2">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider backdrop-blur-md ${vendor.is_open
              ? "bg-black/50 text-emerald-400 border border-emerald-500/20"
              : "bg-black/50 text-zinc-500 border border-zinc-700/30"
              }`}>
              <span className={`w-1 h-1 rounded-full ${vendor.is_open ? "bg-emerald-400" : "bg-zinc-600"}`} />
              {vendor.is_open ? "Open" : "Closed"}
            </div>
          </div>

          {/* Arrow */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="w-6 h-6 rounded-full bg-white/[0.1] backdrop-blur-md flex items-center justify-center">
              <ArrowUpRight className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="px-3 py-2.5">
          <h3 className="text-sm font-bold text-white truncate">{vendor.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
              <MapPin className="w-2.5 h-2.5 text-[#00bfff]/60" />
              {distance ? `${distance} km` : "Nearby"}
            </span>
            <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
            <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
              <Clock className="w-2.5 h-2.5 text-zinc-600" />
              25–35 min
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Category Filter Pills ---
const CategoryPills = ({
  categories,
  active,
  onSelect,
}: {
  categories: string[];
  active: string;
  onSelect: (cat: string) => void;
}) => (
  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
    <button
      onClick={() => onSelect("all")}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 flex-shrink-0 ${active === "all"
        ? "bg-[#00bfff] text-black shadow-md shadow-[#00bfff]/20"
        : "bg-white/[0.05] text-zinc-400 border border-white/[0.06] hover:bg-white/[0.08]"
        }`}
    >
      All
    </button>
    {categories.map((cat) => (
      <button
        key={cat}
        onClick={() => onSelect(cat)}
        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 flex-shrink-0 capitalize ${active === cat
          ? "bg-[#00bfff] text-black shadow-md shadow-[#00bfff]/20"
          : "bg-white/[0.05] text-zinc-400 border border-white/[0.06] hover:bg-white/[0.08]"
          }`}
      >
        {cat}
      </button>
    ))}
  </div>
);

// --- Main Results Page ---
const ResultsPage = () => {
  const navigate = useNavigate();
  const { mood } = useMood();
  const { locations } = useLocationStorage();

  const userLocation = locations[0] || { lat: -3.37, lng: 36.7 };
  const initialReq = { mood: mood || "any", location: { lat: userLocation.lat, lng: userLocation.lng } };
  const cachedInitial = peekMoodResultsCache(initialReq);

  const [vendors, setVendors] = useState<Vendor[]>(cachedInitial?.vendors || []);
  const [items, setItems] = useState<MenuItem[]>(cachedInitial?.menuItems || []);
  const [loading, setLoading] = useState<boolean>(!cachedInitial);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(15);
  const [isFallback, setIsFallback] = useState(!!cachedInitial?.isFallback);

  useEffect(() => {
    const req = {
      mood: mood || "any",
      location: { lat: userLocation.lat, lng: userLocation.lng },
    };

    const peek = peekMoodResultsCache(req);
    if (peek) {
      setVendors(peek.vendors);
      setItems(peek.menuItems);
      setIsFallback(!!peek.isFallback);
      setLoading(false);
      // Silent revalidate in background without blocking UI
      fetchMoodResults(req, true).then((data) => {
        setVendors(data.vendors);
        setItems(data.menuItems);
        setIsFallback(!!data.isFallback);
      }).catch(() => {});
    } else {
      setLoading(true);
      fetchMoodResults(req).then((data) => {
        setVendors(data.vendors);
        setItems(data.menuItems);
        setIsFallback(!!data.isFallback);
      }).catch((err) => {
        console.error("Failed to load results:", err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [mood, userLocation.lat, userLocation.lng]);

  // Build a vendor name lookup
  const vendorNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    vendors.forEach((v) => {
      map[v.id] = v.name;
    });
    return map;
  }, [vendors]);

  // Build a vendor open status lookup
  const vendorOpenMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    vendors.forEach((v) => {
      map[v.id] = v.is_open !== false;
    });
    return map;
  }, [vendors]);

  // Get unique categories from items
  const categories = useMemo(() => {
    const cats = new Set(items.map((item) => item.category));
    return Array.from(cats).sort();
  }, [items]);

  // Reset pagination on category change
  useEffect(() => {
    setVisibleCount(15);
  }, [activeCategory]);

  // Filter items by category and search query
  const filteredAndSearchedItems = useMemo(() => {
    let result = items;
    if (activeCategory !== "all") {
      result = result.filter((item) => item.category === activeCategory);
    }
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          (item.description && item.description.toLowerCase().includes(search))
      );
    }
    return result;
  }, [items, activeCategory, searchTerm]);

  // Slice displayed items for performance/pagination optimization
  const displayedItems = useMemo(() => {
    return filteredAndSearchedItems.slice(0, visibleCount);
  }, [filteredAndSearchedItems, visibleCount]);

  // Sort vendors by open status, then distance
  const sortedVendors = useMemo(() => {
    return [...vendors].sort((a, b) => {
      if (a.is_open && !b.is_open) return -1;
      if (!a.is_open && b.is_open) return 1;
      const distA = a.geolocation ? getDistance(userLocation.lat, userLocation.lng, a.geolocation.lat, a.geolocation.lng) : 999;
      const distB = b.geolocation ? getDistance(userLocation.lat, userLocation.lng, b.geolocation.lat, b.geolocation.lng) : 999;
      return distA - distB;
    });
  }, [vendors, userLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] pb-28 text-zinc-100">
        {/* Header skeleton */}
        <div className="sticky top-0 z-30 bg-[#0a0a0b]/95 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl skeleton-shimmer bg-white/[0.04]" />
            <div className="space-y-1.5">
              <div className="h-2.5 w-12 rounded skeleton-shimmer bg-white/[0.04]" />
              <div className="h-4 w-28 rounded skeleton-shimmer bg-white/[0.04]" />
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 pt-5">
          {/* Category pills skeleton */}
          <div className="flex gap-2 mb-5 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-20 rounded-full skeleton-shimmer bg-white/[0.04] flex-shrink-0" />
            ))}
          </div>
          {/* Item skeletons */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] pb-28 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0b]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-lg mx-auto px-4 pt-3.5 pb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.06] hover:bg-white/[0.08] transition-all flex-shrink-0"
            >
              <ChevronLeft className="w-4.5 h-4.5 text-zinc-300" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-none mb-0.5">
                Results
              </p>
              <h1 className="text-base font-bold text-white tracking-tight leading-none capitalize truncate">
                {mood || "Discovery"}
                <span className="text-zinc-600 font-medium ml-1.5">mood</span>
              </h1>
            </div>
          </div>
          {filteredAndSearchedItems.length > 0 && (
            <div className="flex-shrink-0 bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-lg">
              <span className="text-[10px] font-bold text-zinc-400">
                {filteredAndSearchedItems.length} item{filteredAndSearchedItems.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Search Bar Row */}
        <div className="max-w-lg mx-auto px-4 pb-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 w-3.5 h-3.5 group-focus-within:text-[#00bfff] transition-colors" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(15);
              }}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-2 pl-9 pr-8 text-xs outline-none focus:border-[#00bfff]/30 focus:bg-white/[0.05] transition-all duration-300 placeholder-zinc-600 text-white"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setVisibleCount(15);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/[0.06] rounded-full text-zinc-500 hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        {items.length > 0 ? (
          <>
            {/* Fallback Notice Banner */}
            {isFallback && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-medium leading-relaxed">
                No items match your precise mood category, but here are some popular dishes available nearby!
              </div>
            )}

            {/* Category filter pills */}
            {categories.length > 1 && (
              <div className="mb-4">
                <CategoryPills
                  categories={categories}
                  active={activeCategory}
                  onSelect={setActiveCategory}
                />
              </div>
            )}

            {/* Vendors section */}
            {sortedVendors.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                    Nearby Vendors
                    <span className="text-zinc-600 font-medium ml-1.5">
                      ({sortedVendors.length})
                    </span>
                  </h2>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
                  {sortedVendors.map((vendor) => (
                    <VendorScrollCard
                      key={vendor.id}
                      vendor={vendor}
                      userLocation={userLocation}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Menu items grid header */}
            <div className="mb-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Menu Items
              </h2>
            </div>

            {/* Menu items grid */}
            {displayedItems.length > 0 ? (
              <div className="space-y-2.5">
                <AnimatePresence mode="popLayout">
                  {displayedItems.map((item, index) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      vendorName={vendorNameMap[item.vendor_id] || "Unknown vendor"}
                      index={index}
                      isVendorOpen={vendorOpenMap[item.vendor_id] !== false}
                    />
                  ))}
                </AnimatePresence>

                {/* Pagination / Load More Button */}
                {filteredAndSearchedItems.length > visibleCount && (
                  <div className="pt-4 pb-2 flex justify-center">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 15)}
                      className="px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-[#00bfff] text-zinc-400 text-xs font-semibold tracking-wide transition-all duration-300"
                    >
                      Load More Items ({filteredAndSearchedItems.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* No matching items from search/category */
              <div className="py-12 text-center bg-white/[0.01] border border-white/[0.04] rounded-xl">
                <p className="text-zinc-500 text-xs">No items match your search or filter</p>
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setVisibleCount(15);
                    }}
                    className="text-[#00bfff] text-[11px] font-semibold mt-2 hover:underline"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          /* Empty state - absolutely nothing nearby */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
              <ShoppingBag className="w-7 h-7 text-zinc-700" />
            </div>
            <p className="text-zinc-400 text-sm font-medium mb-1.5">
              No Food Vendors Found Nearby
            </p>
            <p className="text-zinc-600 text-xs mb-5">
              Try changing your delivery location to see available vendors.
            </p>
            <button
              onClick={() => navigate("/mood/location")}
              className="text-[#00bfff] text-xs font-bold uppercase tracking-wider hover:text-[#00a8e6] transition-colors"
            >
              Change Location
            </button>
          </motion.div>
        )}
      </div>

      <Navbar />
    </div>
  );
};

export default ResultsPage;