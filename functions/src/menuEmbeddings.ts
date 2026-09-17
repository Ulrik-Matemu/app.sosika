/**
 * Keeps a semantic-search embedding on every menuItems doc up to date.
 * Fires on every write, but only calls Gemini when the text that feeds the
 * vector (name/description/category/tags) actually changed — a vendor
 * toggling is_available or editing price should never burn an embedding call.
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { embedText, hashText, isGeminiQuotaExhaustedToday } from "./lib/gemini";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

function buildEmbeddingSourceText(data: FirebaseFirestore.DocumentData): string {
  const name = data.name || "";
  const description = data.description || "";
  const category = data.category || "";
  const tags = Array.isArray(data.tags) ? data.tags.join(", ") : "";
  return `${name}. ${description}. Category: ${category}. ${tags}`.trim();
}

export const onMenuItemWrittenEmbed = onDocumentWritten(
  { document: "menuItems/{itemId}", secrets: [geminiApiKey] },
  async (event) => {
    const after = event.data?.after;
    if (!after || !after.exists) return; // deleted, nothing to embed

    const data = after.data();
    if (!data) return;

    const sourceText = buildEmbeddingSourceText(data);
    if (!sourceText || sourceText.replace(/[.\s]/g, "") === "") return;

    const newHash = hashText(sourceText);
    if (data.embeddingHash === newHash) {
      // Name/description/category/tags haven't changed since the last
      // embed — skip the API call entirely.
      return;
    }

    const db = admin.firestore();
    if (await isGeminiQuotaExhaustedToday(db)) {
      console.warn(`[onMenuItemWrittenEmbed] Skipping ${event.params.itemId}: Gemini quota exhausted today.`);
      return;
    }

    const apiKey = geminiApiKey.value() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[onMenuItemWrittenEmbed] GEMINI_API_KEY not configured.");
      return;
    }

    const result = await embedText(apiKey, sourceText, "RETRIEVAL_DOCUMENT", EMBEDDING_MODEL);
    if (!result.values) {
      console.warn(
        `[onMenuItemWrittenEmbed] Failed to embed menuItems/${event.params.itemId}: ${result.error || "unknown error"}`
      );
      return;
    }

    await after.ref.update({
      embedding: admin.firestore.FieldValue.vector(result.values),
      embeddingHash: newHash,
      embeddingModel: EMBEDDING_MODEL,
      embeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
