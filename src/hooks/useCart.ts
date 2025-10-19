import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
// import { getOrderSummaryHtml } from '../pages/explore/orderSummaryHtml';
import { logEvent, analytics } from '../firebase';
// import axios from 'axios';
// import { getDeliveryFee } from '../services/deliveryFee';
// import { toast } from './use-toast';

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

    const userId = localStorage.getItem('userId');

    // 1️⃣ Check if user is logged in
    if (!userId) {
      setLoading(false);
      const result = await Swal.fire({
        title: 'Login Required',
        text: 'You need to login or register to place an order.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Login / Register',
        cancelButtonText: 'Cancel',
      });

      if (result.isConfirmed) {
        window.location.href = '/login';
      }
      return;
    }

    logEvent(analytics, 'reached_checkout', { userId });

    // 2️⃣ Check if cart is empty
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
      // const vendor_id = cart[0].vendorId;

      // // Calculate delivery fee
      // let delivery_fee = 0;
      // try {
      //   delivery_fee = await getDeliveryFee(vendor_id.toString());
      // } catch (err) {
      //   console.warn('Failed to calculate delivery fee:', err);
      //   delivery_fee = 0;
      // }

      // let info = 'Delivery fee is calculated according to distance. If too high, try ordering from nearby vendors';
      // if (delivery_fee > 50000) {
      //   info = "Your delivery fee seems too high. Try checking your location or ordering from nearby vendors.";
      // }

      // let deliveryTime = "ASAP";
      // let note = "Made Fresh Just for You!";
      // let requested_asap = true;

      // if (cart[0].id === 7) {
      //   deliveryTime = "Tomorrow";
      //   note = "This delightful treat takes a day to prepare with extra care and love. We'll deliver it fresh and fabulous by tomorrow!🍰";
      //   await Swal.fire({
      //     title: "Special Order!",
      //     text: note,
      //     icon: "info",
      //   });
      // }

      // // Order summary
      // const result = await Swal.fire({
      //   title: 'Confirm Your Order',
      //   html: getOrderSummaryHtml({ cart, deliveryTime, delivery_fee, info: { message: info }, note }),
      //   showCancelButton: true,
      //   confirmButtonColor: '#3085d6',
      //   cancelButtonColor: '#d33',
      //   confirmButtonText: 'Place Order',
      //   cancelButtonText: 'Cancel'
      // });

      // if (!result.isConfirmed) {
      //   setLoading(false);
      //   return;
      // }

      // // Prepare order payload
      // const orderData = {
      //   user_id: userId,
      //   vendor_id,
      //   delivery_fee,
      //   requested_asap,
      //   payment_method: "Cash on Delivery",
      //   order_items: cart.map(item => ({
      //     menu_item_id: item.id,
      //     quantity: item.quantity,
      //     price: parseFloat(item.price)
      //   }))
      // };

      // // Place order
      // const response = await axios.post(`${import.meta.env.VITE_API_URL}/orders`, orderData);

      // if (response.status === 201) {
      //   await Swal.fire({
      //     title: 'Order Placed',
      //     text: `Order ID: ${response.data.order_id} placed successfully! 🚀`,
      //     icon: "success"
      //   });
      //   setCart([]);
      //   window.location.href = `/order-tracking/${response.data.order_id}`;
      // }

      await Swal.fire({
        title: 'Checkout Disabled',
        text: 'Checkout is currently disabled for maintenance. Please try again later.',
        icon: 'info'
      });

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
