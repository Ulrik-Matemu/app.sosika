import { Home, ShoppingCart, Search } from "lucide-react";
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
  { name: "Home", icon: Home, path: "/" },
  { name: "Search", icon: Search, path: "/mood/results" },
  { name: "Cart", icon: ShoppingCart, path: "/cart" },
];

export default function Navbar() {
  const {
    cart,
    cartTotal,
    deliveryFee,
    updateQuantity: updateQuantityString,
    removeFromCart,
    clearCart,
    checkout,
    loading,
  } = useCartContext();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // wrapper to adapt CartDrawer's expected (id: number, qty: number) signature
  const handleUpdateQuantity = (id: number, qty: number) => {
    updateQuantityString(String(id), qty);
  };

  const triggerHapticFeedback = () => {
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  };

  const handleRemoveFromCart = (id: number) => {
    removeFromCart(String(id));
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <div className="fixed bottom-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav
          role="navigation"
          aria-label="Main navigation"
          className="pointer-events-auto flex items-center justify-around w-full max-w-xs bg-zinc-950/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] rounded-full px-2 py-1.5"
        >
          {navItems.map(({ name, icon: Icon, path }) => {
            const isCart = name === "Cart";
            return isCart ? (
              <button
                key={name}
                aria-label="Open cart drawer"
                className={clsx(
                  "relative flex flex-col items-center justify-center p-2.5 rounded-full transition-all duration-300",
                  cartItemCount > 0
                    ? "text-[#00bfff]"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
                onClick={() => {
                  setIsCartOpen(true);
                  triggerHapticFeedback();
                }}
              >
                <div className="relative">
                  <Icon size={22} className="transition-transform duration-300 active:scale-95" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1 text-[9px] font-bold border border-zinc-950">
                      {cartItemCount}
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
                    "relative flex flex-col items-center justify-center p-2.5 rounded-full transition-all duration-300",
                    isActive
                      ? "text-[#00bfff]"
                      : "text-zinc-500 hover:text-zinc-300"
                  )
                }
                aria-label={`Go to ${name} page`}
              >
                {({ isActive }) => (
                  <div className="flex flex-col items-center">
                    <Icon size={22} className={clsx("transition-transform duration-300 active:scale-95", isActive && "scale-105")} />
                    {isActive && (
                      <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#00bfff]" />
                    )}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <CartDrawer
        updateQuantity={handleUpdateQuantity}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        cartTotal={cartTotal}
        removeFromCart={handleRemoveFromCart}
        clearCart={clearCart}
        checkout={checkout}
        loading={loading}
        deliveryFee={deliveryFee}
      />
    </>
  );
}
