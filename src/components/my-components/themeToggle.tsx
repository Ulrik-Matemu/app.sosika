import { Moon, Sun } from "lucide-react";
import { toggleTheme } from "../../utils/theme";
import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(localStorage.getItem("theme") === "dark");
  }, []);

  return (
    <button
      onClick={() => {
        toggleTheme();
        setIsDark((prev) => !prev);
      }}
      className="p-2  rounded-full bg-gray-200 dark:bg-gray-800 transition-all"
    >
      {isDark ? <Sun className="w-6 h-6 text-yellow-500" /> : <Moon className="w-6 h-6 text-gray-500" />}
    </button>
  );
}
