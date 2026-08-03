import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  limit,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, functions, httpsCallable } from "../firebase";
import { Recipe, RecipeSubmissionInput, VendorMinimal, RecipeGenerationLog } from "../types/recipe";

// Helper to convert title to slug
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

// Starter fallback recipes for demonstration if DB is empty
export const STARTER_RECIPES: Recipe[] = [
  {
    id: "starter-1",
    title: "Zanzibari Chicken Biryani",
    titleLower: "zanzibari chicken biryani",
    slug: "zanzibari-chicken-biryani",
    country: "Tanzania",
    subcategory: "Zanzibari",
    tags: ["spicy", "celebration", "dinner", "rice"],
    ingredients: [
      { id: "i1", name: "Basmati Rice", amount: "2 cups" },
      { id: "i2", name: "Chicken", amount: "1 kg (cut into pieces)" },
      { id: "i3", name: "Yogurt", amount: "1 cup" },
      { id: "i4", name: "Zanzibar Biryani Spice Mix", amount: "2 tbsp" },
      { id: "i5", name: "Onions (sliced & fried)", amount: "3 large" },
      { id: "i6", name: "Garlic & Ginger paste", amount: "2 tbsp" },
      { id: "i7", name: "Saffron threads", amount: "Pinch in warm milk" },
    ],
    steps: [
      { id: "s1", title: "Marinate Chicken", content: "Mix chicken with yogurt, ginger-garlic paste, and Zanzibar biryani spices. Let marinate for at least 1 hour." },
      { id: "s2", title: "Parboil Rice", content: "Boil basmati rice with whole spices until 70% cooked, then drain." },
      { id: "s3", title: "Build Curry Base", content: "Fry sliced onions until deep golden. Add marinated chicken and cook until tender." },
      { id: "s4", title: "Layer and Dum", content: "Layer parboiled rice over chicken, drizzle with saffron milk and fried onions. Cover tightly and cook on low heat for 20 mins." },
    ],
    prepTimeMinutes: 30,
    cookTimeMinutes: 45,
    servings: 6,
    difficulty: "medium",
    imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=1000&auto=format&fit=crop",
    source: "admin_import",
    submittedByName: "Chef Ali",
    submittedBySocial: "@chefalizanzibar",
    status: "published",
    rejectionReason: null,
    linkedVendorIds: [],
    views: 342,
    saves: 88,
    createdAt: new Date("2026-01-15").toISOString(),
    publishedAt: new Date("2026-01-15").toISOString(),
  },
  {
    id: "starter-2",
    title: "Swahili Coconut Fish Curry (Samaki wa Kupaka)",
    titleLower: "swahili coconut fish curry samaki wa kupaka",
    slug: "swahili-coconut-fish-curry",
    country: "Tanzania",
    subcategory: "Coastal/Swahili",
    tags: ["seafood", "coconut", "quick", "dinner"],
    ingredients: [
      { id: "i1", name: "Fresh Kingfish or Snapper Fillets", amount: "800g" },
      { id: "i2", name: "Thick Coconut Cream", amount: "1.5 cups" },
      { id: "i3", name: "Tamarind paste", amount: "2 tbsp" },
      { id: "i4", name: "Garlic, minced", amount: "1 tbsp" },
      { id: "i5", name: "Turmeric Powder", amount: "1 tsp" },
      { id: "i6", name: "Fresh Green Chilies", amount: "2 sliced" },
    ],
    steps: [
      { id: "s1", title: "Grill Fish", content: "Marinate fish with salt, garlic, turmeric, and lemon. Charcoal grill until lightly charred." },
      { id: "s2", title: "Simmer Sauce", content: "In a pan, simmer coconut cream with tamarind, turmeric, and minced chilies until thickened into a rich glaze." },
      { id: "s3", title: "Coat and Serve", content: "Coat grilled fish generously with hot coconut sauce and serve with fresh ugali or coconut rice." },
    ],
    prepTimeMinutes: 20,
    cookTimeMinutes: 25,
    servings: 4,
    difficulty: "medium",
    imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=1000&auto=format&fit=crop",
    source: "admin_import",
    submittedByName: "Mama Fatuma",
    submittedBySocial: null,
    status: "published",
    rejectionReason: null,
    linkedVendorIds: [],
    views: 215,
    saves: 52,
    createdAt: new Date("2026-01-20").toISOString(),
    publishedAt: new Date("2026-01-20").toISOString(),
  },
  {
    id: "starter-3",
    title: "Chaga Roast Beef & Plantain Stew (Machalari)",
    titleLower: "chaga roast beef plantain stew machalari",
    slug: "chaga-roast-beef-plantain-stew-machalari",
    country: "Tanzania",
    subcategory: "Chaga",
    tags: ["comfort-food", "beef", "traditional", "hearty"],
    ingredients: [
      { id: "i1", name: "Green Cooking Bananas (Plantains)", amount: "6 peeled" },
      { id: "i2", name: "Beef Short Ribs or Stewing Beef", amount: "750g" },
      { id: "i3", name: "Tomatoes, chopped", amount: "3 medium" },
      { id: "i4", name: "Onion, finely chopped", amount: "1 large" },
      { id: "i5", name: "Coconut Milk or Beef Stock", amount: "2 cups" },
    ],
    steps: [
      { id: "s1", title: "Sear Beef", content: "Brown seasoned beef cubes in a pot until deep golden crust forms." },
      { id: "s2", title: "Add Aromatics", content: "Sauté onions and tomatoes with beef until soft and fragrant." },
      { id: "s3", title: "Stew with Plantains", content: "Add peeled green plantains and coconut milk/stock. Simmer covered for 40 mins until plantains are fork tender and stew is thick." },
    ],
    prepTimeMinutes: 15,
    cookTimeMinutes: 45,
    servings: 4,
    difficulty: "easy",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000&auto=format&fit=crop",
    source: "admin_import",
    submittedByName: "Moshi Kitchen",
    submittedBySocial: null,
    status: "published",
    rejectionReason: null,
    linkedVendorIds: [],
    views: 180,
    saves: 39,
    createdAt: new Date("2026-02-01").toISOString(),
    publishedAt: new Date("2026-02-01").toISOString(),
  },
  {
    id: "starter-4",
    title: "Swahili Chips Mayai (French Fries Omelette)",
    titleLower: "swahili chips mayai french fries omelette",
    slug: "swahili-chips-mayai",
    country: "Tanzania",
    subcategory: "Coastal/Swahili",
    tags: ["quick", "street-food", "vegetarian", "easy"],
    ingredients: [
      { id: "i1", name: "Fresh French Fries (Cooked)", amount: "2 cups" },
      { id: "i2", name: "Eggs", amount: "3 large" },
      { id: "i3", name: "Chopped Onion & Bell Pepper", amount: "1/4 cup" },
      { id: "i4", name: "Chopped Cilantro", amount: "1 tbsp" },
      { id: "i5", name: "Kachumbari (Tomato salad)", amount: "For serving" },
    ],
    steps: [
      { id: "s1", title: "Prepare Pan", content: "Heat fries in a skillet over medium heat until crispy." },
      { id: "s2", title: "Whisk Eggs", content: "Beat eggs with salt, pepper, chopped onions, and cilantro." },
      { id: "s3", title: "Combine and Flip", content: "Pour whisked eggs evenly over fries. Cook until bottom is set, flip carefully and brown the other side." },
      { id: "s4", title: "Serve", content: "Serve hot with fresh Kachumbari salad and chili sauce." },
    ],
    prepTimeMinutes: 10,
    cookTimeMinutes: 10,
    servings: 2,
    difficulty: "easy",
    imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=1000&auto=format&fit=crop",
    source: "admin_import",
    submittedByName: "Dar Street Eats",
    submittedBySocial: null,
    status: "published",
    rejectionReason: null,
    linkedVendorIds: [],
    views: 420,
    saves: 110,
    createdAt: new Date("2026-02-05").toISOString(),
    publishedAt: new Date("2026-02-05").toISOString(),
  }
];

