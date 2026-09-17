/**
 * Daily AI recipe generation. Ported from functions/src/generateDailyRecipes.ts.
 * `runDailyRecipeGenerationJob` is called both from the Worker's `scheduled()`
 * cron handler (see src/index.ts) and from the admin-gated manual-trigger route.
 */
import { Hono } from "hono";
import type { Env, Variables } from "../lib/env";
import { firestoreServiceAccount } from "../lib/env";
import { FirestoreClient } from "../lib/firestoreRest";
import { requireAuth, requireAdmin } from "../lib/adminGuard";
import {
  callGeminiWithFallback,
  clearGeminiQuotaFlag,
  isGeminiQuotaExhaustedToday,
  markGeminiQuotaExhaustedToday,
} from "../lib/gemini";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

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

function validateRecipe(raw: unknown): { isValid: boolean; reason?: string; recipe?: RawAIRecipe } {
  if (!raw || typeof raw !== "object") return { isValid: false, reason: "Recipe payload is not an object." };
  const r = raw as Record<string, unknown>;
  if (!r.title || typeof r.title !== "string" || !r.title.trim()) return { isValid: false, reason: "Missing or invalid title." };
  if (!r.country || typeof r.country !== "string" || !r.country.trim()) return { isValid: false, reason: "Missing or invalid country." };
  if (!r.subcategory || typeof r.subcategory !== "string" || !r.subcategory.trim()) {
    return { isValid: false, reason: "Missing or invalid subcategory." };
  }
  if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) return { isValid: false, reason: "Ingredients array missing or empty." };
  for (const ing of r.ingredients as Record<string, unknown>[]) {
    if (!ing?.name || !ing?.amount) return { isValid: false, reason: "Ingredient entry missing name or amount." };
  }
  if (!Array.isArray(r.steps) || r.steps.length === 0) return { isValid: false, reason: "Steps array missing or empty." };
  for (const st of r.steps as Record<string, unknown>[]) {
    if (!st?.content) return { isValid: false, reason: "Step entry missing content." };
  }
  const prepTime = Number(r.prepTimeMinutes);
  const cookTime = Number(r.cookTimeMinutes);
  const servings = Number(r.servings);
  if (isNaN(prepTime) || prepTime <= 0 || isNaN(cookTime) || cookTime <= 0 || isNaN(servings) || servings <= 0) {
    return { isValid: false, reason: "Timings or servings must be positive numbers." };
  }

  return {
    isValid: true,
    recipe: {
      title: (r.title as string).trim(),
      country: (r.country as string).trim(),
      subcategory: (r.subcategory as string).trim(),
      tags: Array.isArray(r.tags) ? (r.tags as unknown[]).map((t) => String(t).toLowerCase().trim()).filter(Boolean) : ["ai-curated"],
      ingredients: (r.ingredients as Record<string, unknown>[]).map((ing, idx) => ({
        id: `ing-${idx}`,
        name: String(ing.name).trim(),
        amount: String(ing.amount).trim(),
      })),
      steps: (r.steps as Record<string, unknown>[]).map((st, idx) => ({
        id: `step-${idx}`,
        title: st.title ? String(st.title).trim() : `Step ${idx + 1}`,
        content: String(st.content).trim(),
      })),
      prepTimeMinutes: prepTime,
      cookTimeMinutes: cookTime,
      servings,
      difficulty: ["easy", "medium", "hard"].includes(r.difficulty as string) ? (r.difficulty as "easy" | "medium" | "hard") : "medium",
    },
  };
}

const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop";

