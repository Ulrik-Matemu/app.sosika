import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMood } from "../../hooks/useMood";
import posthog from "./../../lib/posthog";
import { Search } from "lucide-react";

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

  const smartMoods = useMemo(() => {
    const currentMealType = getMealTypeByTime();
    const mealOption = allMealTypes.find(m => m.name === currentMealType);
    const drink = allMealTypes.find(m => m.name === "Drink");
    const snack = allMealTypes.find(m => m.name === "Snack");
    const nearby = allMealTypes.find(m => m.name === "Nearby");
    return [mealOption, drink, snack, nearby].filter(Boolean) as typeof allMealTypes;
  }, []);

  const handleSelect = (mood: string) => {
    setMood(mood);
    setSelectedMood(mood);
    posthog.capture("mood_selected", { mood: mood });
    setTimeout(() => {
      navigate("/mood/location");
    }, 350);
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
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0b] p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient background gradients */}
      <div className="absolute top-[-30%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#00bfff]/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[50%] h-[50%] rounded-full bg-[#00bfff]/[0.03] blur-[100px] pointer-events-none" />

      <motion.div
        className="w-full max-w-lg z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Brand */}
        <motion.div variants={itemVariants} className="text-center mb-2">
          <h1 className="text-[#00bfff] font-black text-2xl tracking-tight">
            Sosika
          </h1>
        </motion.div>

        {/* Greeting */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
            {getGreeting()}
          </h2>
          <p className="text-zinc-500 text-sm sm:text-base font-medium">
            What are you in the mood for?
          </p>
        </motion.div>

        {/* Mood cards */}
        <motion.div variants={itemVariants}>
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 sm:p-5">
            <motion.div
              className="grid grid-cols-2 gap-3"
              variants={containerVariants}
            >
              {smartMoods.map((mood) => {
                const isSelected = selectedMood === mood.name.toLowerCase();
                return (
                  <motion.button
                    key={mood.name}
                    onClick={() => handleSelect(mood.name.toLowerCase())}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    variants={itemVariants}
                    className={`relative rounded-xl p-4 sm:p-5 transition-all duration-300 border ${
                      isSelected
                        ? "bg-[#00bfff]/[0.12] border-[#00bfff]/40 shadow-lg shadow-[#00bfff]/[0.08]"
                        : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2.5">
                      <div className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-lg transition-all duration-300 ${
                        isSelected ? "bg-[#00bfff]/[0.15]" : "bg-white/[0.04]"
                      }`}>
                        <img
                          src={mood.icon}
                          alt={mood.name}
                          className={`w-6 h-6 sm:w-7 sm:h-7 transition-all duration-300 ${
                            isSelected ? "opacity-100 scale-110" : "opacity-60"
                          }`}
                        />
                      </div>
                      <span className={`font-semibold text-sm transition-colors duration-300 ${
                        isSelected ? "text-white" : "text-zinc-400"
                      }`}>
                        {mood.name}
                      </span>
                    </div>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          className="absolute inset-0 rounded-xl border-2 border-[#00bfff]/50"
                          initial={{ scale: 0.92, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-zinc-600 text-[10px] uppercase font-semibold tracking-widest">or search</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {/* Custom mood input */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Try 'biryani', 'pizza', 'coffee'..."
                  value={customMood}
                  onChange={(e) => setCustomMood(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSelect(customMood || "any")}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00bfff]/40 focus:bg-white/[0.06] transition-all duration-300"
                />
              </div>
              <motion.button
                onClick={() => handleSelect(customMood || "any")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="bg-[#00bfff] hover:bg-[#00a8e6] text-black px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-lg shadow-[#00bfff]/20 whitespace-nowrap"
              >
                {customMood.trim() ? "Find Food" : "Surprise Me"}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Footer text */}
        <motion.p
          variants={itemVariants}
          className="text-center text-zinc-600 text-xs mt-6 font-medium"
        >
          Your next favorite meal is just a tap away.
        </motion.p>
      </motion.div>
    </div>
  );
}
