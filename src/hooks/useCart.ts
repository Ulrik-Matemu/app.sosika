import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { getOrderSummaryHtml } from '../pages/explore/orderSummaryHtml';
import { logEvent, analytics } from '../firebase';
import axios from 'axios';

type MenuItem = {
    id: number;
    name: string;
    price: string;
    vendorId: number;
    description?: string;
    imageUrl?: string;
    category?: string;
    isAvailable?: boolean;
    quantity?: number;
    // Add other fields as needed
};

type CartItem = MenuItem & {
    quantity: number;
    vendorId: number;
};
export function useCart() {
  // Load cart from localStorage if available
  const [cart, setCart] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem('cart');
    return stored ? JSON.parse(stored) : [];
  });
  const [cartTotal, setCartTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Persist cart to localStorage on change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    setCartTotal(total);
  }, [cart]);

  const addToCart = useCallback((item: MenuItem) => {
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

  // Global checkout function
  const checkout = async () => {
    setLoading(true);
    logEvent(analytics, 'reached_checkout', {
      userId: localStorage.getItem('userId'),
    });
    if (cart.length === 0) {
      await Swal.fire({
        title: 'Empty Cart',
        text: 'Your cart is empty.',
        icon: 'warning'
      });
      setLoading(false);
      return;
    }
    try {
      const user_id = localStorage.getItem('userId');
      const vendor_id = cart[0].vendorId;
      let delivery_fee = 0;
      let info = 'Delivery fee is calculated according to distance. If too high, try ordering from nearby vendors';
      if (delivery_fee === null || delivery_fee === undefined) {
        delivery_fee = 0;
      } else if (delivery_fee > 10000) {
        info = "Your delivery fee seems to high, try checking your location. Location may not be accurate if you're connected to hotspot or WiFi or try ordering from nearby vendors";
      }
      let deliveryTime = "ASAP";
      let note = "Made Fresh Just for You!";
      let requested_asap = true;
      if (cart[0].id === 7) {
        deliveryTime = "Tomorrow"
        note = "This delightful treat takes a day to prepare with extra care and love. We'll deliver it fresh and fabulous by tomorrow!🍰"
        await Swal.fire({
          title: "Special Order!",
          text: "This special treat takes a day to prepare with love. We’ll have it delivered fresh and delightful by tomorrow!",
          icon: "info",
        });
      }
      // Use reusable HTML generator
      const result = await Swal.fire({
        title: 'Confirm Your Order',
        html: getOrderSummaryHtml({ cart, deliveryTime, delivery_fee, info: { message: info }, note }),
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Place Order',
        cancelButtonText: 'Cancel'
      });
      if (!result.isConfirmed) {
        setLoading(false);
        return;
      }
      // Prepare order payload
      const orderData = {
        user_id,
        vendor_id,
        delivery_fee,
        requested_asap,
        payment_method: "Cash on Delivery",
        order_items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          price: parseFloat(item.price)
        }))
      };
      // Send order request
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/orders`, orderData);
      if (response.status === 201) {
        await Swal.fire({
          title: 'Order Placed',
          text: `Order ID: ${response.data.order_id} placed successfully! 🚀`,
          icon: "success"
        });
        setCart([]);
        // Optionally close cart drawer if you pass a callback
        window.location.href = `/order-tracking/${response.data.order_id}`;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      await Swal.fire({
        title: 'Error',
        text: 'Failed to place order. Please try again.',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    cart,
    setCart,
    cartTotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    checkout,
    loading,
  };
}
