import { useCallback, useEffect, useMemo, useState } from "react";

export type SortId = "best" | "fastest" | "closest" | "cheapest" | "rated";

export const SORT_LABELS: Record<SortId, string> = {
  best: "Best match",
  fastest: "Fastest",
  closest: "Closest",
  cheapest: "Cheapest",
  rated: "Top rated",
};

export const SORT_SUBLABELS: Record<SortId, string> = {
  best: "Our default ranking",
  fastest: "Shortest ETA first",
  closest: "Shortest distance first",
  cheapest: "Lowest price first",
  rated: "Highest rating first",
};

export interface FilterState {
  openNow: boolean;
  priceMin: number;
  priceMax: number;
  maxDistanceKm: number | null;
  minRating: number;
  vendorIds: string[];
}

/** The range the sliders span, derived from the result set itself. */
export interface FilterBounds {
  priceMin: number;
  priceMax: number;
  distanceMax: number;
}

export const RATING_STEPS = [0, 3.5, 4, 4.5] as const;

const baseState = (bounds: FilterBounds): FilterState => ({
  openNow: false,
  priceMin: bounds.priceMin,
  priceMax: bounds.priceMax,
  maxDistanceKm: null,
  minRating: 0,
  vendorIds: [],
});

function countActive(state: FilterState, bounds: FilterBounds): number {
  let n = 0;
  if (state.openNow) n += 1;
  if (state.priceMin > bounds.priceMin || state.priceMax < bounds.priceMax) n += 1;
  if (state.maxDistanceKm !== null) n += 1;
  if (state.minRating > 0) n += 1;
  if (state.vendorIds.length > 0) n += 1;
  return n;
}

/**
 * Filter and sort state for the results screen.
 *
 * The sheet edits a draft; nothing changes behind it until Apply. Sort, which
 * has its own sheet and one-tap options, applies immediately.
 */
export function useResultsFilters(bounds: FilterBounds) {
  const [applied, setAppliedState] = useState<FilterState>(() => baseState(bounds));
  const [draft, setDraftState] = useState<FilterState>(() => baseState(bounds));
  const [sort, setSort] = useState<SortId>("best");
  const [priceTouched, setPriceTouched] = useState(false);

  // The price band's range comes from the results, which arrive after the
  // first render. Until someone actually drags a handle, keep the band pinned
  // to the full range so it neither filters anything out nor shows a figure
  // outside the slider it belongs to.
  useEffect(() => {
    if (priceTouched) return;
    const snap = (prev: FilterState): FilterState => ({
      ...prev,
      priceMin: bounds.priceMin,
      priceMax: bounds.priceMax,
    });
    setAppliedState(snap);
    setDraftState(snap);
  }, [bounds.priceMin, bounds.priceMax, priceTouched]);

  const setDraft = useCallback((patch: Partial<FilterState>) => {
    if (patch.priceMin !== undefined || patch.priceMax !== undefined) setPriceTouched(true);
    setDraftState((prev) => ({ ...prev, ...patch }));
  }, []);

  /** Pull the sheet's draft back in sync before showing it. */
  const openDraft = useCallback(() => setDraftState(applied), [applied]);

  const apply = useCallback(() => setAppliedState(draft), [draft]);

  const reset = useCallback(() => {
    setPriceTouched(false);
    setDraftState(baseState(bounds));
  }, [bounds]);

  const clearAll = useCallback(() => {
    setPriceTouched(false);
    const fresh = baseState(bounds);
    setDraftState(fresh);
    setAppliedState(fresh);
  }, [bounds]);

  const clearOne = useCallback(
    (key: keyof FilterState) => {
      const fresh = baseState(bounds);
      setAppliedState((prev) => ({ ...prev, [key]: fresh[key] }));
    },
    [bounds]
  );

  const clearPriceBand = useCallback(() => {
    setPriceTouched(false);
    setAppliedState((prev) => ({ ...prev, priceMin: bounds.priceMin, priceMax: bounds.priceMax }));
  }, [bounds]);

  const activeCount = useMemo(() => countActive(applied, bounds), [applied, bounds]);
  const draftActiveCount = useMemo(() => countActive(draft, bounds), [draft, bounds]);

  return {
    applied,
    draft,
    setDraft,
    openDraft,
    apply,
    reset,
    clearAll,
    clearOne,
    clearPriceBand,
    activeCount,
    draftActiveCount,
    sort,
    setSort,
  };
}
