import { Moon, Sun } from "lucide-react";
import { toggleTheme } from "../../utils/theme";
import { useState, useCallback } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    // safer initial state: runs only on first render
    return localStorage.getItem("theme") === "dark";
  });

  const handleToggle = useCallback(() => {
    toggleTheme();
    setIsDark((prev) => !prev);
  }, []);

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-6 h-6 text-yellow-500" />
      ) : (
        <Moon className="w-6 h-6 text-gray-500" />
      )}
    </button>

  );
}
