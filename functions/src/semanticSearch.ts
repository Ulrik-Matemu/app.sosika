/**
 * Semantic re-ranking for mood/search results. Callable is unauthenticated
 * by design — browsing/search happens before checkout, same as the rest of
 * Sosika's anonymous-by-default flow (see sms.ts) — so input is validated
 * defensively instead of gated on request.auth.
 *
 * This never *narrows* results: it only returns an ordering signal over a
 * caller-supplied candidate set. src/pages/mood/api/mood-api.tsx merges this
 * with its existing category/keyword matches, and simply skips the merge
 * (falling back to today's behavior unchanged) whenever this returns
 * degraded: true.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { embedText, hashText, isGeminiQuotaExhaustedToday } from "./lib/gemini";
import { EMBEDDING_MODEL } from "./menuEmbeddings";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const QUERY_EMBEDDING_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — "pizza" means the same thing all day
const MAX_CANDIDATE_IDS = 500;
const MAX_QUERY_LENGTH = 100;

interface SemanticSearchRequest {
  query: string;
  candidateItemIds: string[];
}

interface SemanticSearchResponse {
  degraded: boolean;
  reason?: string;
  ranked: { id: string; score: number }[];
}

async function getCachedQueryEmbedding(
  db: FirebaseFirestore.Firestore,
  normalizedQuery: string
): Promise<number[] | null> {
  const cacheRef = db.collection("searchEmbeddingCache").doc(hashText(normalizedQuery));
  const snap = await cacheRef.get();
  if (!snap.exists) return null;

  const data = snap.data();
  const updatedAtMs = data?.updatedAt?.toMillis?.() ?? 0;
  if (Date.now() - updatedAtMs > QUERY_EMBEDDING_CACHE_TTL_MS) return null;

  const vectorValue = data?.embedding;
  // Firestore Admin SDK Vector exposes its raw numbers via toArray().
  const values = typeof vectorValue?.toArray === "function" ? vectorValue.toArray() : null;
  return Array.isArray(values) && values.length > 0 ? values : null;
}

async function setCachedQueryEmbedding(
  db: FirebaseFirestore.Firestore,
  normalizedQuery: string,
  values: number[]
): Promise<void> {
  const cacheRef = db.collection("searchEmbeddingCache").doc(hashText(normalizedQuery));
  await cacheRef.set({
    query: normalizedQuery,
    embedding: admin.firestore.FieldValue.vector(values),
    model: EMBEDDING_MODEL,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export const semanticSearchMenuItems = onCall(
  { cors: true, secrets: [geminiApiKey] },
  async (request): Promise<SemanticSearchResponse> => {
    const { query, candidateItemIds } = (request.data || {}) as SemanticSearchRequest;

    if (!query || typeof query !== "string" || !query.trim()) {
      throw new HttpsError("invalid-argument", "'query' must be a non-empty string.");
    }
    if (query.length > MAX_QUERY_LENGTH) {
      throw new HttpsError("invalid-argument", `'query' must be under ${MAX_QUERY_LENGTH} characters.`);
    }
    if (!Array.isArray(candidateItemIds) || candidateItemIds.length === 0) {
      return { degraded: true, reason: "No candidate items supplied.", ranked: [] };
    }
    if (candidateItemIds.length > MAX_CANDIDATE_IDS) {
      throw new HttpsError("invalid-argument", `'candidateItemIds' must not exceed ${MAX_CANDIDATE_IDS} entries.`);
    }

    const db = admin.firestore();

    if (await isGeminiQuotaExhaustedToday(db)) {
      return { degraded: true, reason: "Gemini quota exhausted today.", ranked: [] };
    }

    const apiKey = geminiApiKey.value() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { degraded: true, reason: "GEMINI_API_KEY not configured.", ranked: [] };
    }

    const normalizedQuery = query.trim().toLowerCase();

    let queryVector = await getCachedQueryEmbedding(db, normalizedQuery);
    if (!queryVector) {
      const embedResult = await embedText(apiKey, normalizedQuery, "RETRIEVAL_QUERY", EMBEDDING_MODEL);
      if (!embedResult.values) {
        return {
          degraded: true,
          reason: embedResult.error || "Failed to embed query.",
          ranked: [],
        };
      }
      queryVector = embedResult.values;
      await setCachedQueryEmbedding(db, normalizedQuery, queryVector);
    }

    const candidateSet = new Set(candidateItemIds);

    try {
      // Firestore's findNearest doesn't combine well with an `in` pre-filter
      // over hundreds of candidate IDs, so we search a broader neighborhood
      // and intersect with the caller's candidates in memory. Sosika's
      // regional catalog is small enough that this stays well within
      // Firestore's brute-force KNN performance envelope.
      const snapshot = await db
        .collection("menuItems")
        .findNearest({
          vectorField: "embedding",
          queryVector: admin.firestore.FieldValue.vector(queryVector),
          limit: Math.min(candidateItemIds.length * 3, 300),
          distanceMeasure: "COSINE",
          distanceResultField: "_vectorDistance",
        })
        .get();

      const ranked: { id: string; score: number }[] = [];
      snapshot.forEach((doc) => {
        if (!candidateSet.has(doc.id)) return;
        const distance = (doc.get("_vectorDistance") as number) ?? 0;
        ranked.push({ id: doc.id, score: 1 - distance }); // cosine distance -> similarity
      });

      return { degraded: false, ranked };
    } catch (err: any) {
      console.error("[semanticSearchMenuItems] findNearest failed:", err?.message || err);
      return { degraded: true, reason: err?.message || "Vector search failed.", ranked: [] };
    }
  }
);
