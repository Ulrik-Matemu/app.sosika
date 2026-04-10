import { useState, useEffect, useCallback } from 'react';
import emailjs from '@emailjs/browser';
import Swal from 'sweetalert2';
import { logEvent, analytics, db } from '../firebase';
import { collection, addDoc, serverTimestamp, DocumentData, DocumentReference, updateDoc as firestoreUpdateDoc } from 'firebase/firestore';
import { useLocationStorage } from './useLocationStorage';
import { calculateDistance, fetchVendorGeolocation } from '../pages/mood/api/mood-api';
import posthog from './../lib/posthog';

emailjs.init(import.meta.env.VITE_EMAILJS_USER_ID);

export type MenuItem = {
  id: string;
  name: string;
  price: string;
  vendor_id: string; // Changed to match types/types.ts
  description?: string;
  imageUrl?: string;
  category?: string;
  isAvailable?: boolean;
  quantity?: number;
  // Add other fields as needed
};

type CartItem = MenuItem & {
  quantity: number;
  vendor_id: string;
};

export function useCart() {
  const { locations } = useLocationStorage();
  const userLocation = locations[0]; // Assuming the first location is the user's current location

  // Load cart from localStorage if available
  const [cart, setCart] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem('cart');
    return stored ? JSON.parse(stored) : [];
  });
  const [cartTotal, setCartTotal] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Persist cart to localStorage on change and calculate total and delivery fee
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));

    const calculateTotals = async () => {
      let subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
      let currentDeliveryFee = 0;

      if (cart.length > 0 && userLocation) {
        const firstItemVendorId = cart[0].vendor_id;
        const vendorGeolocation = await fetchVendorGeolocation(firstItemVendorId);

        if (vendorGeolocation) {
          const distance = calculateDistance(
            userLocation,
            vendorGeolocation
          );
          console.log(distance);
          // Delivery fee: 1200 TSH per kilometer
          // Calculate base fee (TZS 1200 per km) then round up to nearest 100 TZS for cash-friendly payment
          const baseFee = Math.ceil(distance * 1200); // base in whole TZS
          const ROUND_TO = 100; // round up to nearest 100 TZS to keep cash payments easy and add small profit
          currentDeliveryFee = Math.ceil(baseFee / ROUND_TO) * ROUND_TO;
        }
      }
      console.log(currentDeliveryFee);
      setDeliveryFee(currentDeliveryFee);
      setCartTotal(subtotal + currentDeliveryFee);
    };

    calculateTotals();
  }, [cart, userLocation]);

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

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, newQuantity: number) => {
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

    

    // Always require a phone number for checkout (logged in or guest)
    // Pause loading while we ask the user for a phone number
    setLoading(false);

    const phoneResult = await Swal.fire({
      title: 'Let Us Reach Out',
      text: 'Please enter your phone number to continue with checkout.',
      icon: 'info',
      input: 'tel',
      inputLabel: 'Phone Number',
      inputPlaceholder: 'e.g. +1234567890',
      inputValue: localStorage.getItem('guestPhone') || '',
      showCancelButton: true,
      confirmButtonText: 'Continue',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) return 'Phone number is required';
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length < 7) return 'Please enter a valid phone number';
        return null;
      }
    });

    // If the user cancelled the prompt, stop checkout
    if (!phoneResult.isConfirmed) {
      setLoading(false);
      return;
    }

    const phone = phoneResult.value as string;
    // Persist phone so other parts of the app can access it if needed
    localStorage.setItem('guestPhone', phone);
    (window as any).guestPhone = phone;

    // Resume loading and continue checkout
    setLoading(true);

    logEvent(analytics, 'reached_checkout', { userId, phone });

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

    // --- BEGIN EmailJS Payload Generation ---

    // 1. Calculate the total price
    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const orderTotal = (total + deliveryFee).toFixed(2);

    posthog.capture('checkout_started', {
      delivery_fee: deliveryFee,
      platform: 'app',
      total_amount: total
    });

    // 2. Format the line items into a readable string (for the email body)
    const orderItemsHtml = cart.map(item =>
      `<li>${item.quantity} x ${item.name} @ TZS ${parseFloat(item.price).toFixed(2)}</li>`
    ).join(''); // This creates a single HTML string of <li> elements

    // 3. Construct the full template parameters object
    const templateParams = {
      // These keys must match the variable names in your EmailJS template
      customer_name: userId || phone, // Prefer userId, fallback to phone if guest
      order_id: `ORD-${Date.now()}`, // Generate a temporary ID
      order_items: `<ul>${orderItemsHtml}</ul>`, // The HTML list of items
      subtotal_amount: `TZS ${total.toFixed(2)}`,
      delivery_fee: `TZS ${deliveryFee.toFixed(2)}`,
      total_amount: `TZS ${orderTotal}`,
      admin_email: 'sosika.app@gmail.com', // The email address you want to send *to*
      guest_phone: phone,
      display_location: (() => {
        const s = localStorage.getItem('sosika_locations');
        if (!s) return 'N/A';
        try {
          const parsed = JSON.parse(s);
          const first = Array.isArray(parsed) ? parsed[0] : parsed;
          return first?.address ?? 'N/A';
        } catch {
          return 'N/A';
        }
      })(),
      location_coords: (() => {
        const s = localStorage.getItem('sosika_locations');
        if (!s) return 'N/A';
        try {
          const parsed = JSON.parse(s);
          const first = Array.isArray(parsed) ? parsed[0] : parsed;
          return (first && typeof first.lat !== 'undefined' && typeof first.lng !== 'undefined')
            ? `${first.lat},${first.lng}`
            : 'N/A';
        } catch {
          return 'N/A';
        }
      })(),
      raw_coordinates: (() => {
        const s = localStorage.getItem('sosika_locations');
        if (!s) return 'N/A';
        try {
          const parsed = JSON.parse(s);
          const first = Array.isArray(parsed) ? parsed[0] : parsed;
          return first ? JSON.stringify(first) : 'N/A';
        } catch {
          return 'N/A';
        }
      })(),
      // You can add any other details like delivery info here
      // delivery_address: '123 Main St',
    };

    // --- END EmailJS Payload Generation ---

    try {
      // Save order to Firestore
      const orderData = {
        userId: userId || 'guest',
        phone,
        cart,
        subtotal: total,
        deliveryFee,
        totalAmount: parseFloat(orderTotal),
        orderId: templateParams.order_id,
        displayLocation: templateParams.display_location,
        locationCoords: templateParams.location_coords,
        rawCoordinates: templateParams.raw_coordinates,
        timestamp: serverTimestamp(),
        status: 'pending',
        riderId: null,
        assignedAt: null,
        pickedUpAt: null,
        deliveredAt: null,
        paymentStatus: 'unpaid',
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      await updateDoc(docRef, { orderId: docRef.id });

      // ----------------------------------------------------------------
      // NEW EMAILJS INTEGRATION START
      // ----------------------------------------------------------------

      // 1. Define your IDs
      const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID; // e.g., 'gmail_service'
      const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID; // e.g., 'order_notification'

      // 2. Prepare the payload (reuse values computed above to avoid duplicate calculations)
      emailjs.send(SERVICE_ID, TEMPLATE_ID, {
        ...templateParams,
        order_id: docRef.id,   // use the real ID in the email too
        admin_email: 'sosika.app@gmail.com',
      }).catch(err => console.warn('Email failed silently:', err));

      await Swal.fire({
        title: 'Order Placed!',
        text: `Your order has been received. We'll notify you once it's confirmed.`,
        icon: 'success'
      });
      posthog.capture('order_placed', {
        orderId: docRef.id,
        total: parseFloat(orderTotal),
        itemCount: cart.length,
        deliveryFee,
      });
      setCart([]);

      // ----------------------------------------------------------------
      // NEW EMAILJS INTEGRATION END
      // ----------------------------------------------------------------

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
    deliveryFee,
  };
}
async function updateDoc(docRef: DocumentReference<DocumentData, DocumentData>, data: { orderId: string }): Promise<void> {
  try {
    // defer to the Firestore SDK's updateDoc (imported as firestoreUpdateDoc)
    await firestoreUpdateDoc(docRef as DocumentReference<DocumentData>, data);
  } catch (err) {
    console.error('Failed to update order document:', err);
    throw err;
  }
}

