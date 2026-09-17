import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
}

/**
 * Shared "sheet" pattern from the design canvas — rounded top corners, dark
 * surface, drag handle, header with title + close, scrollable body, optional
 * sticky footer for the primary CTA. Used for cart/checkout, location,
 * top-up, and photo-reward sheets.
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  closeLabel = "Close",
}: BottomSheetProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-scrim backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-transparent"
        />

        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative z-10 w-full sm:max-w-md max-h-[88vh] overflow-y-auto bg-elevated border-t border-edge-3 rounded-t-[28px] shadow-2xl text-content select-none"
        >
          <div className="w-10 h-1 bg-edge-3 rounded-full mx-auto mt-3 mb-1 cursor-grab" />

          {title !== undefined && (
            <div className="flex items-center justify-between px-5 sm:px-6 pt-3 pb-4">
              <h2 className="text-[19px] font-bold tracking-[-0.02em]">{title}</h2>
              <button
                onClick={onClose}
                aria-label={closeLabel}
                className="text-[13px] font-semibold text-content-muted hover:text-content transition-colors flex items-center gap-1"
              >
                {closeLabel}
                <X size={14} className="sm:hidden" />
              </button>
            </div>
          )}

          <div className="px-5 sm:px-6 pb-6 flex flex-col gap-4">{children}</div>

          {footer && (
            <div className="px-5 sm:px-6 pb-6 sm:pb-6 pt-1">{footer}</div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
