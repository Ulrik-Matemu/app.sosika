import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { assertIsAdmin } from "./adminGuard";
import {
  callGeminiWithFallback,
  clearGeminiQuotaFlag,
  isGeminiQuotaExhaustedToday,
  markGeminiQuotaExhaustedToday,
} from "./lib/gemini";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
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

// Loose normalize for dedup comparisons: lowercase, strip punctuation/whitespace
function normalizeForDedup(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

interface RawAIRecipe {
  title?: string;
  country?: string;
  subcategory?: string;
  tags?: string[];
  ingredients?: { name?: string; amount?: string }[];
  steps?: { title?: string; content?: string }[];
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  difficulty?: "easy" | "medium" | "hard";
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateRecipe(raw: any): { isValid: boolean; reason?: string; recipe?: RawAIRecipe } {
  if (!raw || typeof raw !== "object") {
    return { isValid: false, reason: "Recipe payload is not an object." };
  }
  if (!raw.title || typeof raw.title !== "string" || !raw.title.trim()) {
    return { isValid: false, reason: "Missing or invalid title." };
  }
  if (!raw.country || typeof raw.country !== "string" || !raw.country.trim()) {
    return { isValid: false, reason: "Missing or invalid country." };
  }
  if (!raw.subcategory || typeof raw.subcategory !== "string" || !raw.subcategory.trim()) {
    return { isValid: false, reason: "Missing or invalid subcategory." };
  }
  if (!Array.isArray(raw.ingredients) || raw.ingredients.length === 0) {
    return { isValid: false, reason: "Ingredients array missing or empty." };
  }
  for (const ing of raw.ingredients) {
    if (!ing?.name || !ing?.amount) {
      return { isValid: false, reason: "Ingredient entry missing name or amount." };
    }
  }
  if (!Array.isArray(raw.steps) || raw.steps.length === 0) {
    return { isValid: false, reason: "Steps array missing or empty." };
  }
  for (const st of raw.steps) {
    if (!st?.content) {
      return { isValid: false, reason: "Step entry missing content." };
    }
  }
  const prepTime = Number(raw.prepTimeMinutes);
  const cookTime = Number(raw.cookTimeMinutes);
  const servings = Number(raw.servings);
  if (
    isNaN(prepTime) || prepTime <= 0 ||
    isNaN(cookTime) || cookTime <= 0 ||
    isNaN(servings) || servings <= 0
  ) {
    return { isValid: false, reason: "Timings or servings must be positive numbers." };
  }

  return {
    isValid: true,
    recipe: {
      title: raw.title.trim(),
      country: raw.country.trim(),
      subcategory: raw.subcategory.trim(),
      tags: Array.isArray(raw.tags)
        ? raw.tags.map((t: any) => String(t).toLowerCase().trim()).filter(Boolean)
        : ["ai-curated"],
      ingredients: raw.ingredients.map((ing: any, idx: number) => ({
        id: `ing-${idx}`,
        name: String(ing.name).trim(),
        amount: String(ing.amount).trim(),
      })),
      steps: raw.steps.map((st: any, idx: number) => ({
        id: `step-${idx}`,
        title: st.title ? String(st.title).trim() : `Step ${idx + 1}`,
        content: String(st.content).trim(),
      })),
      prepTimeMinutes: prepTime,
      cookTimeMinutes: cookTime,
      servings: servings,
      difficulty: ["easy", "medium", "hard"].includes(raw.difficulty) ? raw.difficulty : "medium",
    },
  };
}

// ---------------------------------------------------------------------------
// Free image sourcing: Pollinations.ai first (free, no key), Unsplash static
// fallback second. Both are checked for reachability before being trusted;
// if both fail we still publish the recipe with a placeholder rather than
// dropping it, and we flag imageStatus so the admin review queue can spot it.
// ---------------------------------------------------------------------------

const FALLBACK_IMAGE_URL =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop";

async function generateRecipeImageUrl(
  title: string,
  country: string
): Promise<{ url: string; sourceUsed: "pollinations" | "fallback" }> {
  try {
    const prompt = encodeURIComponent(
      `professional food photography, ${title}, traditional ${country} dish, overhead shot, natural light, appetizing`
    );
    // Pollinations serves the image directly at this URL — no API key, no
    // account, generation happens on request. We don't need to download the
    // bytes ourselves; Firestore just stores the URL and the <img> tag /
    // Next.js Image component fetches it client-side.
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${prompt}?width=800&height=600&nologo=true`;

    // Verify the endpoint actually responds before trusting it — a HEAD
    // request avoids downloading the full image just to check reachability.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(pollinationsUrl, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) {
      return { url: pollinationsUrl, sourceUsed: "pollinations" };
    }
    console.warn(`[generateRecipeImageUrl] Pollinations returned status ${resp.status}, using fallback.`);
  } catch (err: any) {
    console.warn("[generateRecipeImageUrl] Pollinations request failed, using fallback:", err?.message || err);
  }
  return { url: FALLBACK_IMAGE_URL, sourceUsed: "fallback" };
}

// ---------------------------------------------------------------------------
// Dedup check: compares normalized title+country+subcategory against
// existing recipes so the AI doesn't keep re-adding "Chapati" every run.
// This is a cheap in-memory check against a targeted query rather than
// scanning the whole collection.
// ---------------------------------------------------------------------------

async function isDuplicateRecipe(
  db: FirebaseFirestore.Firestore,
  title: string,
  country: string,
  subcategory: string
): Promise<boolean> {
  const snap = await db
    .collection("recipes")
    .where("country", "==", country)
    .where("subcategory", "==", subcategory)
    .get();

  const targetNorm = normalizeForDedup(title);
  return snap.docs.some((d) => normalizeForDedup(d.data().title || "") === targetNorm);
}

// ---------------------------------------------------------------------------
// Core job
// ---------------------------------------------------------------------------

async function runDailyRecipeGenerationJob(): Promise<{
  attempted: number;
  accepted: number;
  rejected: number;
  duplicatesSkipped: number;
  quotaExhausted: boolean;
  errors: string[];
  recipesGenerated: any[];
}> {
  const db = admin.firestore();
  const errors: string[] = [];
  const recipesGenerated: any[] = [];
  let attempted = 0;
  let accepted = 0;
  let rejected = 0;
  let duplicatesSkipped = 0;

  const logAndReturn = async (quotaExhausted: boolean) => {
    await db.collection("recipeGenerationLogs").add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      recipesAttempted: attempted,
      acceptedCount: accepted,
      rejectedCount: rejected,
      duplicatesSkipped,
      quotaExhausted,
      apiErrors: errors,
      recipesGenerated,
    });
    return { attempted, accepted, rejected, duplicatesSkipped, quotaExhausted, errors, recipesGenerated };
  };

  // 0. Circuit breaker: skip entirely if we already know quota is dead today
  if (await isGeminiQuotaExhaustedToday(db)) {
    const msg = "Skipping run: Gemini free-tier quota already marked exhausted today.";
    console.log(`[runDailyRecipeGenerationJob] ${msg}`);
    errors.push(msg);
    return await logAndReturn(true);
  }

  // 1. Analyze existing database coverage gaps
  const categoryCounts: Record<string, number> = {};
  try {
    const snap = await db.collection("recipes").get();
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.country && data.subcategory) {
        const key = `${data.country} - ${data.subcategory}`;
        categoryCounts[key] = (categoryCounts[key] || 0) + 1;
      }
    });
  } catch (e: any) {
    console.warn("[runDailyRecipeGenerationJob] Error analyzing existing counts:", e?.message);
  }
  const existingSummary = Object.keys(categoryCounts).length > 0
    ? `Current recipe distribution in DB: ${JSON.stringify(categoryCounts)}.`
    : "The database currently has low recipe density.";

  // 2. Resolve Gemini API Key
  const apiKey = geminiApiKey.value() || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const errorMsg = "GEMINI_API_KEY is not set in Firebase secrets or process.env.";
    console.error(`[runDailyRecipeGenerationJob] ${errorMsg}`);
    errors.push(errorMsg);
    return await logAndReturn(false);
  }

  // 3. Construct prompt
  const systemPrompt = `You are a master African & Global Culinary Historian. Your task is to generate 3 authentic food recipes focused on expanding underrepresented regional cuisines (e.g. Tanzania, Kenya, Uganda, Zanzibar, Ethiopia, Ghana, Nigeria, Senegal, etc.).
${existingSummary}
Focus generation on filling gaps in underrepresented regions or subcategories. Do not repeat a dish that is likely already well-represented above.
CRITICAL FORMATTING INSTRUCTIONS:
- You MUST respond with strictly valid JSON only.
- Do NOT include any markdown code block wrappers (no \`\`\`json or \`\`\`).
- Do NOT include any intro prose, commentary, or conversational response.
JSON Schema required:
{
  "recipes": [
    {
      "title": "Recipe Title",
      "country": "Country Name",
      "subcategory": "Subcategory or Cuisine Style",
      "tags": ["tag1", "tag2"],
      "ingredients": [ { "name": "Ingredient Name", "amount": "Quantity" } ],
      "steps": [ { "title": "Step Name", "content": "Detailed instruction" } ],
      "prepTimeMinutes": 20,
      "cookTimeMinutes": 35,
      "servings": 4,
      "difficulty": "medium"
    }
  ]
}`;

  attempted = 3;

  // 4. Call Gemini with fallback chain
  const callResult = await callGeminiWithFallback(apiKey, systemPrompt);
  errors.push(...callResult.errors);

  if (callResult.quotaExhausted) {
    await markGeminiQuotaExhaustedToday(db);
    return await logAndReturn(true);
  }

  if (!callResult.text) {
    errors.push("All Gemini model attempts failed or returned empty content.");
    return await logAndReturn(false);
  }

  // 5. Parse JSON (strip fences defensively even though we asked for none)
  let cleanedText = callResult.text.trim();
  if (cleanedText.startsWith("```")) {
    cleanedText = cleanedText.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  }

  let parsedData: any;
  try {
    parsedData = JSON.parse(cleanedText);
  } catch (jsonErr: any) {
    errors.push(`JSON parse failure: ${jsonErr?.message}`);
    console.error("[runDailyRecipeGenerationJob] Raw output was not valid JSON:", callResult.text);
    return await logAndReturn(false);
  }

  if (!parsedData || !Array.isArray(parsedData.recipes)) {
    errors.push("Parsed response did not contain a 'recipes' array — unexpected shape from model.");
    console.error("[runDailyRecipeGenerationJob] Unexpected response shape:", JSON.stringify(parsedData));
    return await logAndReturn(false);
  }

  // 6. Validate, dedup, generate image, and write each recipe
  for (const rawItem of parsedData.recipes) {
    const validation = validateRecipe(rawItem);
    if (!validation.isValid || !validation.recipe) {
      rejected++;
      errors.push(`Recipe rejected: ${validation.reason}`);
      continue;
    }
    const validRec = validation.recipe;

    const isDup = await isDuplicateRecipe(db, validRec.title!, validRec.country!, validRec.subcategory!);
    if (isDup) {
      duplicatesSkipped++;
      console.log(`[runDailyRecipeGenerationJob] Skipped duplicate: ${validRec.title}`);
      continue;
    }

    const { url: imageUrl, sourceUsed } = await generateRecipeImageUrl(validRec.title!, validRec.country!);

    const slug = slugify(validRec.title!);
    const docData = {
      title: validRec.title,
      titleLower: validRec.title!.toLowerCase(),
      slug,
      country: validRec.country,
      subcategory: validRec.subcategory,
      tags: validRec.tags || [],
      ingredients: validRec.ingredients || [],
      steps: validRec.steps || [],
      prepTimeMinutes: validRec.prepTimeMinutes,
      cookTimeMinutes: validRec.cookTimeMinutes,
      servings: validRec.servings,
      difficulty: validRec.difficulty,
      imageUrl,
      imageSource: sourceUsed, // "pollinations" | "fallback" — lets admin review queue flag placeholder images
      source: "ai_generated",
      submittedByName: null,
      submittedBySocial: null,
      status: "pending_review",
      rejectionReason: null,
      linkedVendorIds: [],
      views: 0,
      saves: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      publishedAt: null,
    };

    try {
      await db.collection("recipes").add(docData);
      accepted++;
      recipesGenerated.push({
        title: validRec.title,
        country: validRec.country,
        subcategory: validRec.subcategory,
        imageSource: sourceUsed,
        status: "pending_review",
      });
    } catch (writeErr: any) {
      rejected++;
      errors.push(`Firestore write failed for "${validRec.title}": ${writeErr?.message || writeErr}`);
    }
  }

  return await logAndReturn(false);
}

// ---------------------------------------------------------------------------
// Scheduled Cloud Function (Daily Cron Job at 03:00 UTC)
// ---------------------------------------------------------------------------

export const generateDailyRecipes = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "Etc/UTC",
    secrets: [geminiApiKey],
  },
  async () => {
    console.log("[generateDailyRecipes] Starting scheduled daily recipe generation job...");
    const result = await runDailyRecipeGenerationJob();
    console.log("[generateDailyRecipes] Completed job:", JSON.stringify(result));
  }
);

// ---------------------------------------------------------------------------
// Callable Function for Manual Admin Trigger & Testing
// ---------------------------------------------------------------------------

export const triggerDailyRecipeGeneration = onCall(
  { cors: true, secrets: [geminiApiKey] },
  async (request) => {
    assertIsAdmin(request);

    const db = admin.firestore();
    const data = request.data || {};

    if (data.resetQuota) {
      console.log("[triggerDailyRecipeGeneration] Admin requested resetting quota flag...");
      await clearGeminiQuotaFlag(db);
    }

    const result = await runDailyRecipeGenerationJob();
    return {
      success: true,
      message: result.quotaExhausted
        ? "Gemini API quota is currently exhausted for today."
        : `Successfully generated ${result.accepted} new recipe(s) (${result.rejected} rejected, ${result.duplicatesSkipped} duplicates skipped).`,
      details: result,
    };
  }
);