import { Home, User, History, ShoppingCart, Search } from "lucide-react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { useCartContext } from "../../context/cartContext";
import { useState } from "react";
import CartDrawer from "./CartDrawer";

type NavItem = {
  name: string;
  icon: React.ElementType;
  path: string;
};

const navItems: NavItem[] = [
  { name: "Home", icon: Home, path: "/explore" },
  { name: "Search", icon: Search, path: "/browse" },
  { name: "Orders", icon: History, path: "/orders" },
  { name: "Profile", icon: User, path: "/profile" },
  { name: "Cart", icon: ShoppingCart, path: "/cart" },
];

export default function Navbar() {
  const {
    cart,
    cartTotal,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
    loading,
  } = useCartContext();
  const [isCartOpen, setIsCartOpen] = useState(false);

  const triggerHapticFeedback = () => {
    if (navigator.vibrate) {
      navigator.vibrate(20); // 30ms vibration
    }
  };


  return (
    <>
      <nav
        role="navigation"
        aria-label="Main navigation"
        className="fixed bottom-4 left-4 right-4 z-50 bg-[#e0e0de] dark:bg-[#363634] shadow-xl rounded-xl p-2 flex justify-around md:hidden border border-gray-100 dark:border-gray-800"
      >
        {navItems.map(({ name, icon: Icon, path }) =>
          name === "Cart" ? (
            <button
              key={name}
              aria-label="Open cart drawer"
              className={clsx(
                "flex flex-col items-center justify-center w-full py-1 px-2 rounded-full transition-all duration-200 ease-in-out",
                cart.length > 0
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
              onClick={() => {
                setIsCartOpen(true);
                triggerHapticFeedback();
              }}
            >
              <div
                className={clsx(
                  "p-1 mb-1 rounded-full",
                  cart.length > 0 && "bg-blue-100 dark:bg-blue-900/30"
                )}
              >
                <Icon className="text-[#00bfff]" size={30} />
                {cart.length > 0 && (
                  <span className="absolute top-3 right-3 bg-red-500 text-white rounded-full px-2 py-0.5 text-[10px] font-bold">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </div>
            </button>
          ) : (
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
              children={({ isActive }) => (
                <>
                  <div
                    className={clsx(
                      "p-1 mb-1 rounded-full",
                      isActive && "bg-blue-100 dark:bg-blue-900/30"
                    )}
                  >
                    <Icon size={30} className={isActive ? "animate-pulse" : ""} />
                  </div>
                </>
              )}
            />
          )
        )}
      </nav>
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        cartTotal={cartTotal}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
        checkout={checkout}
        loading={loading}
      />
    </>
  );
}
