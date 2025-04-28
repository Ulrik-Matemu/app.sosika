import { useState } from "react";
import { Home, User, History } from "lucide-react";
import { Link } from 'react-router-dom';

const navItems = [
  { name: "Home", icon: Home, path: "/explore" },
  { name: "Orders", icon: History, path: "/orders" },
  { name: "Profile", icon: User, path: "/profile" },
];

export default function Navbar() {
  const [active, setActive] = useState("/");

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 bg-[#e0e0de] dark:bg-[#363634] shadow-xl rounded-2xl p-2 flex justify-around md:hidden border border-gray-100 dark:border-gray-800">
    {navItems.map(({ name, icon: Icon, path }) => (
      <Link key={name} to={path} className="w-full">
        <button
          onClick={() => setActive(path)}
          className={`
            flex flex-col items-center justify-center w-full py-1 px-2 rounded-full
            transition-all duration-200 ease-in-out
            ${active === path 
              ? "text-blue-600 dark:text-blue-400" 
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}
          `}
        >
          <div className={`
            p-1 mb-1 rounded-full 
            ${active === path && "bg-blue-100 dark:bg-blue-900/30"}
          `}>
            <Icon size={30} className={active === path ? "animate-pulse" : ""} />
          </div>
        
        </button>
      </Link>
    ))}
  </nav>
  );
}
