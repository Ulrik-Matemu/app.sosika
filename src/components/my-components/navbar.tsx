import { useState } from "react";
import { Home, User, History } from "lucide-react";
import { cn } from "../../lib/utils"; // Utility function for class merging

const navItems = [
  { name: "Home", icon: Home, path: "/" },
  { name: "Orders", icon: History, path: "/orders" },
  { name: "Profile", icon: User, path: "/profile" },
];

export default function Navbar() {
  const [active, setActive] = useState("/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1919] shadow-md p-3 flex justify-around md:hidden">
      {navItems.map(({ name, icon: Icon, path }) => (
        <button
          key={name}
          onClick={() => setActive(path)}
          className={cn(
            "flex flex-col items-center gap-1 text-gray-500 dark:text-gray-400 transition",
            active === path && "text-[#00bfff] dark:text-blue-400"
          )}
        >
          <Icon size={24} />
          <span className="text-xs">{name}</span>
        </button>
      ))}
    </nav>
  );
}
