import { Home, User, History } from "lucide-react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";

type NavItem = {
  name: string;
  icon: React.ElementType;
  path: string;
};

const navItems: NavItem[] = [
  { name: "Home", icon: Home, path: "/explore" },
  { name: "Orders", icon: History, path: "/orders" },
  { name: "Profile", icon: User, path: "/profile" },
];

export default function Navbar() {
  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="fixed bottom-4 left-4 right-4 z-50 bg-[#e0e0de] dark:bg-[#363634] shadow-xl rounded-xl p-2 flex justify-around md:hidden border border-gray-100 dark:border-gray-800"
    >
      {navItems.map(({ name, icon: Icon, path }) => (
        <NavLink
          key={name}
          to={path}
          className={({ isActive }) =>
            clsx(
              "flex flex-col items-center justify-center w-full py-1 px-2 rounded-full transition-all duration-200 ease-in-out",
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )
          }
          aria-label={`Go to ${name} page`}
        >
          {({ isActive }) => (
            <div
              className={clsx(
                "p-1 mb-1 rounded-full",
                isActive && "bg-blue-100 dark:bg-blue-900/30"
              )}
            >
              <Icon size={30} className={isActive ? "animate-pulse" : ""} />
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
