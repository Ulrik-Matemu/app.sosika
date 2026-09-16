/**
 * Server-side mirror of src/context/WalletContext.tsx's `normalizePhone`.
 * Kept in sync manually — functions/ and src/ compile as separate TS
 * projects and cannot share modules directly. Any change here should be
 * mirrored there (and vice versa) so a phone normalizes to the same wallet
 * document ID on both sides.
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
