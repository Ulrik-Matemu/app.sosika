import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Promotion } from "../../pages/mood/types/types";
import posthog from "posthog-js";

interface PromoBannerCarouselProps {
  promotions: Promotion[];
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

export const PromoBannerCarousel: React.FC<PromoBannerCarouselProps> = ({
  promotions,
  isFullWidth = false,
}) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const isDragging = useRef(false);

  // Auto advance every 5s, reset timer on manual swipe
  useEffect(() => {
    if (!promotions || promotions.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % promotions.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [promotions, currentIndex]);

  if (!promotions || promotions.length === 0) return null;

  const safeIndex = ((currentIndex % promotions.length) + promotions.length) % promotions.length;
  const currentPromo = promotions[safeIndex];

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      const next = prev + newDirection;
      return ((next % promotions.length) + promotions.length) % promotions.length;
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

  const handleClick = () => {
    if (isDragging.current) return;
    if (currentPromo.link_url) {
      posthog.capture("promo_clicked", {
        promo_id: currentPromo.id,
        promo_title: currentPromo.title,
        link_url: currentPromo.link_url,
      });
      if (currentPromo.link_url.startsWith("http")) {
        window.open(currentPromo.link_url, "_blank");
      } else {
        navigate(currentPromo.link_url);
      }
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-lg shadow-black/30 select-none cursor-pointer group ${
        isFullWidth ? "col-span-2 h-[200px]" : "h-[200px]"
      }`}
    >
      {/* Swipeable Content Area — fills entire card */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentPromo.id}
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
          drag={promotions.length > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragStart={() => { isDragging.current = true; }}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 flex flex-col justify-end cursor-grab active:cursor-grabbing"
        >
          {/* Cover Image Background */}
          {currentPromo.image_url ? (
            <img
              src={currentPromo.image_url}
              alt={currentPromo.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-zinc-900 to-[#00bfff]/15" />
          )}
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-black/15" />

          {/* Floating label pill — top-left, minimal */}
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/10">
            <Sparkles className="w-2.5 h-2.5 text-[#00bfff]" />
            <span className="text-[8px] font-bold text-[#00bfff]/90 uppercase tracking-wider">
              Promo
            </span>
          </div>

          {/* Bottom Content */}
          <div className="relative z-10 p-3 pr-9">
            <h4 className="text-[13px] font-bold text-white leading-tight line-clamp-2">
              {currentPromo.title}
            </h4>
            {currentPromo.subtitle && (
              <p className="text-[10px] text-zinc-300/80 mt-0.5 truncate leading-tight">
                {currentPromo.subtitle}
              </p>
            )}
          </div>

          {/* CTA Arrow */}
          {currentPromo.link_url && (
            <div className="absolute right-2.5 bottom-3 z-20 w-7 h-7 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center group-hover:bg-[#00bfff] group-hover:border-[#00bfff]/50 transition-all duration-300">
              <ArrowUpRight className="w-3.5 h-3.5 text-white group-hover:text-black transition-colors" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* iOS-style dots — overlaid at bottom center */}
      {promotions.length > 1 && (
        <div className="absolute bottom-1.5 left-0 right-0 flex items-center justify-center gap-[5px] z-30 pointer-events-none">
          {promotions.map((_, idx) => (
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
