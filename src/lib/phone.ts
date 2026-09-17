/**
 * Tanzanian phone number handling — one module, so the app stops disagreeing
 * with itself.
 *
 * Four independent normalizers had grown up across the codebase producing two
 * incompatible shapes: `255…` (useCart, Biryani checkout) and `+255…`
 * (WalletContext, the OTP flow). Both are baked into live Firestore document
 * ids — `wallets/{+255…}` and `freeDeliveryPass/{255…}` — so the formats
 * themselves cannot be unified without migrating real balances.
 *
 * What this module unifies is the *logic*: every call site now derives its id
 * from the same parser, and keeps whichever shape it already writes.
 */

/** Digits only, with the 255 country code applied: `255712345678`. */
export const toDigits = (raw: string): string => {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "").trim();
  if (digits.startsWith("0")) {
    digits = "255" + digits.substring(1);
  } else if (/^[678]/.test(digits)) {
    // A bare 9-digit mobile number, e.g. 712345678.
    digits = "255" + digits;
  }
  return digits;
};

/** E.164: `+255712345678`. */
export const toE164 = (raw: string): string => {
  const digits = toDigits(raw);
  return digits ? `+${digits}` : "";
};

/** The subscriber part, without country code or trunk zero: `712345678`. */
export const toLocal = (raw: string): string => {
  const digits = toDigits(raw);
  return digits.startsWith("255") ? digits.substring(3) : digits;
};

/**
 * Every shape the same number might have been stored as. Orders were written
 * over several years by different code paths, so lookups have to match all of
 * them — Firestore `in` allows at most 10 values, and this returns at most 5.
 */
export const phoneVariations = (raw: string): string[] => {
  if (!raw) return [];
  const base = toLocal(raw);
  if (!base) return [];
  return Array.from(
    new Set([`+255${base}`, `255${base}`, `0${base}`, base, raw.trim()])
  ).filter(Boolean);
};

/** A Tanzanian mobile number is 255 + 9 digits. */
export const isValidTZPhone = (raw: string): boolean => /^255[67]\d{8}$/.test(toDigits(raw));
