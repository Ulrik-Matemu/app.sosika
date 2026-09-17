import { db } from "../../../firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { Vendor, MenuItem } from "../types/types";
import { semanticSearchMenuItems } from "../../../services/workerApi";

// Moods that are category buckets rather than free-text cravings — there's
// no meaningful embedding for "nearby" or "any", so skip the semantic call.
const NON_SEMANTIC_MOODS = new Set(["nearby", "any"]);
const SEMANTIC_TIMEOUT_MS = 4000;
const SEMANTIC_RECALL_SCORE_THRESHOLD = 0.55;
const MAX_SEMANTIC_CANDIDATES = 500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("semantic search timed out")), ms)),
  ]);
}

// What a semantic pass produced: the ordered items, the per-item similarity
// scores behind that order, and which items only exist in the list because
// the embedding pulled them in (the lower-confidence "broader guesses" tier).
export interface SemanticRanking {
  items: MenuItem[];
  scores: Record<string, number>;
  recallIds: string[];
  degraded: boolean;
}

const degradedRanking = (items: MenuItem[]): SemanticRanking => ({
  items,
  scores: {},
  recallIds: [],
  degraded: true,
});

// Re-ranks (and, for true keyword misses, expands) the existing
// category/keyword match against a semantic similarity signal. Never
// removes an existing match — on any failure/timeout/quota exhaustion it
// returns the input unchanged, so search degrades to exactly today's
// keyword behavior rather than breaking.
async function applySemanticRanking(
  mood: string,
  mergedItems: MenuItem[],
  allNearbyItems: MenuItem[]
): Promise<SemanticRanking> {
  if (NON_SEMANTIC_MOODS.has(mood.toLowerCase())) return degradedRanking(mergedItems);
  if (allNearbyItems.length === 0) return degradedRanking(mergedItems);

  try {
    const candidateItemIds = allNearbyItems.slice(0, MAX_SEMANTIC_CANDIDATES).map((i) => i.id);
    const res = await withTimeout(
      semanticSearchMenuItems({ query: mood, candidateItemIds }),
      SEMANTIC_TIMEOUT_MS
    );
    const { degraded, ranked } = res;
    if (degraded || ranked.length === 0) return degradedRanking(mergedItems);

    const scoreMap = new Map(ranked.map((r) => [r.id, r.score]));
    const mergedIds = new Set(mergedItems.map((i) => i.id));

    // Recall boost: pull in items the keyword/category pass missed but the
    // embedding considers a strong match (catches typos, Swahili/English
    // code-switching, and synonyms the hardcoded mood map doesn't know).
    const recallAdditions = allNearbyItems.filter(
      (item) => !mergedIds.has(item.id) && (scoreMap.get(item.id) ?? 0) >= SEMANTIC_RECALL_SCORE_THRESHOLD
    );

    const combined = [...mergedItems, ...recallAdditions];
    const items = combined
      .map((item, idx) => ({ item, idx, score: scoreMap.get(item.id) ?? -1 }))
      .sort((a, b) => b.score - a.score || a.idx - b.idx)
      .map((entry) => entry.item);

    const scores: Record<string, number> = {};
    items.forEach((item) => {
      const score = scoreMap.get(item.id);
      if (score !== undefined) scores[item.id] = score;
    });

    return {
      items,
      scores,
      recallIds: recallAdditions.map((item) => item.id),
      degraded: false,
    };
  } catch (err) {
    console.warn("[applySemanticRanking] Falling back to keyword results:", err);
    return degradedRanking(mergedItems);
  }
}

// The platform-wide overnight shutter. Every vendor reads as closed inside it
// regardless of their own is_open flag, and checkout is blocked too
// (see useCart). It is the only opening time the app actually knows — per-vendor
// hours are a free-text field vendors type by hand.
export const NIGHT_CLOSE_HOUR = 22;
export const NIGHT_OPEN_HOUR = 6;
export const REOPENS_AT_LABEL = "06:00";

export const isPlatformNight = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  return hour >= NIGHT_CLOSE_HOUR || hour < NIGHT_OPEN_HOUR;
};

export interface UserRequest {
  mood: string;
  location: { lat: number; lng: number };
}

export interface MoodResults {
  vendors: Vendor[];
  menuItems: MenuItem[];
  isFallback?: boolean;
  /** itemId -> cosine similarity (0..1) against the mood. Empty when degraded. */
  scores: Record<string, number>;
  /** Items the keyword/category pass missed — the lower-confidence tier. */
  recallIds: string[];
  /** True when no semantic signal was available for this result set. */
  degraded: boolean;
}

