import type { FirestoreClient } from "./firestoreRest";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

// ---------------------------------------------------------------------------
// Quota circuit breaker: shared across every Gemini-calling endpoint. Once any
// caller sees a 429, every other caller short-circuits for the rest of the
// day instead of burning further requests against a depleted free-tier quota.
// ---------------------------------------------------------------------------

export async function isGeminiQuotaExhaustedToday(db: FirestoreClient): Promise<boolean> {
  const doc = await db.getDoc<{ exhaustedDate?: string }>("systemFlags/geminiQuota");
  if (!doc) return false;
  return doc.exhaustedDate === todayKey();
}

export async function markGeminiQuotaExhaustedToday(db: FirestoreClient): Promise<void> {
  await db.patchDoc("systemFlags/geminiQuota", {
    exhaustedDate: todayKey(),
    markedAt: new Date(),
  });
}

export async function clearGeminiQuotaFlag(db: FirestoreClient): Promise<void> {
  try {
    await db.deleteDoc("systemFlags/geminiQuota");
  } catch (err) {
    console.warn("[clearGeminiQuotaFlag] Failed to clear quota flag:", err);
  }
}

// ---------------------------------------------------------------------------
// Text generation call with ordered model fallback + retry-on-transient-error.
// ---------------------------------------------------------------------------

export interface GeminiCallResult {
  text: string | null;
  quotaExhausted: boolean;
  errors: string[];
}

export async function callGeminiWithFallback(
  apiKey: string,
  prompt: string,
  modelsToTry: string[] = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
): Promise<GeminiCallResult> {
  const errors: string[] = [];

  for (const modelName of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const maxAttemptsForThisModel = 2;

    for (let attempt = 1; attempt <= maxAttemptsForThisModel; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (resp.status === 429) {
          errors.push(`Model ${modelName} rate-limited (429): ${await resp.text()}`);
          return { text: null, quotaExhausted: true, errors };
        }

        if (resp.ok) {
          const respJson = (await resp.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
          const candidateText = respJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) return { text: candidateText, quotaExhausted: false, errors };
          errors.push(`Model ${modelName} returned 200 but no candidate text (possibly safety-filtered).`);
          break;
        }

        const errText = await resp.text();
        errors.push(`Model ${modelName} attempt ${attempt} returned status ${resp.status}: ${errText}`);
        if (attempt < maxAttemptsForThisModel && resp.status >= 500) {
          await sleep(1500 * attempt);
          continue;
        }
        break;
      } catch (err) {
        errors.push(`Model ${modelName} attempt ${attempt} threw: ${err instanceof Error ? err.message : String(err)}`);
        if (attempt < maxAttemptsForThisModel) {
          await sleep(1500 * attempt);
          continue;
        }
      }
    }
  }

  return { text: null, quotaExhausted: false, errors };
}

// ---------------------------------------------------------------------------
// Embeddings call.
// ---------------------------------------------------------------------------

export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export interface EmbedResult {
  values: number[] | null;
  quotaExhausted: boolean;
  error?: string;
}

export async function embedText(
  apiKey: string,
  text: string,
  taskType: EmbeddingTaskType,
  model = "gemini-embedding-001"
): Promise<EmbedResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: 768,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.status === 429) {
      return { values: null, quotaExhausted: true, error: `429: ${await resp.text()}` };
    }
    if (!resp.ok) {
      return { values: null, quotaExhausted: false, error: `${resp.status}: ${await resp.text()}` };
    }

    const respJson = (await resp.json()) as { embedding?: { values?: number[] } };
    const values = respJson?.embedding?.values;
    if (!Array.isArray(values) || values.length === 0) {
      return { values: null, quotaExhausted: false, error: "No embedding values in response." };
    }
    return { values, quotaExhausted: false };
  } catch (err) {
    return { values: null, quotaExhausted: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// Small content hash so write-triggered embedding jobs can skip re-embedding
// when the text that feeds the vector hasn't actually changed.
// ---------------------------------------------------------------------------

export function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] ** 2;
    nb += b[i] ** 2;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
