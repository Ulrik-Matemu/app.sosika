import { ChevronLeft, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { SortId, SORT_LABELS } from "./useResultsFilters";

interface ActiveChip {
  key: string;
  label: string;
  onClear: () => void;
}

interface ResultsHeaderProps {
  mood: string;
  locationLabel: string;
  resultCount: number;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
  onOpenSort: () => void;
  sort: SortId;
  activeChips: ActiveChip[];
  onBack: () => void;
}

/** Board A — sticky header: identity, result count, search, and the filter entry. */
export default function ResultsHeader({
  mood,
  locationLabel,
  resultCount,
  searchTerm,
  onSearchChange,
  activeFilterCount,
  onOpenFilters,
  onOpenSort,
  sort,
  activeChips,
  onBack,
}: ResultsHeaderProps) {
  return (
    <div className="sticky top-0 z-30 bg-chrome backdrop-blur-xl border-b border-edge-1">
      <div className="max-w-md mx-auto px-5 pt-3.5 pb-3 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="w-10 h-10 flex-none flex items-center justify-center rounded-full bg-surface-3 border border-edge-3"
          >
            <ChevronLeft className="w-[19px] h-[19px] text-content-secondary" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-[19px] font-extrabold leading-tight text-content truncate">
              <span className="capitalize">{mood || "Discovery"}</span>, near you
            </h1>
            <div className="text-[12.5px] text-content-tertiary mt-0.5 flex items-center gap-1 min-w-0">
              <MapPin className="w-[11px] h-[11px] text-content-muted flex-none" />
              <span className="truncate">{locationLabel}</span>
              <span className="w-[3px] h-[3px] rounded-full bg-content-faint flex-none" />
              <span className="font-mono flex-none">{resultCount}</span>
              <span className="flex-none">result{resultCount === 1 ? "" : "s"}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenFilters}
            aria-label={
              activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : "Filters"
            }
            className="relative h-10 px-3.5 flex-none flex items-center gap-1.5 rounded-full bg-surface-3 border border-edge-3"
          >
            <SlidersHorizontal className="w-[15px] h-[15px] text-content-secondary" />
            <span className="text-[13px] font-bold text-content">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-content text-ground font-mono text-[10px] font-extrabold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search dishes, kitchens…"
            className="w-full h-11 rounded-2xl bg-surface-2 border border-edge-2 pl-10 pr-9 text-sm text-content placeholder-content-muted outline-none focus:border-sosika-cyan/35 transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-content-muted hover:text-content transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onClear}
              className="flex-none inline-flex items-center gap-1.5 rounded-full bg-surface-3 border border-edge-3 text-content text-[11px] font-bold px-3 py-1.5"
            >
              {chip.label}
              <X className="w-[11px] h-[11px]" strokeWidth={2.25} />
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenSort}
            className="flex-none ml-auto text-[11px] font-bold text-content-tertiary whitespace-nowrap"
          >
            Sort: <span className="text-content">{SORT_LABELS[sort]}</span> ▾
          </button>
        </div>
      </div>
    </div>
  );
}
