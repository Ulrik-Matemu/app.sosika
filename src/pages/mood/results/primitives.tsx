import { Star } from "lucide-react";
import { DeliveryCue } from "./deliveryEstimate";

/** Mono uppercase section label — the canvas's eyebrow token. */
export const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-faint flex items-center gap-1.5">
    {children}
  </div>
);

/**
 * The one-line explanation of why a row ranked where it did (board B1,
 * variant A — inline, above the dish name).
 */
export const ReasonChip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 border border-edge-2 text-content-secondary text-[11px] font-bold px-2.5 py-1 whitespace-nowrap">
    {children}
  </span>
);

/** Dish thumbnail. Lazy, explicitly sized, with a hatched placeholder. */
export const Thumb = ({
  src,
  size = 52,
  className = "",
}: {
  src?: string;
  size?: number;
  className?: string;
}) => (
  <div
    style={{ width: size, height: size }}
    className={`flex-none rounded-[14px] overflow-hidden bg-[repeating-linear-gradient(135deg,#17171A_0_7px,#131316_7px_14px)] ${className}`}
  >
    {src && (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
      />
    )}
  </div>
);

/**
 * Inline rating. Renders nothing without real reviews behind it — vendor
 * onboarding seeds `averageRating: 5, ratingCount: 0`, which would otherwise
 * show every new kitchen as a perfect 5.0.
 */
export const RatingInline = ({
  average,
  count,
  size = 11,
}: {
  average?: number;
  count?: number;
  size?: number;
}) => {
  if (!count || count <= 0 || typeof average !== "number") return null;
  return (
    <span className="inline-flex items-center gap-1 text-content-secondary">
      <Star style={{ width: size, height: size }} className="fill-current" strokeWidth={0} />
      <span className="font-mono font-bold">{average.toFixed(1)}</span>
    </span>
  );
};

/** Board D13 — amber for the money-positive case, plain mono for a real fee. */
export const DeliveryCueLabel = ({ cue }: { cue: DeliveryCue | null }) => {
  if (!cue) return null;
  if (cue.kind === "free") {
    return (
      <span className="font-mono text-[11px] font-bold text-amber-ink">
        Free delivery pass · {cue.usesLeft} left
      </span>
    );
  }
  return (
    <span className="font-mono text-[11px] text-content-muted">
      + {cue.amount.toLocaleString()} delivery
    </span>
  );
};

/** The separating hairline between rows inside a section card. */
export const RowDivider = () => <div className="h-px bg-edge-1" />;
