import { SearchX } from "lucide-react";

interface ZeroResultStateProps {
  searchTerm: string;
  hasFilters: boolean;
  onClearFilters: () => void;
  onClearSearch: () => void;
}

/**
 * Board C7 — the current search and filters intersect to nothing, but the
 * results underneath are not empty. Always offer the widening move, never
 * just the dead end.
 */
export default function ZeroResultState({
  searchTerm,
  hasFilters,
  onClearFilters,
  onClearSearch,
}: ZeroResultStateProps) {
  const title = searchTerm
    ? hasFilters
      ? `No results for “${searchTerm}” with these filters`
      : `No results for “${searchTerm}”`
    : "No results with these filters";

  return (
    <div className="pt-10 pb-16 flex flex-col items-center text-center gap-5">
      <div className="w-16 h-16 rounded-full bg-surface-2 border border-edge-2 flex items-center justify-center">
        <SearchX className="w-[26px] h-[26px] text-content-muted" strokeWidth={1.75} />
      </div>

      <div>
        <div className="text-[17px] font-extrabold text-content">{title}</div>
        <p className="text-[13.5px] text-content-tertiary mt-2 leading-relaxed max-w-[280px]">
          {hasFilters
            ? "It might exist outside these filters — widen the search to see every section."
            : "Nothing nearby is named that right now."}
        </p>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="w-full h-12 rounded-2xl bg-sosika-cyan text-on-accent text-sm font-bold active:opacity-90 mt-2"
        >
          Widen to All
        </button>
      )}

      {searchTerm && (
        <button
          type="button"
          onClick={onClearSearch}
          className="h-10 px-[18px] rounded-full border border-edge-2 text-[13px] font-bold text-content"
        >
          Clear search
        </button>
      )}
    </div>
  );
}
