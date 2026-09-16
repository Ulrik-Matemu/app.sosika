import { ChevronRight } from "lucide-react";
import { DishGroup } from "./ranking";
import { DeliveryCue } from "./deliveryEstimate";
import ResultRow from "./ResultRow";
import { Thumb } from "./primitives";

interface DishGroupRowProps {
  group: DishGroup;
  source: string;
  cue?: DeliveryCue | null;
  sameKitchen?: boolean;
  opensAtLabel?: string | null;
  dimmed?: boolean;
  onExpand: (group: DishGroup) => void;
}

/**
 * Board B3. The same dish from several kitchens collapses into one row that
 * opens a vendor picker; a dish only one kitchen sells renders as a plain row
 * with no chevron and no count — never imply a choice that isn't there.
 */
export default function DishGroupRow({
  group,
  source,
  cue = null,
  sameKitchen = false,
  opensAtLabel = null,
  dimmed = false,
  onExpand,
}: DishGroupRowProps) {
  if (group.options.length < 2) {
    return (
      <ResultRow
        ranked={group.primary}
        source={source}
        cue={cue}
        sameKitchen={sameKitchen}
        opensAtLabel={opensAtLabel}
        dimmed={dimmed}
      />
    );
  }

  const { item } = group.primary;

  return (
    <button
      type="button"
      onClick={() => onExpand(group)}
      className={`w-full flex items-center gap-3 py-3 text-left min-h-[44px] ${dimmed ? "opacity-60" : ""}`}
    >
      <Thumb src={item.image_url} className={dimmed ? "grayscale-[0.4]" : ""} />

      <div className="flex-1 min-w-0">
        <div className={`text-[15px] font-bold truncate ${dimmed ? "text-content-secondary" : "text-content"}`}>
          {item.name}
        </div>
        <div className="text-[12.5px] text-content-tertiary mt-0.5">
          <span className="font-mono">{group.options.length} kitchens</span>
          {" · from "}
          <span className="font-mono">{group.fromPrice.toLocaleString()}</span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-content-muted flex-none" />
    </button>
  );
}
