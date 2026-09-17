/**
 * Replaces the onMenuItemWrittenEmbed Firestore trigger. Client-side
 * menuItems writes (admin console, vendor self-service) are unchanged; each
 * call site fires this RPC afterward via the shared
 * src/services/reembedMenuItem.ts helper. Source text, authorization, and
 * the change-detection hash are all re-derived from a fresh Firestore read —
 * never from the request body — so a stale or forged body can't cause a
 * bogus embed or let an unrelated user re-embed someone else's item.
 */
import { Hono } from "hono";
import type { Env, Variables } from "../lib/env";
import { firestoreServiceAccount } from "../lib/env";
import { FirestoreClient, encodeValue, encodeVector } from "../lib/firestoreRest";
import { requireAuth } from "../lib/adminGuard";
import { embedText, hashText, isGeminiQuotaExhaustedToday } from "../lib/gemini";
import { invalidArgument, permissionDenied } from "../lib/errors";

export const EMBEDDING_MODEL = "gemini-embedding-001";

function buildEmbeddingSourceText(data: Record<string, unknown>): string {
  const name = (data.name as string) || "";
  const description = (data.description as string) || "";
  const category = (data.category as string) || "";
  const tags = Array.isArray(data.tags) ? (data.tags as string[]).join(", ") : "";
  return `${name}. ${description}. Category: ${category}. ${tags}`.trim();
}

export const menuEmbeddingRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

menuEmbeddingRoutes.post("/reembedMenuItem", requireAuth, async (c) => {
  const body = await c.req.json<{ itemId?: string }>();
  if (!body.itemId) throw invalidArgument("itemId is required.");

  const db = new FirestoreClient(c.env.FIREBASE_PROJECT_ID, firestoreServiceAccount(c.env));
  const item = await db.getDoc<Record<string, unknown>>(`menuItems/${body.itemId}`);
  if (!item) return c.json({ success: true, embedded: false, reason: "Item not found (may have been deleted)." });

  const user = c.get("user");
  const isOwningVendor = item.vendor_id === user?.uid;
  if (!user?.admin && !isOwningVendor) {
    throw permissionDenied("You do not own this menu item.");
  }

  const sourceText = buildEmbeddingSourceText(item);
  if (!sourceText || sourceText.replace(/[.\s]/g, "") === "") {
    return c.json({ success: true, embedded: false, reason: "No embeddable text on this item." });
  }

  const newHash = hashText(sourceText);
  if (item.embeddingHash === newHash) {
    return c.json({ success: true, embedded: false, reason: "Source text unchanged since last embed." });
  }

  if (await isGeminiQuotaExhaustedToday(db)) {
    return c.json({ success: true, embedded: false, reason: "Gemini quota exhausted today." });
  }

  const result = await embedText(c.env.GEMINI_API_KEY, sourceText, "RETRIEVAL_DOCUMENT", EMBEDDING_MODEL);
  if (!result.values) {
    return c.json({ success: false, embedded: false, reason: result.error || "Embedding failed." });
  }

  await db.patchDocRaw(`menuItems/${body.itemId}`, {
    embedding: encodeVector(result.values),
    embeddingHash: encodeValue(newHash),
    embeddingModel: encodeValue(EMBEDDING_MODEL),
    embeddingUpdatedAt: encodeValue(new Date()),
  });

  return c.json({ success: true, embedded: true });
});
