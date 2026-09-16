import { Children, ReactNode, useState } from "react";
import { Sparkles } from "lucide-react";
import { Eyebrow } from "./primitives";

interface ResultsSectionProps {
  title: string;
  /** "divider" is the lower-confidence tier, board B4 variant B. */
  variant?: "eyebrow" | "divider";
  icon?: ReactNode;
  /** Rows shown before the "Show all" expander. 0 disables the cap. */
  initialVisible?: number;
  children: ReactNode;
}

const DEFAULT_VISIBLE = 8;

/**
 * A titled block of ranked rows. The lower-confidence tier gets a labelled
 * divider instead of an eyebrow, so the section names itself as a broader
 * guess rather than relying on dimming that reads as a loading glitch.
 */
export default function ResultsSection({
  title,
  variant = "eyebrow",
  icon,
  initialVisible = DEFAULT_VISIBLE,
  children,
}: ResultsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  // A section can hold a hundred dishes when one kitchen dominates the area.
  // Capping keeps the DOM small on a cheap phone without hiding anything.
  const rows = Children.toArray(children);
  const capped = initialVisible > 0 && !expanded && rows.length > initialVisible;
  const visible = capped ? rows.slice(0, initialVisible) : rows;

  return (
    <section>
      {variant === "divider" ? (
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex-1 h-px bg-edge-1" />
          <div className="text-[11px] text-content-faint whitespace-nowrap flex items-center gap-1.5">
            <Sparkles className="w-[11px] h-[11px]" strokeWidth={1.6} />
            {title}
          </div>
          <div className="flex-1 h-px bg-edge-1" />
        </div>
      ) : (
        <div className="mb-2.5">
          <Eyebrow>
            {icon}
            {title}
          </Eyebrow>
        </div>
      )}

      <div className="rounded-[18px] border border-edge-1 bg-surface-1 px-3.5 divide-y divide-edge-1">
        {visible}
        {capped && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full py-3.5 text-center text-xs font-bold text-accent-ink"
          >
            Show all {rows.length}
          </button>
        )}
      </div>
    </section>
  );
}
