import { PlatformConfig } from "../../../hooks/usePlatformConfig";

/**
 * Per-kitchen delivery cue for a results row, board D13.
 *
 * Mirrors the standard-bodaboda branch of the live fee calculation in
 * `src/hooks/useCart.ts` (base fee from distance, floored at `minBaseFee`,
 * night surcharge, rounded up to `roundingUnit`). That calculation is welded
 * to the cart's first vendor, so it cannot be called per-row; this is the same
 * arithmetic against an arbitrary distance.
 *
 * Returns null whenever the fee is not actually knowable — chiefly when the
 * vendor has no geolocation. A cue is never a guess.
 */
export type DeliveryCue =
  | { kind: "free"; usesLeft: number }
  | { kind: "fee"; amount: number };

/** The delivery surcharge window in useCart — evenings and overnight. */
const isNightRate = (hour: number) => hour >= 19 || hour < 6;

export function estimateDeliveryFee(
  distanceKm: number,
  config: PlatformConfig,
  now: Date
): number {
  const baseFee = Math.max(Math.ceil(distanceKm * config.pricePerKm), config.minBaseFee);
  const unit = config.roundingUnit > 0 ? config.roundingUnit : 1;
  let fee = Math.ceil(baseFee / unit) * unit;
  if (isNightRate(now.getHours())) fee += config.nighttimeSurcharge;
  return fee;
}

export function deliveryCueFor(
  distanceKm: number | null,
  config: PlatformConfig,
  freeDeliveryUsesLeft: number,
  now: Date
): DeliveryCue | null {
  if (config.freeDeliveryEnabled && freeDeliveryUsesLeft > 0) {
    return { kind: "free", usesLeft: freeDeliveryUsesLeft };
  }
  if (distanceKm === null) return null;
  return { kind: "fee", amount: estimateDeliveryFee(distanceKm, config, now) };
}
