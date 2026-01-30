import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMood } from "../../hooks/useMood";

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
    setTimeout(() => {
      navigate("/mood/location");
    }, 300);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-900 to-blue-900/20" />

      <motion.div
        className="w-full max-w-2xl z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1 variants={itemVariants} className="text-center bg-transparent py-6 text-[#00bfff] font-extrabold text-3xl tracking-tight">
          Sosika
        </motion.h1>

        <motion.div variants={itemVariants} className="text-center mb-10">
          <h2 className="text-xl md:text-4xl font-medium mb-2 text-white">
            What are you in the mood for?
          </h2>
          <p className="text-zinc-400 text-sm sm:text-lg">
            Select a vibe, and we'll find the perfect meal for you.
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-zinc-800/50 backdrop-blur-lg border border-zinc-700/50 rounded-3xl p-6 space-y-6"
        >
          <motion.div
            className="grid grid-cols-2 gap-4"
            variants={containerVariants}
          >
            {smartMoods.map((mood) => {
              const isSelected = selectedMood === mood.name.toLowerCase();

              return (
                <motion.button
                  key={mood.name}
                  onClick={() => handleSelect(mood.name.toLowerCase())}
                  whileHover={{ scale: 1.05, backgroundColor: '#27272a' }}
                  whileTap={{ scale: 0.95 }}
                  variants={itemVariants}
                  className={`relative rounded-2xl p-5 transition-colors duration-300 ${isSelected
                      ? "bg-blue-500/20 border-blue-400"
                      : "bg-zinc-800 border-zinc-700"
                    } border`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={mood.icon}
                      alt={mood.name}
                      className={`w-8 h-8 transition-opacity duration-300 ${isSelected ? "opacity-100" : "opacity-70"
                        }`}
                    // If you want to change the color of SVGs via CSS, 
                    // use filter: invert() or mask-image.
                    />
                    <span className={`font-semibold text-md transition-colors duration-300 ${isSelected ? "text-white" : "text-zinc-200"
                      }`}>
                      {mood.name}
                    </span>
                  </div>
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl border-2 border-blue-400"
                        initial={{ scale: 0.9, opacity: 0 }}
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

          <motion.div variants={itemVariants} className="flex items-center gap-4">
            <div className="flex-1 h-px bg-zinc-700" />
            <span className="text-zinc-500 text-xs uppercase font-semibold tracking-wider">or</span>
            <div className="flex-1 h-px bg-zinc-700" />
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="I'm feeling like..."
              value={customMood}
              onChange={(e) => setCustomMood(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSelect(customMood || "any")}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-5 py-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />

            <motion.button
              onClick={() => handleSelect(customMood || "any")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="bg-[#00bfff] hover:bg-blue-400 text-black px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg shadow-blue-500/20"
            >
              {customMood.trim() ? "Find My Vibe" : "Surprise Me"}
            </motion.button>
          </motion.div>
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="text-center text-zinc-500 text-sm mt-8"
        >
          Your next favorite meal is just a tap away.
        </motion.p>
      </motion.div>
    </div>
  );
}
