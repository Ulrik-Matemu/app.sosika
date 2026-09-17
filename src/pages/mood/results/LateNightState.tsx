import { Moon } from "lucide-react";
import { DishGroup } from "./ranking";
import ResultRow from "./ResultRow";
import ResultsSection from "./ResultsSection";

interface LateNightStateProps {
  /** The hour the platform reopens — a real constant, not a per-vendor guess. */
  reopensAt: string;
  groups: DishGroup[];
}

/**
 * Board C8 — every kitchen is shut. The canvas puts a Pre-order button on each
 * row; there is no scheduled-order path in the app (checkout is hard-blocked
 * outside 06:00–22:00), so the rows are shown for planning only.
 */
export default function LateNightState({ reopensAt, groups }: LateNightStateProps) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col items-center text-center gap-4 pt-6">
        <div className="w-16 h-16 rounded-full bg-surface-2 border border-edge-2 flex items-center justify-center">
          <Moon className="w-[26px] h-[26px] text-content-muted" strokeWidth={1.75} />
        </div>
        <div>
          <div className="text-[19px] font-extrabold text-content">All kitchens are closed</div>
          <p className="text-[13.5px] text-content-tertiary mt-2 leading-relaxed max-w-[300px]">
            Everything nearby reopens at{" "}
            <span className="font-mono font-bold text-amber-ink">{reopensAt}</span>.
          </p>
        </div>
      </div>

      {groups.length > 0 && (
        <ResultsSection title={`Opens at ${reopensAt}`}>
          {groups.map((group) => (
            <ResultRow
              key={group.primary.item.id}
              ranked={group.primary}
              source="late_night"
              opensAtLabel={`Opens ${reopensAt}`}
            />
          ))}
        </ResultsSection>
      )}
    </div>
  );
}
