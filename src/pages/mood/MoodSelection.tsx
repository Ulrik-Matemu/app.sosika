import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Coffee, Sun, Moon, Droplets, Cookie, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useMood } from "../../hooks/useMood";

const allMealTypes = [
  { name: "Breakfast", icon: Coffee, timeRange: [5, 11] as const },
  { name: "Lunch", icon: Sun, timeRange: [11, 16] as const },
  { name: "Dinner", icon: Moon, timeRange: [16, 23] as const },
  { name: "Drink", icon: Droplets, timeRange: null },
  { name: "Snack", icon: Cookie, timeRange: null },
  { name: "Nearby", icon: Zap, timeRange: null }
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

  // Smart mood selection based on time - only 4 items
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
      console.log("Navigating with mood:", mood);
    }, 300);
    navigate("/mood/location");
  };

  return (
    <>
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 p-4 sm:p-6">
      <h1 className="text-center bg-transparent py-3 md:py-6 text-[#00bfff] font-extrabold text-2xl">Sosika</h1>
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="text-center mb-5 md:mb-10 ">
          <h1 className="text-xl md:text-3xl font-extralight mb-1 md:mb-3 relative text-transparent bg-clip-text bg-gradient-to-r from-gray-400 via-gray-100 to-gray-400 animate-shine">
            Hello, what do you feel like having?
          </h1>
          <style>
          {`
            @keyframes shine {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
            .animate-shine {
              background-size: 200% 100%;
              animation: shine 4.5s linear infinite;
            }
          `}
          </style>
          <p className="text-zinc-400 text-sm sm:text-base">
            Choose your vibe
          </p>
        </div>

        {/* Unified Selection Container */}
        <div className="bg-zinc-800/50 backdrop-blur rounded-3xl p-4 sm:p-6 space-y-4">
          {/* Mood Buttons - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-3">
            {smartMoods.map((mood) => {
              const Icon = mood.icon;
              const isSelected = selectedMood === mood.name.toLowerCase();
              
              return (
                <motion.button
                  key={mood.name}
                  onClick={() => handleSelect(mood.name.toLowerCase())}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative rounded-2xl p-4 sm:p-5 transition-all duration-300 ${
                    isSelected
                      ? "bg-zinc-700 shadow-lg shadow-zinc-900/50"
                      : "bg-zinc-800 hover:bg-zinc-750"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2 ">
                    <Icon 
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors duration-300 ${
                        isSelected ? "text-orange-400" : "text-zinc-200"
                      }`} 
                      strokeWidth={2}
                    />
                    <span className={`font-medium text-sm sm:text-base transition-colors duration-300 ${
                      isSelected ? "text-white" : "text-zinc-300"
                    }`}>
                      {mood.name}
                    </span>
                  </div>
                  
                  {/* Subtle glow effect */}
                  {isSelected && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-orange-500/10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-zinc-700"></div>
            <span className="text-zinc-500 text-xs uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-zinc-700"></div>
          </div>

          {/* Custom Input */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Type your own vibe..."
              value={customMood}
              onChange={(e) => setCustomMood(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSelect(customMood || "any")}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:bg-zinc-750 transition-all"
            />
            
            <motion.button
              onClick={() => handleSelect(customMood || "any")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-[#00bfff] hover:bg-black text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap shadow-lg shadow-blue-500/20"
            >
              {customMood.trim() ? "Continue →" : "Surprise Me"}
            </motion.button>
          </div>
        </div>

        {/* Footer hint */}
        <motion.p
          className="text-center text-zinc-600 text-xs sm:text-sm mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Your perfect meal awaits
        </motion.p>
      </motion.div>
    </div>
    </>
  );
}