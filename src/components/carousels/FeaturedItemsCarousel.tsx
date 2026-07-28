import React, { useState, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ShoppingBag, Check, Flame } from "lucide-react";
import { MenuItem } from "../../pages/mood/types/types";
import { useCartContext } from "../../context/cartContext";
import { triggerAddToCartToast } from "../my-components/AddToCartToast";
import posthog from "posthog-js";

interface FeaturedItemsCarouselProps {
  items: MenuItem[];
  vendorNameMap: Record<string, string>;
  vendorOpenMap: Record<string, boolean>;
  isFullWidth?: boolean;
}

const swipeThreshold = 30;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
    scale: 0.92,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
    scale: 0.92,
  }),
};

export const FeaturedItemsCarousel: React.FC<FeaturedItemsCarouselProps> = ({
  items,
  vendorNameMap,
  vendorOpenMap,
  isFullWidth = false,
}) => {
  const { addToCart } = useCartContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const isDragging = useRef(false);

  if (!items || items.length === 0) return null;

  const safeIndex = ((currentIndex % items.length) + items.length) % items.length;
  const currentItem = items[safeIndex];
  const vendorName = vendorNameMap[currentItem.vendor_id] || "Sosika Partner";
  const isVendorOpen = vendorOpenMap[currentItem.vendor_id] !== false;
  const isAvailable = currentItem.is_available !== false;
  const canAdd = isAvailable && isVendorOpen;
  const isAdded = !!addedItemIds[currentItem.id];

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      const next = prev + newDirection;
      return ((next % items.length) + items.length) % items.length;
    });
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    isDragging.current = false;
    const { offset, velocity } = info;
    if (Math.abs(offset.x) > swipeThreshold || Math.abs(velocity.x) > 300) {
      if (offset.x < 0) {
        paginate(1);
      } else {
        paginate(-1);
      }
    }
  };

  const handleAdd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isDragging.current || !canAdd) return;
    addToCart({ ...currentItem, quantity: 1 } as any);
    triggerAddToCartToast(currentItem);
    posthog.capture("order_started", {
      platform: "app",
      item_id: currentItem.id,
      item_name: currentItem.name,
      source: "featured_carousel_widget",
    });
    setAddedItemIds((prev) => ({ ...prev, [currentItem.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [currentItem.id]: false }));
    }, 1200);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-lg shadow-black/30 select-none ${
        isFullWidth ? "col-span-2 h-[200px]" : "h-[200px]"
      }`}
    >
      {/* Swipeable Content Area — fills entire card */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentItem.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 350, damping: 35 },
            opacity: { duration: 0.2 },
            scale: { duration: 0.25 },
          }}
          drag={items.length > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragStart={() => { isDragging.current = true; }}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 flex flex-col justify-end cursor-grab active:cursor-grabbing"
        >
          {/* Background Image */}
          {currentItem.image_url ? (
            <img
              src={currentItem.image_url}
              alt={currentItem.name}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-zinc-900 to-[#00bfff]/10" />
          )}
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-black/20" />

          {/* Floating "Featured" pill — top-left, minimal */}
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/10">
            <Flame className="w-2.5 h-2.5 text-amber-400" />
            <span className="text-[8px] font-bold text-amber-300/90 uppercase tracking-wider">
              Featured
            </span>
          </div>

          {/* Bottom Content */}
          <div className="relative z-10 p-3 pr-10">
            <p className="text-[8px] font-semibold text-zinc-400 truncate uppercase tracking-wide mb-0.5">
              {vendorName}
            </p>
            <h4 className="text-[13px] font-bold text-white leading-tight truncate">
              {currentItem.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[#00bfff] text-xs font-extrabold">
                {Number(currentItem.price).toLocaleString()} TZS
              </span>
              {!isVendorOpen && (
                <span className="text-[7px] font-bold text-amber-400 bg-amber-500/20 px-1 rounded uppercase">
                  Closed
                </span>
              )}
            </div>
          </div>

          {/* Quick Add Button */}
          <button
            onClick={handleAdd}
            onTouchEnd={(e) => { if (!isDragging.current) handleAdd(e); }}
            disabled={isAdded || !canAdd}
            className={`absolute right-2.5 bottom-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
              isAdded
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 scale-110"
                : !canAdd
                ? "bg-zinc-800/60 text-zinc-600 border border-white/5 cursor-not-allowed"
                : "bg-[#00bfff] text-black hover:bg-[#33ccff] active:scale-90 shadow-lg shadow-[#00bfff]/30"
            }`}
            aria-label={!canAdd ? "Unavailable" : `Add ${currentItem.name}`}
          >
            {isAdded ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <ShoppingBag className="w-3.5 h-3.5" />
            )}
          </button>
        </motion.div>
      </AnimatePresence>

      {/* iOS-style dots — overlaid at bottom center */}
      {items.length > 1 && (
        <div className="absolute bottom-1.5 left-0 right-0 flex items-center justify-center gap-[5px] z-30 pointer-events-none">
          {items.map((_, idx) => (
            <div
              key={idx}
              className={`h-[5px] rounded-full transition-all duration-300 ${
                idx === safeIndex
                  ? "w-[14px] bg-white shadow-sm shadow-white/50"
                  : "w-[5px] bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
