import { ImageIcon } from "lucide-react";
import { RankedItem, formatDistance } from "./ranking";
import { useAddToCart } from "./useAddToCart";
import AddButton from "./AddButton";
import { RatingInline, ReasonChip } from "./primitives";

/**
 * Board A — the top pick. Its label is "Top pick", not "Ready fastest": the
 * hero is the best-scoring orderable row, and claiming a speed the ranking
 * never measured is what the old screen got wrong.
 */
export default function HeroCard({ ranked }: { ranked: RankedItem }) {
  const { item, vendorName } = ranked;
  const { state, add, label } = useAddToCart(item, ranked.isOpen, "results_page_hero");

  const distance = formatDistance(ranked.distanceKm);
  const trip = [distance, ranked.etaMin !== null ? `${ranked.etaMin} min` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-[18px] overflow-hidden border border-edge-2 bg-surface-2">
      <div className="relative w-full h-[188px] bg-[repeating-linear-gradient(135deg,#17171A_0_7px,#131316_7px_14px)] flex items-center justify-center">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt=""
            width={390}
            height={188}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="w-9 h-9 text-content-faint" strokeWidth={1.4} />
        )}

        <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-sm px-2.5 py-[5px]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              ranked.isOpen ? "bg-sosika-emerald" : "bg-content-muted"
            }`}
          />
          <span
            className={`text-[11px] font-bold ${
              ranked.isOpen ? "text-emerald-ink" : "text-content-tertiary"
            }`}
          >
            {ranked.isOpen ? "OPEN" : "CLOSED"}
          </span>
        </span>

        {/* Only rendered when the vendor's location is actually known. */}
        {trip && (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-black/65 backdrop-blur-sm px-2.5 py-[5px] font-mono text-[11px] font-semibold text-white">
            {trip}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2.5">
        {ranked.reason && (
          <div>
            <ReasonChip>{ranked.reason}</ReasonChip>
          </div>
        )}

        <div>
          <h2 className="text-[19px] font-extrabold leading-tight tracking-[-0.01em] text-content">
            {item.name}
          </h2>
          <div className="text-[13.5px] text-content-tertiary mt-1 flex items-center gap-1.5 min-w-0">
            <span className="truncate">{vendorName}</span>
            {(item.ratingCount ?? 0) > 0 && (
              <>
                <span className="w-[3px] h-[3px] rounded-full bg-content-faint flex-none" />
                <span className="flex-none">
                  <RatingInline average={item.averageRating} count={item.ratingCount} size={12} />
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <span className="font-mono text-[21px] font-bold text-content">
            {ranked.price.toLocaleString()}
          </span>
          <AddButton state={state} onAdd={add} label={label} variant="hero" />
        </div>
      </div>
    </div>
  );
}
