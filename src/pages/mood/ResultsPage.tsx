import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Wallet } from "lucide-react";

import { useMood } from "../../hooks/useMood";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { usePlatformConfig } from "../../hooks/usePlatformConfig";
import { useCartContext } from "../../context/cartContext";
import { useOrders } from "../../context/OrdersContext";
import posthog from "../../lib/posthog";

import Navbar from "../../components/my-components/navbar";
import CartSummaryBar from "../../components/my-components/CartSummaryBar";
import CartDrawer from "../../components/my-components/CartDrawer";

import {
  fetchMoodResults,
  peekMoodResultsCache,
  isPlatformNight,
  REOPENS_AT_LABEL,
  MoodResults,
} from "./api/mood-api";

import {
  scoreItems,
  dedupeByDish,
  buildSections,
  pickHero,
  normalizeDishName,
  DishGroup,
} from "./results/ranking";
import { deliveryCueFor } from "./results/deliveryEstimate";
import { useResultsFilters, SORT_LABELS } from "./results/useResultsFilters";
import ResultsHeader from "./results/ResultsHeader";
import ResultsSection from "./results/ResultsSection";
import DishGroupRow from "./results/DishGroupRow";
import HeroCard from "./results/HeroCard";
import VendorPickerSheet from "./results/VendorPickerSheet";
import FilterSheet from "./results/FilterSheet";
import SortSheet from "./results/SortSheet";
import ResultsSkeleton from "./results/ResultsSkeleton";
import FallbackState from "./results/FallbackState";
import ZeroResultState from "./results/ZeroResultState";
import LateNightState from "./results/LateNightState";
import { Eyebrow } from "./results/primitives";

const MOOD_SUGGESTIONS = ["Lunch", "Dinner", "Breakfast", "Drinks", "Snacks"];

const EMPTY_RESULTS: MoodResults = {
  vendors: [],
  menuItems: [],
  scores: {},
  recallIds: [],
  degraded: true,
};

/**
 * Mood results — a ranked, sectioned discovery screen.
 *
 * This page orchestrates; it does not rank. Ordering, reason wording, dish
 * grouping and section membership all come from `./results/ranking`, so there
 * is one place to answer "why is this here?".
 */
