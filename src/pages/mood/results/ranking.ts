import { MenuItem, Vendor } from "../types/types";
import { getDistance } from "../../../lib/utils";

/**
 * Ranking for the mood results screen.
 *
 * Everything that decides *what order results appear in* and *what the row
 * says about itself* lives here, as pure functions. Components render what
 * this module returns; they never compute a score of their own.
 *
 * The rule the whole file serves: never show a number the system cannot
 * actually compute. A missing distance yields a null ETA, and callers render
 * nothing rather than a guess.
 */

// --- Tunables -------------------------------------------------------------

export const WEIGHTS = {
  relevance: 0.4,
  availability: 0.2,
  proximity: 0.15,
  social: 0.1,
  history: 0.1,
  freshness: 0.05,
} as const;

export type Term = keyof typeof WEIGHTS;

/** Beyond this, everything is equally "far" for ranking purposes. */
const PROXIMITY_CEILING_KM = 5;
/** Assumed door-to-door speed for a boda in town. */
const AVG_SPEED_KMH = 18;
/** Flat kitchen prep allowance folded into every ETA. */
const PREP_BUFFER_MIN = 12;
/** Bayesian rating prior: pretend every kitchen starts with C reviews at m. */
const RATING_PRIOR_MEAN = 4.3;
const RATING_PRIOR_WEIGHT = 5;
/** A row only earns a reason chip when one term clearly dominates. */
const REASON_DOMINANCE_FLOOR = 0.3;
/** "Fast & close" means genuinely close. */
export const FAST_RADIUS_KM = 1.5;
/** A section has to earn its heading. */
const MIN_SECTION_SIZE = 3;

export type Confidence = "strong" | "broad";

export interface RankedItem {
  item: MenuItem;
  vendor?: Vendor;
  vendorName: string;
  score: number;
  breakdown: Record<Term, number>;
  reason: string | null;
  confidence: Confidence;
  distanceKm: number | null;
  etaMin: number | null;
  isOpen: boolean;
  isAvailable: boolean;
  price: number;
  bayesRating: number | null;
}

export interface ScoringContext {
  scores: Record<string, number>;
  recallIds: string[];
  degraded: boolean;
  userLocation: { lat: number; lng: number };
  /** Normalised dish name -> how many past orders contained it. */
  orderedNameCounts: Map<string, number>;
  now: Date;
}

