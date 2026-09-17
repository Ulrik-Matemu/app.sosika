import { useEffect, useState } from "react";
import BottomSheet from "../../../components/my-components/BottomSheet";
import { useCartContext } from "../../../context/cartContext";
import { triggerAddToCartToast } from "../../../components/my-components/AddToCartToast";
import posthog from "../../../lib/posthog";
import { DishGroup, formatDistance } from "./ranking";
import { toCartItem } from "./toCartItem";

interface VendorPickerSheetProps {
  group: DishGroup | null;
  onClose: () => void;
}

/**
 * Board B3 variant B — which kitchen to buy this dish from, cheapest first,
 * with the distance and ETA that decide the trade-off.
 */
export default function VendorPickerSheet({ group, onClose }: VendorPickerSheetProps) {
  const { addToCart } = useCartContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(group?.options[0]?.item.id ?? null);
  }, [group]);

  if (!group) return null;

  const selected = group.options.find((o) => o.item.id === selectedId) ?? group.options[0];

  const handleAdd = () => {
    if (!selected || !selected.isOpen || !selected.isAvailable) return;
    addToCart(toCartItem(selected.item));
    triggerAddToCartToast(selected.item);
    posthog.capture("order_started", {
      platform: "app",
      item_id: selected.item.id,
      item_name: selected.item.name,
      source: "results_page_vendor_picker",
    });
    onClose();
  };

  const canAdd = !!selected && selected.isOpen && selected.isAvailable;

  return (
    <BottomSheet
      isOpen
      onClose={onClose}
      title={group.primary.item.name}
      footer={
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className={`w-full h-11 rounded-2xl font-bold text-sm transition-opacity ${
            canAdd
              ? "bg-sosika-cyan text-on-accent active:opacity-90"
              : "bg-surface-3 text-content-faint cursor-not-allowed"
          }`}
        >
          {canAdd ? `Add from ${selected.vendorName}` : "Closed right now"}
        </button>
      }
    >
      <p className="text-[11.5px] text-content-muted -mt-2">
        Sorted by price · {group.options.length} kitchens nearby
      </p>

      <div className="flex flex-col">
        {group.options.map((option, index) => {
          const isSelected = option.item.id === selected?.item.id;
          const unavailable = !option.isOpen || !option.isAvailable;
          const distance = formatDistance(option.distanceKm);

          return (
            <button
              key={option.item.id}
              type="button"
              onClick={() => setSelectedId(option.item.id)}
              disabled={unavailable}
              className={`flex items-center gap-3 py-3 text-left min-h-[44px] ${
                index < group.options.length - 1 ? "border-b border-edge-1" : ""
              } ${unavailable ? "opacity-45 cursor-not-allowed" : ""}`}
            >
              <span
                className={`w-4 h-4 rounded-full border flex-none flex items-center justify-center ${
                  isSelected ? "border-content" : "border-edge-3"
                }`}
              >
                {isSelected && <span className="w-2 h-2 rounded-full bg-content" />}
              </span>

              <span className="flex-1 min-w-0">
                <span
                  className={`block text-sm truncate ${
                    isSelected ? "font-bold text-content" : "font-semibold text-content-secondary"
                  }`}
                >
                  {option.vendorName}
                </span>
                <span className="block font-mono text-[11.5px] text-content-muted mt-0.5">
                  {!option.isOpen
                    ? "Closed"
                    : [distance, option.etaMin !== null ? `${option.etaMin} min` : null]
                        .filter(Boolean)
                        .join(" · ") || "Nearby"}
                </span>
              </span>

              <span
                className={`font-mono text-sm font-bold flex-none ${
                  isSelected ? "text-content" : "text-content-secondary"
                }`}
              >
                {option.price.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
