// src/context/CartContext.tsx
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: string;
  category: string;
  is_available: boolean;
  vendor_id: number;
  image_url?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  cartTotal: number;
  isCartOpen: boolean;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: number) => void;
  updateQuantity: (itemId: number, newQuantity: number) => void;
  clearCart: () => void;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cartTotal, setCartTotal] = useState<number>(0);

  const addToCart = (item: MenuItem) => {
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);

    if (existingItemIndex !== -1) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }

    setIsCartOpen(true);
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }

    const newCart = cart.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );
    setCart(newCart);
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculate cart total on cart change
  useEffect(() => {
    const total = cart.reduce((sum, item) => {
      const price = parseFloat(item.price);
      return sum + price * item.quantity;
    }, 0);
    setCartTotal(total);
  }, [cart]);

  return (
    <CartContext.Provider
      value={{ cart, cartTotal, isCartOpen, addToCart, removeFromCart, updateQuantity, clearCart, setIsCartOpen }}
    >
      {children}
    </CartContext.Provider>
  );
};