/**
 * Fetch all published recipes from Firestore (or fallback to starter recipes)
 */
export async function getPublishedRecipes(filters?: {
  country?: string;
  subcategory?: string;
  tag?: string;
  searchQuery?: string;
}): Promise<Recipe[]> {
  try {
    const q = query(
      collection(db, "recipes"),
      where("status", "==", "published"),
      orderBy("publishedAt", "desc")
    );
    const snap = await getDocs(q);
    let recipes: Recipe[] = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Recipe[];

    // If Firestore is empty, return starter recipes
    if (recipes.length === 0) {
      recipes = [...STARTER_RECIPES];
    }

    // Client side filtering for flexible combined searches
    if (filters) {
      if (filters.country) {
        recipes = recipes.filter(
          (r) => r.country.toLowerCase() === filters.country?.toLowerCase()
        );
      }
      if (filters.subcategory) {
        recipes = recipes.filter(
          (r) => r.subcategory.toLowerCase() === filters.subcategory?.toLowerCase()
        );
      }
      if (filters.tag) {
        const targetTag = filters.tag.toLowerCase();
        recipes = recipes.filter((r) =>
          r.tags.some((t) => t.toLowerCase() === targetTag)
        );
      }
      if (filters.searchQuery) {
        const queryStr = filters.searchQuery.toLowerCase().trim();
        recipes = recipes.filter(
          (r) =>
            r.titleLower?.includes(queryStr) ||
            r.title.toLowerCase().includes(queryStr) ||
            r.subcategory.toLowerCase().includes(queryStr) ||
            r.country.toLowerCase().includes(queryStr) ||
            r.tags.some((t) => t.toLowerCase().includes(queryStr))
        );
      }
    }

    return recipes;
  } catch (err) {
    console.warn("Failed to fetch recipes from Firestore, using starters:", err);
    let recipes = [...STARTER_RECIPES];
    if (filters) {
      if (filters.country) {
        recipes = recipes.filter(
          (r) => r.country.toLowerCase() === filters.country?.toLowerCase()
        );
      }
      if (filters.subcategory) {
        recipes = recipes.filter(
          (r) => r.subcategory.toLowerCase() === filters.subcategory?.toLowerCase()
        );
      }
      if (filters.tag) {
        const targetTag = filters.tag.toLowerCase();
        recipes = recipes.filter((r) =>
          r.tags.some((t) => t.toLowerCase() === targetTag)
        );
      }
      if (filters.searchQuery) {
        const queryStr = filters.searchQuery.toLowerCase().trim();
        recipes = recipes.filter(
          (r) =>
            r.titleLower?.includes(queryStr) ||
            r.title.toLowerCase().includes(queryStr) ||
            r.subcategory.toLowerCase().includes(queryStr) ||
            r.country.toLowerCase().includes(queryStr) ||
            r.tags.some((t) => t.toLowerCase().includes(queryStr))
        );
      }
    }
    return recipes;
  }
}

