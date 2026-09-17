/**
 * Canonical phone normalizer. Mirrored (not shared, different build targets)
 * in src/context/WalletContext.tsx and functions/src/phone.ts — keep all
 * three in sync so a phone normalizes to the same wallet document ID
 * everywhere.
 */
export function normalizePhone(raw: string): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "").trim();
  if (digits.startsWith("0")) {
    digits = "255" + digits.substring(1);
  } else if (/^[678]/.test(digits)) {
    digits = "255" + digits;
  }
  return `+${digits}`;
}