export const calculateDistance = (a: any, b: any) => {
  const latA = parseFloat(a?.lat);
  const lngA = parseFloat(a?.lng);
  const latB = parseFloat(b?.lat);
  const lngB = parseFloat(b?.lng);
  
  if (isNaN(latA) || isNaN(lngA) || isNaN(latB) || isNaN(lngB)) {
    return 0;
  }

  const R = 6371; // km
  const dLat = (latB - latA) * (Math.PI / 180);
  const dLng = (lngB - lngA) * (Math.PI / 180);
  const aVal =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(latA * (Math.PI / 180)) *
      Math.cos(latB * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
};

export const fetchVendorGeolocation = async (vendorId: string): Promise<{ lat: number; lng: number } | null> => {
  const vendorRef = doc(db, "vendors", vendorId);
  const vendorSnap = await getDoc(vendorRef);

  if (!vendorSnap.exists()) {
    console.warn(`Vendor with ID ${vendorId} not found.`);
    return null;
  }

  const vendorData = vendorSnap.data() as any; 
  
  // Support both root-level and nested listing_data geolocations.
  // We bypass isApproved and isOpen gates here because the physical location 
  // is static and needed to compute delivery fees for active/past carts 
  // even if the vendor's operational status changes.
  return vendorData.geolocation || vendorData.listing_data?.geolocation || null;
};

// Map user mood to menu item categories
const mapMoodToCategories = (mood: string): string[] => {
  const moodLower = mood.toLowerCase();
  
  const moodMap: Record<string, string[]> = {
    breakfast: ["breakfast", "sandwiches"],
    lunch: ["lunch", "dinner", "salads", "pizza", "burgers", "mains", "sides", "sandwiches", "Special Order"],
    dinner: ["dinner", "lunch", "salads", "pizza", "burgers", "mains", "sides", "Special Order"],
    drink: ["drinks"],
    drinks: ["drinks"],
    specialorder: ["Special Order"],
    snack: ["snacks"],
    snacks: ["snacks"],
    burger: ["burgers", "burger"],
    burgers: ["burgers", "burgers"],
    salad: ["salads"],
    salads: ["salads"],
    sandwiches: ["sandwiches"],
    mains: ["mains"],
    sides: ["sides"],
    nearby: ["breakfast", "lunch", "dinner", "drinks", "snacks", "starters", "burgers", "salads", "pizza", "mains", "sides", "sandwiches", "Special Order"],
    any: ["breakfast", "lunch", "dinner", "drinks", "snacks", "starters", "burgers", "salads", "pizza", "mains", "sides", "sandwiches", "Special Order"],
    bites: ["snacks", "starters", "bites"],
    softdrink: ["drinks", "soft drinks"],
    chicken: ["chicken"],
    swahili: ["swahili"],
    dessert: ["dessert"],
    coffee: ["coffee"],
    milkshakes: ["milkshakes"],
    mocktail: ["mocktails"],
    signaturecocktail: ["cocktails"],
    beers: ["beers"],
    cognac: ["cognac/brandy"],
    whiskey: ["whiskey"],
    whitewine: ["white wine"],
    soups: ["soups"],
    starters: ["starters"],
    vegeterian: ["vegetarian"],
    wraps: ["wraps"],
  };
  
  return moodMap[moodLower] || [moodLower];
};

const moodCacheMap = new Map<string, { data: MoodResults; timestamp: number }>();
const vendorMenuCacheMap = new Map<string, { data: { vendor: Vendor; menuItems: MenuItem[] }; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache lifetime

export const peekMoodResultsCache = (req: UserRequest): MoodResults | null => {
  const cacheKey = `${req.mood.toLowerCase()}_${req.location.lat.toFixed(3)}_${req.location.lng.toFixed(3)}`;
  const cached = moodCacheMap.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  // Fallback: search for any cache matching mood regardless of minor GPS shift
  for (const [key, value] of moodCacheMap.entries()) {
    if (key.startsWith(`${req.mood.toLowerCase()}_`) && Date.now() - value.timestamp < CACHE_TTL_MS) {
      return value.data;
    }
  }
  return null;
};

export const fetchMoodResults = async (req: UserRequest, forceRefresh = false): Promise<MoodResults> => {
  const cacheKey = `${req.mood.toLowerCase()}_${req.location.lat.toFixed(3)}_${req.location.lng.toFixed(3)}`;
  const cached = moodCacheMap.get(cacheKey);

  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 1. Fetch all vendors from Firestore
  const vendorsCollection = collection(db, "vendors");
  const vendorSnapshot = await getDocs(vendorsCollection);
  
  // Transform and filter vendors instantly based on verification state AND operational channel visibility status
  const allVendors: Vendor[] = vendorSnapshot.docs
    .map(doc => {
      const data = doc.data() as any;
      const isNightClosed = isPlatformNight();
      
      const is_open = isNightClosed ? false : (data.is_open === true);
      const listing_data = data.listing_data ? {
        ...data.listing_data,
        is_open: isNightClosed ? false : (data.listing_data.is_open === true)
      } : undefined;

      return {
        id: doc.id,
        ...data,
        is_open,
        ...(listing_data ? { listing_data } : {})
      } as any;
    })
    .filter(vendor => {
      // 1st Gate: Must be approved by system administration
      const approvedCheck = vendor.is_approved === true || vendor.auth_info?.is_approved === true;
      
      // 2nd Gate: Channel must be explicitly opened by the merchant (or it is nighttime closed, so they show up as Closed)
      const isNightClosed = isPlatformNight();
      const openCheck = isNightClosed ? true : (vendor.is_open === true || vendor.listing_data?.is_open === true);
      
      return approvedCheck && openCheck;
    });

  // 2. Filter vendors by location proximity (100 km radius limit)
  const nearbyVendors = allVendors.filter(v => calculateDistance(v.geolocation, req.location) < 100);
  
  if (nearbyVendors.length === 0) {
    return { vendors: [], menuItems: [], scores: {}, recallIds: [], degraded: true };
  }

  // 3. Get valid categories for this mood
  const validCategories = mapMoodToCategories(req.mood);

  // 3.5 Keyword injection match enhancement logic
  const keyword = req.mood.toLowerCase();
  if (!validCategories.includes(keyword)) {
    validCategories.push(keyword);
  }

  // 4. Fetch menu items for nearby authorized vendors
  const nearbyVendorIds = nearbyVendors.map(v => v.id);

  if (nearbyVendorIds.length === 0) {
      return { vendors: nearbyVendors, menuItems: [], scores: {}, recallIds: [], degraded: true };
  }

  const menuItemsCollection = collection(db, "menuItems");
  let itemsFromVendors: MenuItem[] = [];

  // Parallelized chunking queries using Promise.all for 75%+ faster response time
  const CHUNK_SIZE = 10;
  const chunkPromises = [];
  for (let i = 0; i < nearbyVendorIds.length; i += CHUNK_SIZE) {
      const chunk = nearbyVendorIds.slice(i, i + CHUNK_SIZE);
      if (chunk.length > 0) {
          const q = query(menuItemsCollection, where("vendor_id", "in", chunk));
          chunkPromises.push(getDocs(q));
      }
  }

  const chunkSnapshots = await Promise.all(chunkPromises);
  chunkSnapshots.forEach(querySnapshot => {
      querySnapshot.forEach(doc => {
          itemsFromVendors.push({ id: doc.id, ...doc.data() } as MenuItem);
      });
  });

  // Filter items by category client-side
  const filteredItems = itemsFromVendors.filter(item => validCategories.includes(item.category));

  // 3.6 String parsing filtering matching lookup vector algorithms
  const keywordItems = itemsFromVendors.filter(item => item.name.toLowerCase().includes(keyword));

  // Merge and deduplicate records safely inside cache array
  const filteredIds = new Set(filteredItems.map(item => item.id));
  const mergedItems = [...filteredItems, ...keywordItems.filter(item => !filteredIds.has(item.id))];

  const ranking = await applySemanticRanking(req.mood, mergedItems, itemsFromVendors);

  // Nothing matched the mood at all — fall back to everything nearby, and drop
  // the semantic metadata with it: those scores describe a different list.
  const result: MoodResults = ranking.items.length === 0
    ? {
        vendors: nearbyVendors,
        menuItems: itemsFromVendors,
        isFallback: true,
        scores: {},
        recallIds: [],
        degraded: true,
      }
    : {
        vendors: nearbyVendors,
        menuItems: ranking.items,
        isFallback: false,
        scores: ranking.scores,
        recallIds: ranking.recallIds,
        degraded: ranking.degraded,
      };

  moodCacheMap.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
};

export const fetchVendorMenu = async (vendorId: string, forceRefresh = false): Promise<{ vendor: Vendor; menuItems: MenuItem[] }> => {
  const cached = vendorMenuCacheMap.get(vendorId);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 1. Fetch the vendor details
  const vendorRef = doc(db, "vendors", vendorId);
  const vendorSnap = await getDoc(vendorRef);

  if (!vendorSnap.exists()) {
    throw new Error("Vendor not found");
  }

  const data = vendorSnap.data() as any;
  const isNightClosed = isPlatformNight();
  
  const is_open = isNightClosed ? false : (data.is_open === true);
  const listing_data = data.listing_data ? {
    ...data.listing_data,
    is_open: isNightClosed ? false : (data.listing_data.is_open === true)
  } : undefined;

  const vendor = {
    id: vendorSnap.id,
    ...data,
    is_open,
    ...(listing_data ? { listing_data } : {})
  } as any;

  // Protect standalone page requests from showing unapproved vendors
  const isApproved = vendor.is_approved ?? vendor.auth_info?.is_approved ?? false;
  if (!isApproved) {
    throw new Error("This vendor spot has not been verified yet.");
  }

  // 2. Fetch all menu items for that vendor
  const menuItemsCollection = collection(db, "menuItems");
  const q = query(menuItemsCollection, where("vendor_id", "==", vendorId));
  const querySnapshot = await getDocs(q);
  
  const menuItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
  const resData = { vendor, menuItems };

  vendorMenuCacheMap.set(vendorId, { data: resData, timestamp: Date.now() });
  return resData;
};