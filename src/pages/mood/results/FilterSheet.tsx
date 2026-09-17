import BottomSheet from "../../../components/my-components/BottomSheet";
import { Eyebrow } from "./primitives";
import { FilterBounds, FilterState, RATING_STEPS } from "./useResultsFilters";

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  draft: FilterState;
  setDraft: (patch: Partial<FilterState>) => void;
  bounds: FilterBounds;
  /** Only kitchens actually present in the current results. */
  vendors: { id: string; name: string }[];
  draftActiveCount: number;
  onApply: () => void;
  onReset: () => void;
}

const Pill = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
      active
        ? "bg-sosika-cyan text-on-accent"
        : "bg-surface-2 text-content-tertiary border border-edge-2"
    }`}
  >
    {children}
  </button>
);

/**
 * Board C9. Every control here maps to a field the data actually carries —
 * the canvas's "Dietary" group is omitted because nothing in the app writes
 * dietary tags to a menu item, so it could only ever return nothing.
 */
export default function FilterSheet({
  isOpen,
  onClose,
  draft,
  setDraft,
  bounds,
  vendors,
  draftActiveCount,
  onApply,
  onReset,
}: FilterSheetProps) {
  const distanceSliderMax = Math.max(1, Math.ceil(bounds.distanceMax));
  const distanceValue = draft.maxDistanceKm ?? distanceSliderMax;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Filters"
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="h-12 px-5 rounded-2xl bg-surface-3 border border-edge-3 text-sm font-bold text-content"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            className="flex-1 h-12 rounded-2xl bg-sosika-cyan text-on-accent text-sm font-bold active:opacity-90"
          >
            Apply{draftActiveCount > 0 ? ` (${draftActiveCount})` : ""}
          </button>
        </div>
      }
    >
      <button
        type="button"
        onClick={() => setDraft({ openNow: !draft.openNow })}
        className="flex items-center justify-between py-1 text-left"
      >
        <span className="text-sm font-semibold text-content">Open now only</span>
        <span
          className={`w-[46px] h-[26px] rounded-full p-[3px] transition-colors ${
            draft.openNow ? "bg-sosika-cyan" : "bg-content-faint"
          }`}
        >
          <span
            className={`block w-5 h-5 rounded-full bg-ground transition-transform ${
              draft.openNow ? "translate-x-5" : ""
            }`}
          />
        </span>
      </button>

      <div>
        <div className="flex items-baseline justify-between mb-2.5">
          <Eyebrow>Price band</Eyebrow>
          <span className="font-mono text-[11.5px] font-bold text-content-secondary">
            {draft.priceMin.toLocaleString()} – {draft.priceMax.toLocaleString()}
          </span>
        </div>
        <label className="block text-[11px] text-content-muted mb-1">Minimum</label>
        <input
          type="range"
          min={bounds.priceMin}
          max={bounds.priceMax}
          step={500}
          value={draft.priceMin}
          onChange={(e) =>
            setDraft({ priceMin: Math.min(Number(e.target.value), draft.priceMax) })
          }
          className="w-full accent-sosika-cyan"
        />
        <label className="block text-[11px] text-content-muted mt-2 mb-1">Maximum</label>
        <input
          type="range"
          min={bounds.priceMin}
          max={bounds.priceMax}
          step={500}
          value={draft.priceMax}
          onChange={(e) =>
            setDraft({ priceMax: Math.max(Number(e.target.value), draft.priceMin) })
          }
          className="w-full accent-sosika-cyan"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2.5">
          <Eyebrow>Distance</Eyebrow>
          <span className="font-mono text-[11.5px] font-bold text-content-secondary">
            {draft.maxDistanceKm === null ? "Any" : `within ${draft.maxDistanceKm.toFixed(1)} km`}
          </span>
        </div>
        <input
          type="range"
          min={0.5}
          max={distanceSliderMax}
          step={0.5}
          value={distanceValue}
          onChange={(e) => {
            const value = Number(e.target.value);
            setDraft({ maxDistanceKm: value >= distanceSliderMax ? null : value });
          }}
          className="w-full accent-sosika-cyan"
        />
      </div>

      <div>
        <div className="mb-2.5">
          <Eyebrow>Minimum rating</Eyebrow>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {RATING_STEPS.map((step) => (
            <Pill
              key={step}
              active={draft.minRating === step}
              onClick={() => setDraft({ minRating: step })}
            >
              {step === 0 ? "Any" : `${step}+`}
            </Pill>
          ))}
        </div>
      </div>

      {vendors.length > 1 && (
        <div>
          <div className="mb-2.5">
            <Eyebrow>Kitchens</Eyebrow>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {vendors.map((vendor) => {
              const active = draft.vendorIds.includes(vendor.id);
              return (
                <Pill
                  key={vendor.id}
                  active={active}
                  onClick={() =>
                    setDraft({
                      vendorIds: active
                        ? draft.vendorIds.filter((id) => id !== vendor.id)
                        : [...draft.vendorIds, vendor.id],
                    })
                  }
                >
                  {vendor.name}
                </Pill>
              );
            })}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