/**
 * Fetch recipe by country, subcategory, and slug
 */
export async function getRecipeBySlug(
  country: string,
  subcategory: string,
  slug: string
): Promise<Recipe | null> {
  try {
    const q = query(
      collection(db, "recipes"),
      where("slug", "==", slug),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0];
      return { id: docData.id, ...docData.data() } as Recipe;
    }
  } catch (err) {
    console.warn("Error fetching recipe by slug from Firestore:", err);
  }

  // Fallback lookup from starters
  const found = STARTER_RECIPES.find(
    (r) =>
      r.slug === slug ||
      (r.country.toLowerCase() === country.toLowerCase() &&
        r.subcategory.toLowerCase() === subcategory.toLowerCase() &&
        r.slug === slug)
  );

  return found || null;
}

/**
 * Fetch distinct countries and subcategories with recipe counts
 */
export async function getCountrySubcategoryMap(): Promise<
  Record<string, { subcategories: Record<string, number>; total: number }>
> {
  const published = await getPublishedRecipes();
  const map: Record<string, { subcategories: Record<string, number>; total: number }> = {};

  published.forEach((r) => {
    if (!map[r.country]) {
      map[r.country] = { subcategories: {}, total: 0 };
    }
    map[r.country].total += 1;
    map[r.country].subcategories[r.subcategory] =
      (map[r.country].subcategories[r.subcategory] || 0) + 1;
  });

  return map;
}

/**
 * Upload image file to Firebase Storage
 */
