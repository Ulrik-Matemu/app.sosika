/**
 * Semantic re-ranking for mood/search results. Unauthenticated by design
 * (same anonymous-by-default posture as sendSms). Ported from
 * functions/src/semanticSearch.ts with one deliberate change: since the
 * caller already supplies a bounded (<=500) candidate ID set, this fetches
 * those documents directly by ID (batchGet) and ranks them by in-Worker
 * cosine similarity instead of porting Firestore's `findNearest` over REST
 * (undertested wire format, and unnecessary here — the original code was
 * already over-fetching a neighborhood and intersecting with these same
 * candidate IDs in memory). Never throws for quota/search failures — always
 * degrades gracefully so the frontend falls back to keyword search.
 */
import { Hono } from "hono";
import type { Env, Variables } from "../lib/env";
import { firestoreServiceAccount } from "../lib/env";
import { FirestoreClient } from "../lib/firestoreRest";
import { embedText, hashText, isGeminiQuotaExhaustedToday, cosineSimilarity } from "../lib/gemini";
import { EMBEDDING_MODEL } from "./menuEmbeddings";
import { invalidArgument } from "../lib/errors";

const QUERY_EMBEDDING_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CANDIDATE_IDS = 500;
const MAX_QUERY_LENGTH = 100;

async function getCachedQueryEmbedding(db: FirestoreClient, normalizedQuery: string): Promise<number[] | null> {
  const doc = await db.getDoc<{ embedding?: number[]; updatedAt?: string }>(`searchEmbeddingCache/${hashText(normalizedQuery)}`);
  if (!doc) return null;
  const updatedAtMs = doc.updatedAt ? new Date(doc.updatedAt).getTime() : 0;
  if (Date.now() - updatedAtMs > QUERY_EMBEDDING_CACHE_TTL_MS) return null;
  return Array.isArray(doc.embedding) && doc.embedding.length > 0 ? doc.embedding : null;
}

export const semanticSearchRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

semanticSearchRoutes.post("/semanticSearchMenuItems", async (c) => {
  const body = await c.req.json<{ query?: string; candidateItemIds?: string[] }>();
  const { query, candidateItemIds } = body;

  if (!query || typeof query !== "string" || !query.trim()) throw invalidArgument("'query' must be a non-empty string.");
  if (query.length > MAX_QUERY_LENGTH) throw invalidArgument(`'query' must be under ${MAX_QUERY_LENGTH} characters.`);
  if (!Array.isArray(candidateItemIds) || candidateItemIds.length === 0) {
    return c.json({ degraded: true, reason: "No candidate items supplied.", ranked: [] });
  }
  if (candidateItemIds.length > MAX_CANDIDATE_IDS) {
    throw invalidArgument(`'candidateItemIds' must not exceed ${MAX_CANDIDATE_IDS} entries.`);
  }

  const db = new FirestoreClient(c.env.FIREBASE_PROJECT_ID, firestoreServiceAccount(c.env));

  if (await isGeminiQuotaExhaustedToday(db)) {
    return c.json({ degraded: true, reason: "Gemini quota exhausted today.", ranked: [] });
  }

  const normalizedQuery = query.trim().toLowerCase();

  let queryVector = await getCachedQueryEmbedding(db, normalizedQuery);
  if (!queryVector) {
    const embedResult = await embedText(c.env.GEMINI_API_KEY, normalizedQuery, "RETRIEVAL_QUERY", EMBEDDING_MODEL);
    if (!embedResult.values) {
      return c.json({ degraded: true, reason: embedResult.error || "Failed to embed query.", ranked: [] });
    }
    queryVector = embedResult.values;
    await db.patchDocRaw(`searchEmbeddingCache/${hashText(normalizedQuery)}`, {
      query: { stringValue: normalizedQuery },
      embedding: { arrayValue: { values: queryVector.map((n) => ({ doubleValue: n })) } },
      model: { stringValue: EMBEDDING_MODEL },
      updatedAt: { timestampValue: new Date().toISOString() },
    });
  }

  try {
    const docs = await db.batchGet(candidateItemIds.map((id) => `menuItems/${id}`));
    const ranked: { id: string; score: number }[] = [];
    docs.forEach((doc, i) => {
      const embedding = doc?.embedding as number[] | undefined;
      if (!doc || !Array.isArray(embedding) || embedding.length === 0) return;
      ranked.push({ id: candidateItemIds[i], score: cosineSimilarity(queryVector as number[], embedding) });
    });
    ranked.sort((a, b) => b.score - a.score);
    return c.json({ degraded: false, ranked });
  } catch (err) {
    console.error("[semanticSearchMenuItems] batchGet/similarity failed:", err);
    return c.json({ degraded: true, reason: err instanceof Error ? err.message : "Vector search failed.", ranked: [] });
  }
});
