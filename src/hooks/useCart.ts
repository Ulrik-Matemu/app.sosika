import { useState, useEffect, useCallback } from 'react';
import emailjs from '@emailjs/browser';
import Swal from 'sweetalert2';
import { logEvent, analytics, db } from '../firebase';
import { collection, addDoc, serverTimestamp, DocumentData, DocumentReference, updateDoc as firestoreUpdateDoc, doc, getDoc } from 'firebase/firestore';
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

export type DeliveryOptionId = 'asap' | 'bodaboda' | 'free' | 'pickup';

export interface DeliveryOption {
  id: DeliveryOptionId;
  label: string;
  sublabel: string;
  feeMultiplier: number;   // multiplied against the base distance fee
  fixedSurcharge: number;  // flat TZS added on top (e.g. ASAP premium)
  eta: string;             // display string e.g. "15–25 min"
  isFree: boolean;         // if true, fee is always 0 regardless of formula
  isPickup: boolean;       // if true, no delivery calculation at all
}

export const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'asap',
    label: 'ASAP by Sosika',
    sublabel: 'Premium delivery',
    feeMultiplier: 1.0,
    fixedSurcharge: 2000,
    eta: '15–25 min',
    isFree: false,
    isPickup: false
  },
  {
    id: 'bodaboda',
    label: 'Bodaboda',
    sublabel: 'Standard delivery',
    feeMultiplier: 1.0,
    fixedSurcharge: 0,
    eta: '25–45 min',
    isFree: false,
    isPickup: false
  },
  {
    id: 'free',
    label: 'Free delivery',
    sublabel: 'Scheduled delivery',
    feeMultiplier: 0,
    fixedSurcharge: 0,
    eta: 'Within 24 hrs',
    isFree: true,
    isPickup: false
  },
  {
    id: 'pickup',
    label: 'Self pickup',
    sublabel: 'You collect',
    feeMultiplier: 0,
    fixedSurcharge: 0,
    eta: 'You collect',
    isFree: true,
    isPickup: true
  }
];

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
  const [baseFee, setBaseFee] = useState<number>(0);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<DeliveryOptionId>('bodaboda');
  const [loading, setLoading] = useState<boolean>(false);
  const [calculatingFee, setCalculatingFee] = useState<boolean>(false);

  // Persist cart to localStorage on change and calculate total and delivery fee
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));

    const calculateTotals = async () => {
      setCalculatingFee(true);
      try {
        let subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
        let currentDeliveryFee = 0;
        let currentBaseFee = 0;

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
            currentBaseFee = Math.ceil(distance * 1200); // base in whole TZS

            const option = DELIVERY_OPTIONS.find(o => o.id === selectedDeliveryOption) || DELIVERY_OPTIONS[1];
            if (option.isFree || option.isPickup) {
              currentDeliveryFee = 0;
            } else {
              currentDeliveryFee = Math.ceil((currentBaseFee * option.feeMultiplier + option.fixedSurcharge) / 100) * 100;
            }
          }
        }
        console.log(currentDeliveryFee);
        setBaseFee(currentBaseFee);
        setDeliveryFee(currentDeliveryFee);
        setCartTotal(subtotal + currentDeliveryFee);
      } catch (err) {
        console.error("Error calculating totals:", err);
      } finally {
        setCalculatingFee(false);
      }
    };

    calculateTotals();
  }, [cart, userLocation, selectedDeliveryOption]);

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
      inputPlaceholder: 'e.g. 255712345678',
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
      total_amount: total,
      deliveryOption: selectedDeliveryOption
    });

    // 2. Format the line items into a readable string (for the email body)
    const orderItemsHtml = cart.map(item =>
      `<li>${item.quantity} × ${item.name} — TZS ${(parseFloat(item.price) * item.quantity).toLocaleString()}</li>`
    ).join(''); // This creates a single HTML string of <li> elements

    const displayLocation = (() => {
      const s = localStorage.getItem('sosika_locations');
      if (!s) return 'N/A';
      try {
        const parsed = JSON.parse(s);
        const first = Array.isArray(parsed) ? parsed[0] : parsed;
        return first?.address ?? 'N/A';
      } catch {
        return 'N/A';
      }
    })();

    const locationCoords = (() => {
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
    })();

    const rawCoordinates = (() => {
      const s = localStorage.getItem('sosika_locations');
      if (!s) return 'N/A';
      try {
        const parsed = JSON.parse(s);
        const first = Array.isArray(parsed) ? parsed[0] : parsed;
        return first ? JSON.stringify(first) : 'N/A';
      } catch {
        return 'N/A';
      }
    })();

    let vendorName = 'Unknown Vendor';
    if (cart.length > 0) {
      try {
        const vendorRef = doc(db, 'vendors', cart[0].vendor_id);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          // Fallback to 'name' or 'listing_data.name' depending on structure
          vendorName = vendorSnap.data().name || vendorSnap.data().listing_data?.name || 'Unknown Vendor';
        }
      } catch {
        vendorName = 'Unknown Vendor';
      }
    }

    const chosenOption = DELIVERY_OPTIONS.find(o => o.id === selectedDeliveryOption);
    const deliveryOptionLabel = chosenOption?.label ?? selectedDeliveryOption;
    const deliveryOptionEta = chosenOption?.eta ?? 'N/A';

    try {
      // Extract all distinct vendor IDs present in this purchase payload
      const uniqueVendorIds = [...new Set(cart.map(item => item.vendor_id).filter(Boolean))];

      // Save order to Firestore
      const orderData = {
        userId: userId || 'guest',
        phone,
        cart,
        subtotal: total,
        deliveryFee,
        totalAmount: parseFloat(orderTotal),
        orderId: `ORD-${Date.now()}`,
        displayLocation,
        locationCoords,
        rawCoordinates,
        timestamp: serverTimestamp(),
        status: 'pending',
        riderId: null,
        assignedAt: null,
        pickedUpAt: null,
        deliveredAt: null,
        paymentStatus: 'unpaid',
        deliveryOption: selectedDeliveryOption,
        vendor_name: vendorName,
        vendor_ids: uniqueVendorIds, // Explicit indexing map allows array-contains rules to run
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      await updateDoc(docRef, { orderId: docRef.id });

      const templateParams = {
        customer_phone: localStorage.getItem('guestPhone') || 'Guest',
        order_id: docRef.id,
        vendor_name: vendorName,
        order_items: `<ul>${orderItemsHtml}</ul>`,
        subtotal_amount: `TZS ${total.toFixed(2)}`,
        delivery_fee: `TZS ${deliveryFee.toFixed(2)}`,
        delivery_option: deliveryOptionLabel,
        delivery_eta: deliveryOptionEta,
        total_amount: `TZS ${orderTotal}`,
        admin_email: 'sosika.app@gmail.com',
        guest_phone: phone,
        display_location: displayLocation,
        customer_coords: locationCoords,
      };

      // 1. Define your IDs
      const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID; // e.g., 'gmail_service'
      const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID; // e.g., 'order_notification'

      // 2. Send admin notification email
      emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams)
        .catch(err => console.warn('Admin email failed silently:', err));

      // 3. Send vendor notification emails — free alert for each vendor involved in this order
      for (const vid of uniqueVendorIds) {
        try {
          const vRef = doc(db, 'vendors', vid);
          const vSnap = await getDoc(vRef);
          if (vSnap.exists()) {
            const vData = vSnap.data();
            const vendorEmail = vData?.auth_info?.email || vData?.email;
            const vName = vData?.name || vData?.listing_data?.name || 'Vendor';
            if (vendorEmail) {
              const vendorItems = cart
                .filter(item => item.vendor_id === vid)
                .map(item => `<li>${item.quantity} × ${item.name} — TZS ${(parseFloat(item.price) * item.quantity).toLocaleString()}</li>`)
                .join('');

              const vendorTemplateParams = {
                ...templateParams,
                admin_email: vendorEmail,
                vendor_name: vName,
                order_items: `<ul>${vendorItems}</ul>`,
              };
              emailjs.send(SERVICE_ID, TEMPLATE_ID, vendorTemplateParams)
                .catch(err => console.warn(`Vendor email to ${vendorEmail} failed silently:`, err));
            }
          }
        } catch (err) {
          console.warn(`Failed to send vendor email for ${vid}:`, err);
        }
      }

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
    baseFee,
    selectedDeliveryOption,
    setSelectedDeliveryOption,
    calculatingFee,
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
