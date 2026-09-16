import { Check } from "lucide-react";
import BottomSheet from "../../../components/my-components/BottomSheet";
import { SortId, SORT_LABELS, SORT_SUBLABELS } from "./useResultsFilters";

interface SortSheetProps {
  isOpen: boolean;
  onClose: () => void;
  value: SortId;
  onChange: (value: SortId) => void;
  mood: string;
}

const ORDER: SortId[] = ["best", "fastest", "closest", "cheapest", "rated"];

/**
 * Board C10 — the sort options, plus a plain-language account of what "Best
 * match" actually weighs. A ranked list the user can't interrogate reads as
 * arbitrary no matter how good the maths is.
 */
export default function SortSheet({ isOpen, onClose, value, onChange, mood }: SortSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Sort by">
      <div className="flex flex-col">
        {ORDER.map((id, index) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              onChange(id);
              onClose();
            }}
            className={`flex items-start gap-3 py-3.5 text-left min-h-[44px] ${
              index < ORDER.length - 1 ? "border-b border-edge-1" : ""
            }`}
          >
            <span className="flex-1 min-w-0">
              <span
                className={`block text-sm ${
                  value === id ? "font-bold text-content" : "font-semibold text-content-secondary"
                }`}
              >
                {SORT_LABELS[id]}
              </span>
              <span className="block text-[11.5px] text-content-muted mt-0.5">
                {SORT_SUBLABELS[id]}
              </span>
              {id === "best" && (
                <span className="block text-[11.5px] text-content-muted mt-2 leading-relaxed">
                  Weighs how well it fits “{mood || "your mood"}”, whether the kitchen is open,
                  distance, rating, what you’ve ordered before, and the time of day.
                </span>
              )}
            </span>
            {value === id && <Check className="w-4 h-4 text-accent-ink flex-none mt-0.5" />}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
