#!/usr/bin/env node
/**
 * One-off backfill: embeds every existing menuItems doc that doesn't yet
 * have a semantic-search vector, so the onMenuItemWrittenEmbed trigger
 * (functions/src/menuEmbeddings.ts) doesn't have to wait for a vendor to
 * edit each item before it becomes searchable. This is NEVER deployed —
 * it lives outside functions/src so `tsc` and `firebase deploy --only
 * functions` never touch it.
 *
 * Usage:
 *   cd functions
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     GEMINI_API_KEY=your-ai-studio-key \
 *     node scripts/backfill-menu-embeddings.mjs
 *
 *   # re-embed everything, including items that already have a vector:
 *   ... node scripts/backfill-menu-embeddings.mjs --force
 *
 * Rate-limited to stay well under Gemini's free-tier RPM for the embedding
 * endpoint; expect this to take a while on a large catalog.
 */

import admin from "firebase-admin";

const EMBEDDING_MODEL = "gemini-embedding-001";
const REQUESTS_PER_MINUTE = 60; // conservative for the free tier
const DELAY_MS = Math.ceil(60000 / REQUESTS_PER_MINUTE);

const force = process.argv.includes("--force");

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    "GOOGLE_APPLICATION_CREDENTIALS is not set. Point it at a Firebase " +
    "service account JSON key (Project Settings -> Service Accounts)."
  );
  process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

function buildEmbeddingSourceText(data) {
  const name = data.name || "";
  const description = data.description || "";
  const category = data.category || "";
  const tags = Array.isArray(data.tags) ? data.tags.join(", ") : "";
  return `${name}. ${description}. Category: ${category}. ${tags}`.trim();
}

async function embedText(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: 768,
    }),
  });
  if (!resp.ok) {
    throw new Error(`${resp.status}: ${await resp.text()}`);
  }
  const json = await resp.json();
  const values = json?.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("No embedding values in response.");
  }
  return values;
}

async function main() {
  const snapshot = await db.collection("menuItems").get();
  console.log(`Found ${snapshot.size} menu items.`);

  let embedded = 0;
  let skippedUnchanged = 0;
  let skippedEmpty = 0;
  let failed = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const sourceText = buildEmbeddingSourceText(data);

    if (!sourceText || sourceText.replace(/[.\s]/g, "") === "") {
      skippedEmpty++;
      continue;
    }

    const newHash = hashText(sourceText);
    if (!force && data.embeddingHash === newHash) {
      skippedUnchanged++;
      continue;
    }

    try {
      const values = await embedText(sourceText);
      await doc.ref.update({
        embedding: admin.firestore.FieldValue.vector(values),
        embeddingHash: newHash,
        embeddingModel: EMBEDDING_MODEL,
        embeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      embedded++;
      console.log(`Embedded ${doc.id} (${data.name || "unnamed"}).`);
    } catch (err) {
      failed++;
      console.error(`Failed to embed ${doc.id}: ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(
    `\nDone. Embedded: ${embedded}, unchanged-skipped: ${skippedUnchanged}, empty-skipped: ${skippedEmpty}, failed: ${failed}.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