export async function uploadRecipeImage(file: File): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `recipes/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const storageRef = ref(storage, fileName);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

/**
 * Submit new recipe (status: pending_review)
 */
export async function submitRecipe(
  input: RecipeSubmissionInput
): Promise<string> {
  let imageUrl = input.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop";

  if (input.imageFile) {
    try {
      imageUrl = await uploadRecipeImage(input.imageFile);
    } catch (err) {
      console.warn("Image upload failed, using fallback image:", err);
    }
  }

  const generatedSlug = slugify(input.title);

  const newRecipe: Omit<Recipe, "id"> = {
    title: input.title.trim(),
    titleLower: input.title.toLowerCase().trim(),
    slug: generatedSlug,
    country: input.country.trim(),
    subcategory: input.subcategory.trim(),
    tags: input.tags || [],
    ingredients: input.ingredients.map((ing, idx) => ({
      id: `ing-${idx}-${Date.now()}`,
      name: ing.name.trim(),
      amount: ing.amount.trim(),
    })),
    steps: input.steps.map((st, idx) => ({
      id: `step-${idx}-${Date.now()}`,
      title: st.title.trim(),
      content: st.content.trim(),
    })),
    prepTimeMinutes: Number(input.prepTimeMinutes) || 15,
    cookTimeMinutes: Number(input.cookTimeMinutes) || 30,
    servings: Number(input.servings) || 4,
    difficulty: input.difficulty || "medium",
    imageUrl,
    source: "user_submission",
    submittedByName: input.submittedByName?.trim() || null,
    submittedBySocial: input.submittedBySocial?.trim() || null,
    status: "pending_review",
    rejectionReason: null,
    linkedVendorIds: [],
    views: 0,
    saves: 0,
    createdAt: serverTimestamp(),
    publishedAt: null,
  };

  const docRef = await addDoc(collection(db, "recipes"), newRecipe);
  return docRef.id;
}

/**
 * Fetch all pending review recipes for admin queue
 */
export async function getPendingRecipes(): Promise<Recipe[]> {
  try {
    const q = query(
      collection(db, "recipes"),
      where("status", "==", "pending_review"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Recipe[];
  } catch (err) {
    console.warn("Error fetching pending recipes:", err);
    return [];
  }
}

/**
 * Approve pending recipe
 */
export async function approveRecipe(
  recipeId: string,
  overrides?: Partial<Recipe>
): Promise<void> {
  const recipeRef = doc(db, "recipes", recipeId);
  const existingSnap = await getDoc(recipeRef);

  let currentData: Partial<Recipe> = {};
  if (existingSnap.exists()) {
    currentData = existingSnap.data() as Partial<Recipe>;
  }

  const titleToSlug = overrides?.title || currentData.title || "recipe";
  const slug = overrides?.slug || slugify(titleToSlug);

  await updateDoc(recipeRef, {
    ...overrides,
    slug,
    status: "published",
    publishedAt: serverTimestamp(),
  });
}

/**
 * Reject recipe
 */
export async function rejectRecipe(
  recipeId: string,
  rejectionReason: string
): Promise<void> {
  const recipeRef = doc(db, "recipes", recipeId);
  await updateDoc(recipeRef, {
    status: "rejected",
    rejectionReason,
  });
}

/**
 * Increment view count
 */
export async function incrementRecipeViews(recipeId: string): Promise<void> {
  if (recipeId.startsWith("starter-")) return;
  try {
    const recipeRef = doc(db, "recipes", recipeId);
    await updateDoc(recipeRef, {
      views: increment(1),
    });
  } catch (err) {
    console.warn("Could not increment view count:", err);
  }
}

/**
 * Fetch vendors by linkedVendorIds
 */
export async function getLinkedVendors(vendorIds: string[]): Promise<VendorMinimal[]> {
  if (!vendorIds || vendorIds.length === 0) return [];
  const vendors: VendorMinimal[] = [];

  for (const vId of vendorIds) {
    try {
      const vSnap = await getDoc(doc(db, "vendors", vId));
      if (vSnap.exists()) {
        const data = vSnap.data();
        vendors.push({
          id: vSnap.id,
          name: data.name || data.business_name || "Sosika Partner Vendor",
          image_url: data.image_url || data.logo || undefined,
          location: data.location || data.address || undefined,
          cuisine: data.cuisine || [],
          phone: data.phone || data.contact_phone || undefined,
        });
      }
    } catch (err) {
      console.warn(`Failed to load vendor ${vId}:`, err);
    }
  }

  return vendors;
}

/**
 * Trigger manual AI recipe generation via Cloud Function callable
 */
export async function triggerAIRecipeGeneration(resetQuota: boolean = false): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const triggerFn = httpsCallable(functions, "triggerDailyRecipeGeneration");
    const result: any = await triggerFn({ resetQuota });
    return result.data;
  } catch (err: any) {
    console.error("Failed to trigger AI recipe generation:", err);
    throw new Error(err?.message || "Failed to trigger AI recipe generation.");
  }
}

/**
 * Fetch execution logs from recipeGenerationLogs collection
 */
export async function fetchRecipeGenerationLogs(limitCount: number = 20): Promise<RecipeGenerationLog[]> {
  try {
    const q = query(
      collection(db, "recipeGenerationLogs"),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as RecipeGenerationLog[];
  } catch (err) {
    console.warn("Failed to fetch recipe generation logs:", err);
    return [];
  }
}

/**
 * Check if Gemini free-tier quota is marked exhausted for today
 */
export async function fetchGeminiQuotaStatus(): Promise<{ isExhausted: boolean; exhaustedDate?: string }> {
  try {
    const docSnap = await getDoc(doc(db, "systemFlags", "geminiQuota"));
    if (!docSnap.exists()) {
      return { isExhausted: false };
    }
    const data = docSnap.data();
    const todayStr = new Date().toISOString().slice(0, 10);
    return {
      isExhausted: data.exhaustedDate === todayStr,
      exhaustedDate: data.exhaustedDate,
    };
  } catch (err) {
    console.warn("Failed to fetch quota status:", err);
    return { isExhausted: false };
  }
}

/**
 * Manually reset Gemini quota flag in Firestore
 */
export async function resetGeminiQuotaFlag(): Promise<void> {
  try {
    const quotaRef = doc(db, "systemFlags", "geminiQuota");
    const snap = await getDoc(quotaRef);
    if (snap.exists()) {
      await updateDoc(quotaRef, {
        exhaustedDate: "",
      });
    }
  } catch (err) {
    console.warn("Error resetting quota flag:", err);
  }
}
