import { useState, useEffect, useCallback } from 'react';
type MenuItem = {
    id: number;
    name: string;
    price: string;
    vendorId: number;
    description?: string;
    imageUrl?: string;
    category?: string;
    isAvailable?: boolean;
    // Add other fields as needed
};

type CartItem = MenuItem & {
    quantity: number;
    vendorId: number;
};
export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState<number>(0);

  useEffect(() => {
    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    setCartTotal(total);
  }, [cart]);

  const addToCart = useCallback((item: MenuItem) => {
    console.log("Adding to cart:", item);
    if (!item.id || !item.price) {
      console.error("Item must have an id and price to be added to the cart");
      return;
    }
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(cartItem => cartItem.id === item.id);
      if (existingItemIndex !== -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += 1;
        return newCart;
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  }, []);

  const removeFromCart = useCallback((itemId: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }
    setCart(prevCart => prevCart.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return {
    cart,
    setCart,
    cartTotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };
}