// --- Small shared helpers -------------------------------------------------

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export const normalizeDishName = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const parsePrice = (price: string | number): number => {
  const n = typeof price === "number" ? price : Number(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Minutes door-to-door, or null when we don't know how far away the kitchen is. */
export const etaFromDistance = (km: number | null): number | null => {
  if (km === null) return null;
  return Math.round((km / AVG_SPEED_KMH) * 60) + PREP_BUFFER_MIN;
};

export const formatDistance = (km: number | null): string | null => {
  if (km === null) return null;
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
};

/**
 * Rating smoothed towards a prior, so one 5-star review doesn't outrank forty
 * 4.6s. Returns null with no reviews at all — vendor onboarding seeds
 * `averageRating: 5, ratingCount: 0`, which would otherwise read as perfect.
 */
export const bayesianRating = (average?: number, count?: number): number | null => {
  if (!count || count <= 0 || typeof average !== "number") return null;
  return (RATING_PRIOR_WEIGHT * RATING_PRIOR_MEAN + average * count) / (RATING_PRIOR_WEIGHT + count);
};

/** Which categories belong to which part of the day. Absent = always fine. */
const MEAL_WINDOWS: Record<string, [number, number]> = {
  breakfast: [5, 11],
  lunch: [11, 16],
  dinner: [16, 22],
};

const freshnessFor = (category: string, hour: number): number => {
  const window = MEAL_WINDOWS[String(category).toLowerCase()];
  if (!window) return 0.6;
  return hour >= window[0] && hour < window[1] ? 1 : 0.3;
};

// --- Scoring --------------------------------------------------------------

/**
 * Turns raw menu items into ranked, self-describing rows, best first.
 */
export function scoreItems(
  items: MenuItem[],
  vendors: Vendor[],
  ctx: ScoringContext
): RankedItem[] {
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const recallSet = new Set(ctx.recallIds);
  const hour = ctx.now.getHours();

  // Cosine similarities cluster tightly (0.5–0.9), so spread them across the
  // result set — otherwise relevance barely separates anything.
  const present = items.map((i) => ctx.scores[i.id]).filter((s): s is number => typeof s === "number");
  const minScore = present.length ? Math.min(...present) : 0;
  const maxScore = present.length ? Math.max(...present) : 0;
  const spread = maxScore - minScore;

  const relevanceFor = (item: MenuItem, index: number): number => {
    const raw = ctx.scores[item.id];
    if (typeof raw === "number") {
      return spread > 0 ? (raw - minScore) / spread : 0.5;
    }
    // No semantic signal: fall back to the position the API already gave us.
    if (items.length <= 1) return 0.5;
    return 1 - index / (items.length - 1);
  };

  const ranked = items.map((item, index) => {
    const vendor = vendorById.get(item.vendor_id);
    const isAvailable = item.is_available !== false;
    const isOpen = vendor ? vendor.is_open !== false : false;

    const distanceKm = vendor?.geolocation
      ? getDistance(ctx.userLocation.lat, ctx.userLocation.lng, vendor.geolocation.lat, vendor.geolocation.lng)
      : null;

    const bayesRating =
      bayesianRating(item.averageRating, item.ratingCount) ??
      bayesianRating(vendor?.averageRating, vendor?.ratingCount);

    const historyCount = ctx.orderedNameCounts.get(normalizeDishName(item.name)) ?? 0;

    const breakdown: Record<Term, number> = {
      relevance: relevanceFor(item, index),
      // A closed kitchen is demoted hard, never removed.
      availability: !isAvailable ? 0 : isOpen ? 1 : 0.15,
      proximity: distanceKm === null ? 0.4 : clamp01(1 - Math.min(distanceKm, PROXIMITY_CEILING_KM) / PROXIMITY_CEILING_KM),
      social: bayesRating === null ? 0 : clamp01((bayesRating - 3) / 2),
      history: historyCount >= 3 ? 1 : historyCount === 2 ? 0.8 : historyCount === 1 ? 0.6 : 0,
      freshness: freshnessFor(item.category, hour),
    };

    const score = (Object.keys(WEIGHTS) as Term[]).reduce(
      (sum, term) => sum + WEIGHTS[term] * breakdown[term],
      0
    );

    return {
      item,
      vendor,
      vendorName: vendor?.name ?? "Unknown vendor",
      score,
      breakdown,
      reason: null as string | null,
      confidence: (recallSet.has(item.id) ? "broad" : "strong") as Confidence,
      distanceKm,
      etaMin: etaFromDistance(distanceKm),
      isOpen,
      isAvailable,
      price: parsePrice(item.price),
      bayesRating,
    } satisfies RankedItem;
  });

  ranked.sort((a, b) => b.score - a.score);
  return assignReasons(ranked, ctx.degraded);
}

/**
 * Gives each row at most one reason chip, drawn from a fixed vocabulary.
 * "Closest open kitchen" needs to know about the whole set, which is why this
 * runs as a second pass rather than inside the per-item map.
 */
export function assignReasons(ranked: RankedItem[], degraded = false): RankedItem[] {
  let closestOpenId: string | null = null;
  let closestDistance = Infinity;
  for (const r of ranked) {
    if (r.isOpen && r.isAvailable && r.distanceKm !== null && r.distanceKm < closestDistance) {
      closestDistance = r.distanceKm;
      closestOpenId = r.item.id;
    }
  }

  return ranked.map((r) => {
    if (r.score <= 0) return r;

    const contributions = (Object.keys(WEIGHTS) as Term[]).map((term) => ({
      term,
      value: WEIGHTS[term] * r.breakdown[term],
    }));
    contributions.sort((a, b) => b.value - a.value);
    const dominant = contributions[0];

    if (dominant.value / r.score < REASON_DOMINANCE_FLOOR) return r;

    let reason: string | null = null;
    switch (dominant.term) {
      case "relevance":
        // With no semantic signal, "relevance" is just the order the API
        // happened to return — saying "matches your mood" about that would
        // stamp the same chip on every row and mean nothing. And even with a
        // real signal, only a genuinely strong match earns the claim.
        reason = !degraded && r.breakdown.relevance >= 0.8 ? "Matches your mood" : null;
        break;
      case "history":
        reason = r.breakdown.history >= 0.8 ? "You order this often" : "You ordered this before";
        break;
      case "proximity": {
        if (r.item.id === closestOpenId) {
          reason = "Closest open kitchen";
        } else if (r.etaMin !== null) {
          reason = `${r.etaMin} min · ${formatDistance(r.distanceKm)} away`;
        }
        break;
      }
      case "social":
        reason = (r.item.ratingCount ?? 0) >= 10 ? "Popular this week" : "Highest rated nearby";
        break;
      default:
        // availability and freshness are table stakes, not a selling point.
        reason = null;
    }

    return { ...r, reason };
  });
}

// --- Dish grouping --------------------------------------------------------

export interface DishGroup {
  key: string;
  /** Best-ranked vendor for this dish — what the collapsed row shows. */
  primary: RankedItem;
  /** Every vendor selling it, cheapest first. Length 1 means no picker. */
  options: RankedItem[];
  fromPrice: number;
}

/**
 * Collapses the same dish sold by several kitchens into one entry. A single
 * kitchen keeps a plain row — never imply a choice that isn't there.
 *
 * Groups come back in the order their best member appeared, so whatever
 * ordering the caller applied (the composite score, or an explicit sort the
 * user picked) survives grouping intact.
 */
export function dedupeByDish(ranked: RankedItem[]): DishGroup[] {
  const byKey = new Map<string, RankedItem[]>();
  for (const r of ranked) {
    const key = normalizeDishName(r.item.name);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(r);
    else byKey.set(key, [r]);
  }

  const groups: DishGroup[] = [];
  // Map preserves insertion order, which is the caller's ordering.
  byKey.forEach((members, key) => {
    // A kitchen can list the same dish twice (different sizes, duplicate
    // entries). The picker counts kitchens, not listings, so keep one row per
    // vendor — the cheapest — or the sheet offers the same choice twice.
    const cheapestPerVendor = new Map<string, RankedItem>();
    for (const member of members) {
      const current = cheapestPerVendor.get(member.item.vendor_id);
      if (!current || member.price < current.price) {
        cheapestPerVendor.set(member.item.vendor_id, member);
      }
    }

    const options = Array.from(cheapestPerVendor.values()).sort((a, b) => a.price - b.price);
    groups.push({
      key,
      primary: members[0], // the best-placed member under the current ordering
      options,
      fromPrice: options[0].price,
    });
  });

  return groups;
}

// --- Sections -------------------------------------------------------------

export type SectionId = "again" | "fast" | "popular" | "budget" | "more" | "broad" | "later";

export interface Section {
  id: SectionId;
  /** Eyebrow label, already interpolated. */
  title: string;
  groups: DishGroup[];
  /** The lower-confidence tier renders as a labelled divider, not an eyebrow. */
  variant: "eyebrow" | "divider";
}

export interface SectionContext {
  mood: string;
  orderedNameCounts: Map<string, number>;
}

/** 40th percentile of the set, rounded down to a round TZS figure. */
function budgetBand(groups: DishGroup[]): number | null {
  const prices = groups.map((g) => g.fromPrice).filter((p) => p > 0).sort((a, b) => a - b);
  if (prices.length < MIN_SECTION_SIZE * 2) return null;
  const raw = prices[Math.floor(prices.length * 0.4)];
  const band = Math.floor(raw / 500) * 500;
  return band > prices[0] ? band : null;
}

/**
 * Splits ranked dish groups into the intent sections the design specifies.
 *
 * Rules: a section needs MIN_SECTION_SIZE entries or it dissolves back into
 * "More", no group appears twice, and closed kitchens always collect at the
 * bottom rather than being scattered through the list at half opacity.
 */
export function buildSections(groups: DishGroup[], ctx: SectionContext): Section[] {
  const closed: DishGroup[] = [];
  const broad: DishGroup[] = [];
  const open: DishGroup[] = [];

  for (const g of groups) {
    if (!g.primary.isOpen) closed.push(g);
    else if (g.primary.confidence === "broad") broad.push(g);
    else open.push(g);
  }

  const band = budgetBand(open);

  const buckets: Record<"again" | "fast" | "popular" | "budget", DishGroup[]> = {
    again: [],
    fast: [],
    popular: [],
    budget: [],
  };
  const remainder: DishGroup[] = [];

  for (const g of open) {
    const name = normalizeDishName(g.primary.item.name);
    if (ctx.orderedNameCounts.has(name)) {
      buckets.again.push(g);
    } else if (g.primary.distanceKm !== null && g.primary.distanceKm <= FAST_RADIUS_KM) {
      buckets.fast.push(g);
    } else if ((g.primary.item.ratingCount ?? 0) >= 3) {
      buckets.popular.push(g);
    } else if (band !== null && g.fromPrice > 0 && g.fromPrice <= band) {
      buckets.budget.push(g);
    } else {
      remainder.push(g);
    }
  }

  buckets.fast.sort((a, b) => (a.primary.distanceKm ?? 0) - (b.primary.distanceKm ?? 0));
  buckets.popular.sort((a, b) => (b.primary.bayesRating ?? 0) - (a.primary.bayesRating ?? 0));
  buckets.budget.sort((a, b) => a.fromPrice - b.fromPrice);

  const sections: Section[] = [];
  const push = (id: SectionId, title: string, entries: DishGroup[], variant: Section["variant"] = "eyebrow") => {
    if (entries.length > 0) sections.push({ id, title, groups: entries, variant });
  };

  const claim = (entries: DishGroup[]): DishGroup[] => {
    if (entries.length >= MIN_SECTION_SIZE) return entries;
    remainder.push(...entries);
    return [];
  };

  push("again", "Order it again", claim(buckets.again));
  push("fast", "Fast & close", claim(buckets.fast));
  push("popular", "Popular nearby", claim(buckets.popular));
  if (band !== null) push("budget", `Under ${band.toLocaleString()}`, claim(buckets.budget));
  else remainder.push(...buckets.budget);

  remainder.sort((a, b) => b.primary.score - a.primary.score);
  push("more", `More ${ctx.mood || "food"}`, remainder);

  // The lower-confidence tier is named as a guess, so its rows can keep
  // near-normal contrast instead of being dimmed into looking broken.
  push("broad", `Also matched "${ctx.mood}"`, broad, "divider");
  push("later", "Opens later", closed);

  return sections;
}

/** The hero: best-ranked row that a user can actually order right now. */
export function pickHero(groups: DishGroup[]): DishGroup | null {
  return groups.find((g) => g.primary.isOpen && g.primary.isAvailable && g.primary.confidence === "strong") ?? null;
}
