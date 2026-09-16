import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ArrowRight, X } from "lucide-react";
import { useCartContext } from "../../context/cartContext";

interface ToastMessage {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

let toastListener: ((toast: ToastMessage) => void) | null = null;

export const triggerAddToCartToast = (item: { name: string; price: number | string; image_url?: string }) => {
  if (toastListener) {
    toastListener({
      id: Date.now().toString(),
      name: item.name,
      price: typeof item.price === "number" ? item.price : parseFloat(item.price as string) || 0,
      imageUrl: item.image_url,
    });
  }
};

export default function AddToCartToast({ onOpenCart }: { onOpenCart: () => void }) {
  const { cart } = useCartContext();
  const [activeToast, setActiveToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    toastListener = (toast) => {
      setActiveToast(toast);
    };

    return () => {
      toastListener = null;
    };
  }, []);

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const totalCartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  if (!activeToast) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.95 }}
          className="pointer-events-auto bg-elevated/95 border border-sosika-cyan/30 backdrop-blur-xl rounded-2xl p-3 shadow-2xl shadow-black/80 flex items-center justify-between gap-3 text-content"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {activeToast.imageUrl ? (
              <img
                src={activeToast.imageUrl}
                alt={activeToast.name}
                className="w-10 h-10 rounded-xl object-cover border border-edge-3 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-sosika-cyan/10 border border-sosika-cyan/20 text-accent-ink flex items-center justify-center shrink-0">
                <ShoppingBag size={18} />
              </div>
            )}

            <div className="min-w-0">
              <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider block">
                Added to Cart ✓
              </span>
              <h4 className="text-xs font-bold text-content truncate">{activeToast.name}</h4>
              <p className="text-[11px] font-mono text-accent-ink">
                {activeToast.price.toLocaleString()} TZS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onOpenCart}
              className="bg-sosika-cyan hover:bg-sosika-cyan text-black font-extrabold px-3 py-2 rounded-xl text-[11px] flex items-center gap-1 shadow-md shadow-sosika-cyan/20 transition-all cursor-pointer active:scale-95"
            >
              <span>View Cart ({totalCartCount})</span>
              <ArrowRight size={12} />
            </button>

            <button
              onClick={() => setActiveToast(null)}
              className="p-1.5 text-content-muted hover:text-content transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