const ResultsPage = () => {
  const navigate = useNavigate();
  const { mood, setMood } = useMood();
  const { locations } = useLocationStorage();
  const platformConfig = usePlatformConfig();
  const { orders } = useOrders();

  const userLocation = useMemo(
    () => ({
      lat: locations[0]?.lat ?? -3.37,
      lng: locations[0]?.lng ?? 36.7,
    }),
    [locations]
  );

  // Peek the cache once, at mount — not on every render as the old page did.
  const [initialCache] = useState(() =>
    peekMoodResultsCache({ mood: mood || "any", location: userLocation })
  );

  const [results, setResults] = useState<MoodResults>(initialCache ?? EMPTY_RESULTS);
  const [loading, setLoading] = useState(!initialCache);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<DishGroup | null>(null);

  const {
    cart,
    cartTotal,
    deliveryFee,
    baseFee,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
    loading: cartLoading,
    selectedDeliveryOption,
    setSelectedDeliveryOption,
    calculatingFee,
    freeDeliveryUsesLeft,
    freeDeliveryResetDate,
  } = useCartContext();

  // --- Data ---------------------------------------------------------------

  useEffect(() => {
    const req = { mood: mood || "any", location: { lat: userLocation.lat, lng: userLocation.lng } };
    const cached = peekMoodResultsCache(req);

    if (cached) {
      setResults(cached);
      setLoading(false);
      // Revalidate quietly behind the rendered results.
      fetchMoodResults(req, true)
        .then(setResults)
        .catch(() => {});
      return;
    }

    setLoading(true);
    fetchMoodResults(req)
      .then(setResults)
      .catch((err) => console.error("Failed to load results:", err))
      .finally(() => setLoading(false));
  }, [mood, userLocation.lat, userLocation.lng]);

  // --- Ranking pipeline ---------------------------------------------------

  /** Dish -> how many past orders contained it. Drives "Order it again". */
  const orderedNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((order) => {
      (order.cart ?? []).forEach((line: { name?: unknown }) => {
        if (!line?.name) return;
        const key = normalizeDishName(String(line.name));
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });
    return counts;
  }, [orders]);

  const ranked = useMemo(
    () =>
      scoreItems(results.menuItems, results.vendors, {
        scores: results.scores,
        recallIds: results.recallIds,
        degraded: results.degraded,
        userLocation,
        orderedNameCounts,
        now: new Date(),
      }),
    [results, userLocation, orderedNameCounts]
  );

  const bounds = useMemo(() => {
    const prices = ranked.map((r) => r.price).filter((p) => p > 0);
    const distances = ranked
      .map((r) => r.distanceKm)
      .filter((d): d is number => d !== null);
    return {
      priceMin: prices.length ? Math.floor(Math.min(...prices) / 500) * 500 : 0,
      priceMax: prices.length ? Math.ceil(Math.max(...prices) / 500) * 500 : 50000,
      distanceMax: distances.length ? Math.max(...distances) : 10,
    };
  }, [ranked]);

  const filters = useResultsFilters(bounds);
  const { applied, sort } = filters;

  const filtered = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return ranked.filter((r) => {
      if (applied.openNow && !r.isOpen) return false;
      if (r.price > 0 && (r.price < applied.priceMin || r.price > applied.priceMax)) return false;
      if (applied.maxDistanceKm !== null) {
        if (r.distanceKm === null || r.distanceKm > applied.maxDistanceKm) return false;
      }
      if (applied.minRating > 0 && (r.bayesRating ?? 0) < applied.minRating) return false;
      if (applied.vendorIds.length > 0 && !applied.vendorIds.includes(r.item.vendor_id)) return false;
      if (search) {
        const haystack = `${r.item.name} ${r.item.description ?? ""} ${r.vendorName}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [ranked, applied, searchTerm]);

  const sorted = useMemo(() => {
    if (sort === "best") return filtered;
    const last = Number.POSITIVE_INFINITY;
    const copy = [...filtered];
    switch (sort) {
      case "fastest":
        return copy.sort((a, b) => (a.etaMin ?? last) - (b.etaMin ?? last));
      case "closest":
        return copy.sort((a, b) => (a.distanceKm ?? last) - (b.distanceKm ?? last));
      case "cheapest":
        return copy.sort((a, b) => a.price - b.price);
      case "rated":
        return copy.sort((a, b) => (b.bayesRating ?? -1) - (a.bayesRating ?? -1));
      default:
        return copy;
    }
  }, [filtered, sort]);

  const groups = useMemo(() => dedupeByDish(sorted), [sorted]);

  /**
   * Sections only make sense under the default ranking. An explicit sort or an
   * active search is a request for one ordered list, so the page gives one
   * rather than re-slicing the user's own ordering into buckets.
   */
  const isSectioned = sort === "best" && searchTerm.trim() === "";

  const hero = useMemo(() => (isSectioned ? pickHero(groups) : null), [groups, isSectioned]);

  const sections = useMemo(() => {
    if (!isSectioned) return [];
    const withoutHero = hero ? groups.filter((g) => g.key !== hero.key) : groups;
    return buildSections(withoutHero, { mood: mood || "food", orderedNameCounts });
  }, [groups, hero, isSectioned, mood, orderedNameCounts]);

  /**
   * The delivery cue is per-kitchen, not per-dish. When one kitchen supplies
   * half the screen, repeating "+3,400 delivery" down every row is noise, so
   * only the first row for each kitchen carries it.
   */
  const cueKeys = useMemo(() => {
    const rendered = isSectioned ? sections.flatMap((s) => s.groups) : groups;
    // The hero carries no cue of its own, so it doesn't claim its kitchen.
    const seenVendors = new Set<string>();
    const keys = new Set<string>();
    rendered.forEach((group) => {
      const vendorId = group.primary.item.vendor_id;
      if (seenVendors.has(vendorId)) return;
      seenVendors.add(vendorId);
      keys.add(group.key);
    });
    return keys;
  }, [isSectioned, sections, groups]);

  // --- Derived view helpers ----------------------------------------------

  const cartVendorIds = useMemo(
    () => new Set(cart.map((line) => line.vendor_id).filter(Boolean)),
    [cart]
  );
  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const filterableVendors = useMemo(() => {
    const seen = new Map<string, string>();
    ranked.forEach((r) => {
      if (!seen.has(r.item.vendor_id)) seen.set(r.item.vendor_id, r.vendorName);
    });
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [ranked]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (applied.openNow) {
      chips.push({ key: "openNow", label: "Open now", onClear: () => filters.clearOne("openNow") });
    }
    if (applied.priceMin > bounds.priceMin || applied.priceMax < bounds.priceMax) {
      chips.push({
        key: "price",
        label: `${applied.priceMin.toLocaleString()}–${applied.priceMax.toLocaleString()}`,
        onClear: filters.clearPriceBand,
      });
    }
    if (applied.maxDistanceKm !== null) {
      chips.push({
        key: "distance",
        label: `Within ${applied.maxDistanceKm.toFixed(1)} km`,
        onClear: () => filters.clearOne("maxDistanceKm"),
      });
    }
    if (applied.minRating > 0) {
      chips.push({
        key: "rating",
        label: `${applied.minRating}+`,
        onClear: () => filters.clearOne("minRating"),
      });
    }
    if (applied.vendorIds.length > 0) {
      chips.push({
        key: "vendors",
        label:
          applied.vendorIds.length === 1
            ? filterableVendors.find((v) => v.id === applied.vendorIds[0])?.name ?? "1 kitchen"
            : `${applied.vendorIds.length} kitchens`,
        onClear: () => filters.clearOne("vendorIds"),
      });
    }
    return chips;
  }, [applied, bounds, filters, filterableVendors]);

  const cueFor = (distanceKm: number | null) =>
    deliveryCueFor(distanceKm, platformConfig, freeDeliveryUsesLeft, new Date());

  const renderGroup = (group: DishGroup, sectionId: string) => (
    <DishGroupRow
      key={group.key}
      group={group}
      source={sectionId}
      cue={group.primary.isOpen && cueKeys.has(group.key) ? cueFor(group.primary.distanceKm) : null}
      sameKitchen={cartItemCount > 0 && cartVendorIds.has(group.primary.item.vendor_id)}
      opensAtLabel={
        sectionId === "later" && isPlatformNight() ? `Opens ${REOPENS_AT_LABEL}` : null
      }
      dimmed={sectionId === "broad" || sectionId === "later"}
      onExpand={(g) => {
        posthog.capture("dish_group_expanded", {
          platform: "app",
          dish: g.primary.item.name,
          kitchens: g.options.length,
          source: `results_page_${sectionId}`,
        });
        setExpandedGroup(g);
      }}
    />
  );

  // --- Screens ------------------------------------------------------------

  if (loading) return <ResultsSkeleton />;

  const locationLabel = locations[0]?.address?.split(",")[0]?.trim() || "Nearby";
  const nightShutdown = isPlatformNight() && ranked.length > 0 && ranked.every((r) => !r.isOpen);
  const noResultsAtAll = ranked.length === 0;
  const emptyAfterNarrowing = !noResultsAtAll && sorted.length === 0;
  const showingFallback = !nightShutdown && (noResultsAtAll || !!results.isFallback);

  // In the fallback state the list underneath is everything nearby, not
  // matches — counting it in the header would contradict the screen's own
  // headline. Nothing matched, so the count is zero.
  const headerCount = showingFallback ? 0 : sorted.length;

  let body: React.ReactNode;

  if (nightShutdown) {
    body = <LateNightState reopensAt={REOPENS_AT_LABEL} groups={groups.slice(0, 6)} />;
  } else if (showingFallback) {
    body = (
      <FallbackState
        mood={mood || "food"}
        neighbours={groups.slice(0, 3)}
        neighboursAreSemantic={!results.degraded}
        moodSuggestions={MOOD_SUGGESTIONS.filter(
          (m) => m.toLowerCase() !== (mood || "").toLowerCase()
        )}
        onPickMood={(next) => {
          posthog.capture("mood_selected", { mood: next, source: "results_fallback" });
          setMood(next);
        }}
        onBrowseAll={() => setMood("nearby")}
      />
    );
  } else if (emptyAfterNarrowing) {
    body = (
      <ZeroResultState
        searchTerm={searchTerm.trim()}
        hasFilters={filters.activeCount > 0}
        onClearFilters={filters.clearAll}
        onClearSearch={() => setSearchTerm("")}
      />
    );
  } else if (!isSectioned) {
    body = (
      <ResultsSection title={searchTerm.trim() ? "Results" : SORT_LABELS[sort]}>
        {groups.map((group) => renderGroup(group, "list"))}
      </ResultsSection>
    );
  } else {
    body = (
      <>
        {hero && (
          <div>
            <div className="mb-2.5">
              <Eyebrow>Top pick</Eyebrow>
            </div>
            <HeroCard ranked={hero.primary} />
          </div>
        )}

        {sections.map((section) => (
          <ResultsSection
            key={section.id}
            title={section.title}
            variant={section.variant}
            icon={
              section.id === "budget" ? (
                <Wallet className="w-3 h-3 text-amber-ink" />
              ) : section.id === "later" ? (
                <Moon className="w-3 h-3 text-content-faint" />
              ) : undefined
            }
          >
            {section.groups.map((group) => renderGroup(group, section.id))}
          </ResultsSection>
        ))}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-ground pb-28 text-content-secondary">
      <ResultsHeader
        mood={mood}
        locationLabel={locationLabel}
        resultCount={headerCount}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeFilterCount={filters.activeCount}
        onOpenFilters={() => {
          filters.openDraft();
          setFilterOpen(true);
        }}
        onOpenSort={() => setSortOpen(true)}
        sort={sort}
        activeChips={activeChips}
        onBack={() => navigate(-1)}
      />

      <div className="max-w-md mx-auto px-5 pt-[18px] flex flex-col gap-7">{body}</div>

      {cartItemCount > 0 && (
        <CartSummaryBar
          label={`${cartItemCount} item${cartItemCount !== 1 ? "s" : ""} in cart`}
          total={cartTotal}
          onClick={() => setIsCartOpen(true)}
        />
      )}

      <Navbar />

      <VendorPickerSheet group={expandedGroup} onClose={() => setExpandedGroup(null)} />

      <FilterSheet
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        draft={filters.draft}
        setDraft={filters.setDraft}
        bounds={bounds}
        vendors={filterableVendors}
        draftActiveCount={filters.draftActiveCount}
        onApply={() => {
          filters.apply();
          setFilterOpen(false);
          posthog.capture("results_filter_applied", {
            platform: "app",
            active_count: filters.draftActiveCount,
            mood: mood || "any",
          });
        }}
        onReset={filters.reset}
      />

      <SortSheet
        isOpen={sortOpen}
        onClose={() => setSortOpen(false)}
        value={sort}
        onChange={(next) => {
          filters.setSort(next);
          posthog.capture("results_sort_changed", {
            platform: "app",
            sort: next,
            mood: mood || "any",
          });
        }}
        mood={mood}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        cartTotal={cartTotal}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
        checkout={checkout}
        loading={cartLoading}
        deliveryFee={deliveryFee}
        baseFee={baseFee}
        updateQuantity={updateQuantity}
        selectedDeliveryOption={selectedDeliveryOption}
        setSelectedDeliveryOption={setSelectedDeliveryOption}
        calculatingFee={calculatingFee}
        freeDeliveryUsesLeft={freeDeliveryUsesLeft}
        freeDeliveryResetDate={freeDeliveryResetDate}
      />
    </div>
  );
};

export default ResultsPage;
