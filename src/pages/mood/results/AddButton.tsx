import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { AddState } from "./useAddToCart";

interface AddButtonProps {
  state: AddState;
  onAdd: () => void;
  label: string;
  /** "row" is the 34px circle in a list; "hero" is the filled cyan pill. */
  variant?: "row" | "hero";
}

/** Add-to-cart control, board D11. One filled cyan instance per screen (the hero). */
export default function AddButton({ state, onAdd, label, variant = "row" }: AddButtonProps) {
  const disabled = state === "closed" || state === "soldout";

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled || state === "added"}
        aria-label={label}
        className={`h-[42px] min-w-[44px] px-5 rounded-full flex items-center gap-1.5 text-sm font-bold transition-all ${
          state === "added"
            ? "bg-sosika-emerald/20 text-emerald-ink"
            : disabled
            ? "bg-surface-3 text-content-faint cursor-not-allowed"
            : "bg-sosika-cyan text-on-accent active:scale-95"
        }`}
      >
        {state === "added" ? (
          <>
            <Check className="w-4 h-4" />
            Added
          </>
        ) : state === "closed" ? (
          "Closed"
        ) : state === "soldout" ? (
          "Sold out"
        ) : (
          <>
            <Plus className="w-[15px] h-[15px]" strokeWidth={2.5} />
            Add
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled || state === "added"}
      aria-label={label}
      className={`w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
        state === "added"
          ? "bg-sosika-emerald/20 border border-sosika-emerald/30"
          : disabled
          ? "bg-surface-1 border border-edge-1 opacity-40 cursor-not-allowed"
          : "bg-surface-3 border border-edge-3 active:scale-90"
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === "added" ? (
          <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Check className="w-3.5 h-3.5 text-emerald-ink" />
          </motion.span>
        ) : (
          <motion.span key="plus" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Plus
              className={`w-3.5 h-3.5 ${disabled ? "text-content-faint" : "text-content-secondary"}`}
              strokeWidth={2.25}
            />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
