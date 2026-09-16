import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { useCartContext } from "../../context/cartContext";
import { useOrders } from "../../context/OrdersContext";
import { useState } from "react";
import CartDrawer from "./CartDrawer";
import AddToCartToast from "./AddToCartToast";

type NavItem = {
  name: string;
  path: string;
};

const navItems: NavItem[] = [
  { name: "Home", path: "/" },
  { name: "Search", path: "/search" },
  { name: "Orders", path: "/orders" },
  { name: "Cart", path: "/cart" },
];

export default function Navbar() {
  const {
    cart,
    cartTotal,
    deliveryFee,
    baseFee,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
    loading,
    selectedDeliveryOption,
    setSelectedDeliveryOption,
    calculatingFee,
    freeDeliveryUsesLeft,
    freeDeliveryResetDate,
  } = useCartContext();
  const { activeCount: activeOrdersCount } = useOrders();
  const [isCartOpen, setIsCartOpen] = useState(false);

  const triggerHapticFeedback = () => {
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <div className="fixed bottom-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav
          role="navigation"
          aria-label="Main navigation"
          className="pointer-events-auto flex items-center justify-around w-full max-w-xs bg-surface-2 backdrop-blur-xl border border-edge-2 rounded-full px-2.5 py-[15px]"
        >
          {navItems.map(({ name, path }) => {
            const isCart = name === "Cart";
            const isOrders = name === "Orders";
            return isCart ? (
              <button
                key={name}
                aria-label="Open cart drawer"
                className={clsx(
                  "relative flex items-center justify-center px-2 font-semibold text-xs transition-colors",
                  cartItemCount > 0 ? "text-accent-ink" : "text-content-faint hover:text-content-secondary"
                )}
                onClick={() => {
                  setIsCartOpen(true);
                  triggerHapticFeedback();
                }}
              >
                {name}
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1 text-[9px] font-bold border border-sosika-ground">
                    {cartItemCount}
                  </span>
                )}
              </button>
            ) : (
              <NavLink
                key={name}
                to={path}
                end={path === "/"}
                className={({ isActive }) =>
                  clsx(
                    "relative flex items-center justify-center px-2 font-semibold text-xs transition-colors",
                    isActive ? "text-accent-ink" : "text-content-faint hover:text-content-secondary"
                  )
                }
                aria-label={`Go to ${name} page`}
              >
                {({ isActive }) => (
                  <>
                    {name}
                    {isOrders && activeOrdersCount > 0 && (
                      <span className="absolute -top-2 -right-2.5 bg-sosika-cyan text-on-accent rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-1 text-[8px] font-bold border border-sosika-ground">
                        {activeOrdersCount}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute -bottom-2 w-1 h-1 rounded-full bg-sosika-cyan" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <AddToCartToast onOpenCart={() => setIsCartOpen(true)} />

      <CartDrawer
        updateQuantity={updateQuantity}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        cartTotal={cartTotal}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
        checkout={checkout}
        loading={loading}
        deliveryFee={deliveryFee}
        baseFee={baseFee}
        selectedDeliveryOption={selectedDeliveryOption}
        setSelectedDeliveryOption={setSelectedDeliveryOption}
        calculatingFee={calculatingFee}
        freeDeliveryUsesLeft={freeDeliveryUsesLeft}
        freeDeliveryResetDate={freeDeliveryResetDate}
      />
    </>
  );
}
