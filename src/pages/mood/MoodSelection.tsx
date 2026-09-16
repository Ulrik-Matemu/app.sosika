import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMood } from "../../hooks/useMood";
import { useDropCountdown } from "../../hooks/useDropCountdown";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import posthog from "./../../lib/posthog";
import { Search, Settings as SettingsIcon } from "lucide-react";
import DropCard from "../../components/my-components/DropCard";
import Navbar from "../../components/my-components/navbar";

const allMealTypes = [
  { name: "Breakfast", icon: "/icons/categories/breakfast.png", timeRange: [5, 11] as const },
  { name: "Lunch", icon: "/icons/categories/lunch.png", timeRange: [11, 16] as const },
  { name: "Dinner", icon: "/icons/categories/dinner2.png", timeRange: [16, 23] as const },
  { name: "Drink", icon: "/icons/categories/drinks.png", timeRange: null },
  { name: "Snack", icon: "/icons/categories/snacks.png", timeRange: null },
  { name: "Nearby", icon: "/icons/categories/nearby.png", timeRange: null }
];

const getMealTypeByTime = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "Breakfast";
  if (hour >= 11 && hour < 16) return "Lunch";
  return "Dinner";
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Late night cravings?";
};

export default function MoodSelection() {
  const [customMood, setCustomMood] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("");
  const { setMood } = useMood();
  const navigate = useNavigate();
  const dropCountdown = useDropCountdown();
  const { locations } = useLocationStorage();
  const currentLocationLabel = locations[0]?.address?.split(",")[0]?.trim() || "Set location";

  const currentMealType = useMemo(() => getMealTypeByTime(), []);

  const smartMoods = useMemo(() => {
    const mealOption = allMealTypes.find(m => m.name === currentMealType);
    const drink = allMealTypes.find(m => m.name === "Drink");
    const snack = allMealTypes.find(m => m.name === "Snack");
    const nearby = allMealTypes.find(m => m.name === "Nearby");
    return [mealOption, drink, snack, nearby].filter(Boolean) as typeof allMealTypes;
  }, [currentMealType]);

  const handleSelect = (mood: string) => {
    setMood(mood);
    setSelectedMood(mood);
    posthog.capture("mood_selected", { mood: mood });
    setTimeout(() => {
      navigate("/mood/results");
    }, 200);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 24, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: ({ duration: 0.4, ease: 'easeOut' } as unknown) as any
    },
  };

  return (
    <div className="min-h-screen bg-ground text-content pb-28">
      <motion.div
        className="max-w-md mx-auto px-5 pt-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header: wordmark + editable location chip */}
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
          <h1 className="text-accent-ink font-extrabold text-[19px] tracking-[-0.02em]">
            Sosika
          </h1>
          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/mood/location")}
            className="flex items-center gap-[7px] bg-surface-2 border border-edge-2 rounded-full px-3 py-[7px]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sosika-cyan" />
            <span className="text-xs font-semibold text-content-secondary">{currentLocationLabel}</span>
            <span className="text-[11px] text-content-muted">Change</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            aria-label="Settings"
            className="w-9 h-9 flex-none flex items-center justify-center rounded-full bg-surface-2 border border-edge-2 text-content-tertiary"
          >
            <SettingsIcon className="w-[15px] h-[15px]" />
          </button>
          </div>
        </motion.div>

        {/* Greeting */}
        <motion.div variants={itemVariants} className="mb-6">
          <h2 className="text-[30px] font-bold text-content leading-[1.1] tracking-tight">
            {getGreeting()}.
          </h2>
          <p className="text-content-muted text-base font-normal mt-1.5">
            What are you in the mood for?
          </p>
        </motion.div>

        {/* Mood grid */}
        <motion.div
          className="grid grid-cols-2 gap-2.5"
          variants={containerVariants}
        >
          {smartMoods.map((mood) => {
            const isSelected = selectedMood === mood.name.toLowerCase();
            const isNow = mood.name === currentMealType;
            return (
              <motion.button
                key={mood.name}
                onClick={() => handleSelect(mood.name.toLowerCase())}
                whileTap={{ scale: 0.97 }}
                variants={itemVariants}
                className={`relative rounded-[18px] p-4 border flex flex-col gap-[22px] text-left min-h-[96px] transition-colors ${
                  isSelected
                    ? "bg-sosika-cyan/[0.09] border-sosika-cyan/35"
                    : "bg-surface-1 border-edge-2"
                }`}
              >
                <img
                  src={mood.icon}
                  alt=""
                  aria-hidden
                  className={`w-[18px] h-[18px] object-contain ${isSelected ? "opacity-100" : "opacity-80"}`}
                />
                <span
                  className={`text-[15px] tracking-[-0.01em] ${
                    isSelected ? "font-bold text-content" : "font-semibold text-content-tertiary"
                  }`}
                >
                  {mood.name}
                  {isNow && (
                    <span className="block text-[11px] font-medium text-accent-ink mt-[3px]">
                      Right now
                    </span>
                  )}
                </span>
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      className="absolute inset-0 rounded-[18px] border-2 border-sosika-cyan/40 pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    />
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Custom mood search */}
        <motion.div variants={itemVariants} className="mt-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-faint pointer-events-none" />
            <input
              type="text"
              placeholder="Search biryani, pizza, coffee…"
              value={customMood}
              onChange={(e) => setCustomMood(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSelect(customMood || "any")}
              className="w-full bg-surface-2 border border-edge-2 rounded-2xl pl-10 pr-4 py-3.5 text-content text-sm placeholder-content-faint focus:outline-none focus:border-sosika-cyan/35 transition-colors"
            />
          </div>
        </motion.div>

        {/* Primary CTA */}
        <motion.div variants={itemVariants} className="mt-3.5">
          <button
            type="button"
            onClick={() => handleSelect(customMood || currentMealType.toLowerCase())}
            className="w-full bg-sosika-cyan text-on-accent rounded-2xl py-[17px] font-bold text-[15px] tracking-[-0.01em] active:opacity-90 transition-opacity"
          >
            {customMood.trim() ? "Find food" : `See ${currentMealType.toLowerCase()} near you`}
          </button>
        </motion.div>

        {/* Friday Biryani drop teaser */}
        <motion.div variants={itemVariants} className="mt-5">
          <DropCard
            eyebrow="Drop · closes fri 11:00"
            title="Friday Biryani pre-order"
            countdown={dropCountdown}
            onClick={() => navigate("/biryani")}
          />
        </motion.div>

        {/* Recipes — the cook-it-yourself half of the app */}
        <motion.div variants={itemVariants} className="mt-3">
          <DropCard
            tone="neutral"
            eyebrow="Recipes"
            title="Cook it yourself tonight"
            meta="Tanzanian recipes, updated daily"
            onClick={() => navigate("/recipes")}
          />
        </motion.div>

        {/* Footer text */}
        <motion.p
          variants={itemVariants}
          className="text-center text-content-faint text-xs mt-6 font-medium"
        >
          Your next favorite meal is just a tap away.{" "}
          <a className="underline font-semibold" href="/vendor-onboarding">Sell on Sosika</a>
        </motion.p>
      </motion.div>

      <Navbar />
    </div>
  );
}
