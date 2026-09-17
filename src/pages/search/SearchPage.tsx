import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Search as SearchIcon, X } from "lucide-react";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { useCartContext } from "../../context/cartContext";
import { fetchMoodResults } from "../mood/api/mood-api";
import { MenuItem, Vendor } from "../mood/types/types";
import { triggerAddToCartToast } from "../../components/my-components/AddToCartToast";
import RowList, { RowListItem } from "../../components/my-components/RowList";
import DropCard from "../../components/my-components/DropCard";
import Navbar from "../../components/my-components/navbar";
import { getDistance } from "../../lib/utils";
import posthog from "posthog-js";

const RECENT_SEARCHES_KEY = "sosika_recent_searches";
const MAX_RECENT = 6;

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const existing = loadRecentSearches().filter(
    (t) => t.toLowerCase() !== trimmed.toLowerCase()
  );
  const updated = [trimmed, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  return updated;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const { locations } = useLocationStorage();
  const { addToCart } = useCartContext();

  const userLocation = locations[0] || { lat: -3.37, lng: 36.7, address: "Arusha City" };

  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [results, setResults] = useState<{ items: MenuItem[]; vendors: Record<string, Vendor> }>({
    items: [],
    vendors: {},
  });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setRecent(loadRecentSearches());
    inputRef.current?.focus();
  }, []);

  const runSearch = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setResults({ items: [], vendors: {} });
        return;
      }
      setLoading(true);
      try {
        const res = await fetchMoodResults({ mood: term, location: userLocation });
        const vendorMap: Record<string, Vendor> = {};
        res.vendors.forEach((v) => (vendorMap[v.id] = v));
        setResults({ items: res.menuItems.slice(0, 30), vendors: vendorMap });
      } catch (err) {
        console.error("Search failed:", err);
        setResults({ items: [], vendors: {} });
      } finally {
        setLoading(false);
      }
    },
    [userLocation]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const commitSearch = (term: string) => {
    setQuery(term);
    setRecent(saveRecentSearch(term) ?? recent);
    posthog.capture("search_submitted", { query: term });
    runSearch(term);
  };

  const handleAdd = (item: MenuItem) => {
    addToCart({ ...item, quantity: 1 } as any);
    triggerAddToCartToast(item);
    posthog.capture("order_started", {
      platform: "app",
      item_id: item.id,
      item_name: item.name,
      source: "search_page",
    });
  };

  const rowItems: RowListItem[] = results.items.map((item) => {
    const vendor = results.vendors[item.vendor_id];
    const distance = vendor?.geolocation
      ? getDistance(userLocation.lat, userLocation.lng, vendor.geolocation.lat, vendor.geolocation.lng).toFixed(1)
      : null;
    return {
      id: item.id,
      thumbnail: item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : undefined,
      title: item.name,
      subtitle: vendor ? `${vendor.name}${distance ? ` · ${distance} km` : ""}` : undefined,
      trailing: (
        <>
          <span className="font-mono text-sm font-bold">{item.price}</span>
          <button
            type="button"
            aria-label={`Add ${item.name}`}
            onClick={(e) => {
              e.stopPropagation();
              handleAdd(item);
            }}
            className="w-8 h-8 rounded-full bg-sosika-cyan text-on-accent flex items-center justify-center text-lg font-bold active:scale-95 transition-transform"
          >
            +
          </button>
        </>
      ),
      onClick: vendor ? () => navigate(`/vendor/${vendor.id}/menu`) : undefined,
    };
  });

  return (
    <div className="min-h-screen bg-ground text-content pb-28">
      <div className="px-5 sm:px-6 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-[34px] h-[34px] rounded-xl bg-surface-3 flex items-center justify-center text-content-secondary"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 flex items-center gap-2.5 bg-surface-2 border border-sosika-cyan/35 rounded-[14px] px-3.5 py-3">
          <SearchIcon size={15} className="text-content-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitSearch(query)}
            placeholder="Search biryani, pizza, coffee…"
            className="flex-1 bg-transparent text-sm font-medium outline-none placeholder-content-faint"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search">
              <X size={14} className="text-content-muted" />
            </button>
          )}
        </div>
      </div>

      {query.trim() ? (
        <div className="px-5 sm:px-6">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-faint mb-2">
            Dishes
          </div>
          {loading ? (
            <div className="py-10 text-center text-sm text-content-muted">Searching…</div>
          ) : rowItems.length > 0 ? (
            <RowList items={rowItems} />
          ) : (
            <div className="py-10 text-center text-sm text-content-muted">
              Nothing matched "{query}" nearby yet.
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 sm:px-6 flex flex-col gap-6">
          <DropCard
            eyebrow="Drop"
            title="Friday Biryani pre-order"
            meta="5 kitchens taking orders"
            onClick={() => navigate("/biryani")}
          />

          <DropCard
            tone="neutral"
            eyebrow="Recipes"
            title="Cook it yourself tonight"
            meta="Tanzanian recipes, updated daily"
            onClick={() => navigate("/recipes")}
          />

          {recent.length > 0 && (
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-faint mb-3">
                Recent searches
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((term) => (
                  <motion.button
                    key={term}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => commitSearch(term)}
                    className="text-xs font-semibold text-content-secondary bg-surface-2 border border-edge-2 px-3.5 py-2 rounded-full"
                  >
                    {term}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Navbar />
    </div>
  );
}
