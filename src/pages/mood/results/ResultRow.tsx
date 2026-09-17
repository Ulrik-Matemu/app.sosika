import { RankedItem } from "./ranking";
import { DeliveryCue } from "./deliveryEstimate";
import { useAddToCart } from "./useAddToCart";
import AddButton from "./AddButton";
import { DeliveryCueLabel, RatingInline, ReasonChip, Thumb } from "./primitives";

interface ResultRowProps {
  ranked: RankedItem;
  /** Section id, so PostHog can tell which surface converted. */
  source: string;
  cue?: DeliveryCue | null;
  /** Board D12 — the cart already has something from this kitchen. */
  sameKitchen?: boolean;
  /** Board C8/A — only ever a time the platform actually knows. */
  opensAtLabel?: string | null;
  /** The lower-confidence tier reads as secondary. */
  dimmed?: boolean;
}

/**
 * One ranked dish, board B2 variant A (52px thumbnail row) with the reason
 * chip above the name, board B1 variant A.
 */
export default function ResultRow({
  ranked,
  source,
  cue = null,
  sameKitchen = false,
  opensAtLabel = null,
  dimmed = false,
}: ResultRowProps) {
  const { item, vendorName } = ranked;
  const { state, add, label } = useAddToCart(item, ranked.isOpen, `results_page_${source}`);

  // One chip per row, or it becomes wallpaper. The same-kitchen nudge is worth
  // more than the ranking reason once the cart is non-empty.
  const chip = sameKitchen ? "Same kitchen · no extra delivery" : ranked.reason;

  return (
    <div className={`flex items-center gap-3 py-3 ${dimmed ? "opacity-60" : ""}`}>
      <Thumb src={item.image_url} className={dimmed ? "grayscale-[0.4]" : ""} />

      <div className="flex-1 min-w-0">
        {chip && (
          <div className="mb-[5px]">
            <ReasonChip>
              {sameKitchen ? <span className="text-emerald-ink">{chip}</span> : chip}
            </ReasonChip>
          </div>
        )}

        <div className={`text-[15px] font-bold truncate ${dimmed ? "text-content-secondary" : "text-content"}`}>
          {item.name}
        </div>

        <div className="text-[12.5px] text-content-tertiary mt-0.5 flex items-center gap-1.5 min-w-0">
          <span className="truncate">{vendorName}</span>
          {ranked.distanceKm !== null && ranked.isOpen && (
            <>
              <span className="w-[3px] h-[3px] rounded-full bg-content-faint flex-none" />
              <span className="font-mono text-[11.5px] flex-none">
                {ranked.distanceKm < 1
                  ? `${Math.round(ranked.distanceKm * 1000)}m`
                  : `${ranked.distanceKm.toFixed(1)}km`}
              </span>
            </>
          )}
          {(item.ratingCount ?? 0) > 0 && (
            <>
              <span className="w-[3px] h-[3px] rounded-full bg-content-faint flex-none" />
              <span className="flex-none">
                <RatingInline average={item.averageRating} count={item.ratingCount} />
              </span>
            </>
          )}
        </div>

        {opensAtLabel && (
          <div className="font-mono text-[11.5px] text-amber-ink mt-1">{opensAtLabel}</div>
        )}
        {!opensAtLabel && cue && (
          <div className="mt-1">
            <DeliveryCueLabel cue={cue} />
          </div>
        )}
      </div>

      <div className="flex-none flex flex-col items-end gap-[7px]">
        <span className={`font-mono text-[14.5px] font-bold ${dimmed ? "text-content-tertiary" : "text-content"}`}>
          {ranked.price.toLocaleString()}
        </span>
        <AddButton state={state} onAdd={add} label={label} />
      </div>
    </div>
  );
}