async function generateRecipeImageUrl(title: string, country: string): Promise<{ url: string; sourceUsed: "pollinations" | "fallback" }> {
  try {
    const prompt = encodeURIComponent(`professional food photography, ${title}, traditional ${country} dish, overhead shot, natural light, appetizing`);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${prompt}?width=800&height=600&nologo=true`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(pollinationsUrl, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) return { url: pollinationsUrl, sourceUsed: "pollinations" };
    console.warn(`[generateRecipeImageUrl] Pollinations returned status ${resp.status}, using fallback.`);
  } catch (err) {
    console.warn("[generateRecipeImageUrl] Pollinations request failed, using fallback:", err);
  }
  return { url: FALLBACK_IMAGE_URL, sourceUsed: "fallback" };
}

async function isDuplicateRecipe(db: FirestoreClient, title: string, country: string, subcategory: string): Promise<boolean> {
  const docs = await db.queryEquals<{ title?: string }>("recipes", [
    { field: "country", value: country },
    { field: "subcategory", value: subcategory },
  ]);
  const targetNorm = normalizeForDedup(title);
  return docs.some((d) => normalizeForDedup(d.data.title || "") === targetNorm);
}

export async function runDailyRecipeGenerationJob(env: Env): Promise<{
  attempted: number;
  accepted: number;
  rejected: number;
  duplicatesSkipped: number;
  quotaExhausted: boolean;
  errors: string[];
  recipesGenerated: unknown[];
}> {
  const db = new FirestoreClient(env.FIREBASE_PROJECT_ID, firestoreServiceAccount(env));
  const errors: string[] = [];
  const recipesGenerated: unknown[] = [];
  let attempted = 0;
  let accepted = 0;
  let rejected = 0;
  let duplicatesSkipped = 0;

  const logAndReturn = async (quotaExhausted: boolean) => {
    await db.createDoc("recipeGenerationLogs", {
      timestamp: new Date(),
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

  if (await isGeminiQuotaExhaustedToday(db)) {
    const msg = "Skipping run: Gemini free-tier quota already marked exhausted today.";
    console.log(`[runDailyRecipeGenerationJob] ${msg}`);
    errors.push(msg);
    return await logAndReturn(true);
  }

  const categoryCounts: Record<string, number> = {};
  try {
    const docs = await db.listCollection<{ country?: string; subcategory?: string }>("recipes");
    for (const doc of docs) {
      if (doc.data.country && doc.data.subcategory) {
        const key = `${doc.data.country} - ${doc.data.subcategory}`;
        categoryCounts[key] = (categoryCounts[key] || 0) + 1;
      }
    }
  } catch (e) {
    console.warn("[runDailyRecipeGenerationJob] Error analyzing existing counts:", e);
  }
  const existingSummary =
    Object.keys(categoryCounts).length > 0
      ? `Current recipe distribution in DB: ${JSON.stringify(categoryCounts)}.`
      : "The database currently has low recipe density.";

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    const errorMsg = "GEMINI_API_KEY is not configured.";
    console.error(`[runDailyRecipeGenerationJob] ${errorMsg}`);
    errors.push(errorMsg);
    return await logAndReturn(false);
  }

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

  let cleanedText = callResult.text.trim();
  if (cleanedText.startsWith("```")) {
    cleanedText = cleanedText.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  }

  let parsedData: { recipes?: unknown[] };
  try {
    parsedData = JSON.parse(cleanedText);
  } catch (jsonErr) {
    errors.push(`JSON parse failure: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`);
    console.error("[runDailyRecipeGenerationJob] Raw output was not valid JSON:", callResult.text);
    return await logAndReturn(false);
  }

  if (!parsedData || !Array.isArray(parsedData.recipes)) {
    errors.push("Parsed response did not contain a 'recipes' array — unexpected shape from model.");
    console.error("[runDailyRecipeGenerationJob] Unexpected response shape:", JSON.stringify(parsedData));
    return await logAndReturn(false);
  }

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

    const docData = {
      title: validRec.title,
      titleLower: validRec.title!.toLowerCase(),
      slug: slugify(validRec.title!),
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
      imageSource: sourceUsed,
      source: "ai_generated",
      submittedByName: null,
      submittedBySocial: null,
      status: "pending_review",
      rejectionReason: null,
      linkedVendorIds: [],
      views: 0,
      saves: 0,
      createdAt: new Date(),
      publishedAt: null,
    };

    try {
      await db.createDoc("recipes", docData);
      accepted++;
      recipesGenerated.push({
        title: validRec.title,
        country: validRec.country,
        subcategory: validRec.subcategory,
        imageSource: sourceUsed,
        status: "pending_review",
      });
    } catch (writeErr) {
      rejected++;
      errors.push(`Firestore write failed for "${validRec.title}": ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`);
    }
  }

  return await logAndReturn(false);
}

export const recipeRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

recipeRoutes.post("/triggerDailyRecipeGeneration", requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json<{ resetQuota?: boolean }>().catch(() => ({}) as { resetQuota?: boolean });

  if (body.resetQuota) {
    console.log("[triggerDailyRecipeGeneration] Admin requested resetting quota flag...");
    const db = new FirestoreClient(c.env.FIREBASE_PROJECT_ID, firestoreServiceAccount(c.env));
    await clearGeminiQuotaFlag(db);
  }

  const result = await runDailyRecipeGenerationJob(c.env);
  return c.json({
    success: true,
    message: result.quotaExhausted
      ? "Gemini API quota is currently exhausted for today."
      : `Successfully generated ${result.accepted} new recipe(s) (${result.rejected} rejected, ${result.duplicatesSkipped} duplicates skipped).`,
    details: result,
  });
});
