/**
 * Fire-and-forget trigger for the Worker's /reembedMenuItem RPC, which
 * replaced the onMenuItemWrittenEmbed Firestore trigger. Call this after any
 * menuItems create/update so semantic search stays current — the Worker
 * re-reads the item and decides on its own whether re-embedding is actually
 * needed (unchanged text is a cheap no-op), so it's safe to call
 * unconditionally after every write.
 */
import { triggerReembed as callWorkerReembed } from "./workerApi";

export function triggerReembed(itemId: string): void {
  callWorkerReembed(itemId).catch((err) => {
    console.warn(`[reembedMenuItem] Failed to trigger re-embed for menuItems/${itemId}:`, err);
  });
}
