import { useState, useEffect, useCallback } from 'react';
import emailjs from '@emailjs/browser';
import Swal from 'sweetalert2';
import { logEvent, analytics, db } from '../firebase';
import { collection, serverTimestamp, doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import { useLocationStorage } from './useLocationStorage';
import { calculateDistance, fetchVendorGeolocation } from '../pages/mood/api/mood-api';
import posthog from './../lib/posthog';
import { sendMesejiSMS } from '../services/meseji';

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
    label: 'Free Delivery Pass',
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

export const formatTZPhoneNumber = (rawPhone: string): string => {
  let cleaned = rawPhone.replace(/\D/g, ''); // Remove non-digits

  if (cleaned.startsWith('0')) {
    cleaned = '255' + cleaned.substring(1);
  } else if (/^[678]/.test(cleaned)) {
    cleaned = '255' + cleaned;
  }

  return cleaned;
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
  const [baseFee, setBaseFee] = useState<number>(0);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<DeliveryOptionId>('bodaboda');
  const [loading, setLoading] = useState<boolean>(false);
  const [calculatingFee, setCalculatingFee] = useState<boolean>(false);
  const [freeDeliveryUsesLeft, setFreeDeliveryUsesLeft] = useState<number>(3);
  const [freeDeliveryResetDate, setFreeDeliveryResetDate] = useState<number>(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // Fetch free delivery pass details on mount and whenever guestPhone/cart changes
  useEffect(() => {
    const fetchPass = async () => {
      const rawPhone = localStorage.getItem('guestPhone');
      const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      if (!rawPhone) {
        setFreeDeliveryUsesLeft(3);
        setFreeDeliveryResetDate(now + twoWeeksMs);
        return;
      }
      
      const phone = formatTZPhoneNumber(rawPhone);
      try {
        const passRef = doc(db, 'freeDeliveryPass', phone);
        const passSnap = await getDoc(passRef);
        
        if (passSnap.exists()) {
          const data = passSnap.data();
          const lastReset = data.lastResetTimestamp ?? now;
          if (now - lastReset >= twoWeeksMs) {
            // Lazy reset on read
            setFreeDeliveryUsesLeft(3);
            setFreeDeliveryResetDate(now + twoWeeksMs);
          } else {
            setFreeDeliveryUsesLeft(typeof data.usesLeft === 'number' ? data.usesLeft : 3);
            setFreeDeliveryResetDate(lastReset + twoWeeksMs);
          }
        } else {
          setFreeDeliveryUsesLeft(3);
          setFreeDeliveryResetDate(now + twoWeeksMs);
        }
      } catch (err) {
        console.error("Error fetching free delivery pass:", err);
        setFreeDeliveryUsesLeft(3);
        setFreeDeliveryResetDate(now + twoWeeksMs);
      }
    };
    fetchPass();
  }, [cart]);

  // Fallback to bodaboda if out of uses or suspended
  useEffect(() => {
    const isSuspended = Date.now() < new Date('2026-07-22T00:00:00+03:00').getTime();
    if ((freeDeliveryUsesLeft === 0 || isSuspended) && selectedDeliveryOption === 'free') {
      setSelectedDeliveryOption('bodaboda');
    }
  }, [freeDeliveryUsesLeft, selectedDeliveryOption]);

  // Persist cart to localStorage on change and calculate total and delivery fee
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));

    const calculateTotals = async () => {
      setCalculatingFee(true);
      try {
        let subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
        let currentDeliveryFee = 0;
        let currentBaseFee = 0;

        if (cart.length > 0) {
          const firstItemVendorId = cart[0].vendor_id;
          const vendorGeolocation = await fetchVendorGeolocation(firstItemVendorId);

          if (userLocation && vendorGeolocation) {
            const distance = calculateDistance(
              userLocation,
              vendorGeolocation
            );
            console.log("Calculated distance:", distance);

            // Delivery fee: 1200 TSH per kilometer
            // Calculate base fee (TZS 1200 per km)
            const calculatedBaseFee = Math.ceil(distance * 1200);

            // Enforce a minimum base fee of 2000 TZS to prevent 0 or unrealistically low delivery fees
            currentBaseFee = Math.max(calculatedBaseFee, 2000);
          } else {
            // Fallback base fee of 2000 TZS if user location or vendor geolocation is unavailable
            currentBaseFee = 2000;
          }

          let option = DELIVERY_OPTIONS.find(o => o.id === selectedDeliveryOption) || DELIVERY_OPTIONS[1];
          const isSuspended = Date.now() < new Date('2026-07-22T00:00:00+03:00').getTime();
          if (isSuspended && option.id === 'free') {
            option = DELIVERY_OPTIONS.find(o => o.id === 'bodaboda') || DELIVERY_OPTIONS[1];
          }
          if (option.isFree || option.isPickup) {
            currentDeliveryFee = 0;
          } else {
            currentDeliveryFee = Math.ceil((currentBaseFee * option.feeMultiplier + option.fixedSurcharge) / 100) * 100;
            // Add nighttime delivery surcharge of 2000 TZS from 19:00 (7 PM) to 6:00 AM
            const hour = new Date().getHours();
            if (hour >= 19 || hour < 6) {
              currentDeliveryFee += 2000;
            }
          }

          const serviceFee = 1000;
          setCartTotal(subtotal + currentDeliveryFee + serviceFee);
        } else {
          setCartTotal(0);
        }
        console.log("Final delivery fee:", currentDeliveryFee);
        setBaseFee(currentBaseFee);
        setDeliveryFee(currentDeliveryFee);
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

  const checkout = async () => {
    setLoading(true);

    // Block orders if it is between 22:00 (10 PM) and 6:00 AM
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      await Swal.fire({
        title: 'We Are Closed',
        text: 'All vendors are closed. Orders can only be placed between 06:00 AM and 10:00 PM.',
        icon: 'info',
        confirmButtonColor: '#00bfff'
      });
      setLoading(false);
      return;
    }

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

    const rawPhone = phoneResult.value as string;
    // Format the phone number properly for systemic consistency
    const formattedPhone = formatTZPhoneNumber(rawPhone);

    // Persist formatted phone so other parts of the app can access it if needed
    localStorage.setItem('guestPhone', formattedPhone);
    (window as any).guestPhone = formattedPhone;

    // Resume loading and continue checkout
    setLoading(true);

    logEvent(analytics, 'reached_checkout', { userId, phone: formattedPhone });

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
    const serviceFee = 1000;
    const orderTotal = (total + deliveryFee + serviceFee).toFixed(2);

    posthog.capture('checkout_started', {
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
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

      // Pre-allocate DocumentReference and order ID
      const orderRef = doc(collection(db, 'orders'));
      const generatedOrderId = orderRef.id;

      // Save order to Firestore
      const orderData = {
        userId: userId || 'guest',
        phone: formattedPhone, // Saved clean version
        cart,
        subtotal: total,
        deliveryFee,
        serviceFee: 1000,
        totalAmount: parseFloat(orderTotal),
        orderId: generatedOrderId,
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
        vendor_ids: uniqueVendorIds,
      };

      let docRef = orderRef;

      if (selectedDeliveryOption === 'free') {
        const isSuspended = Date.now() < new Date('2026-07-22T00:00:00+03:00').getTime();
        if (isSuspended) {
          await Swal.fire({
            title: 'Option Unavailable',
            text: 'Free Delivery Pass is temporarily suspended until 22nd July.',
            icon: 'error',
            confirmButtonColor: '#00bfff'
          });
          setLoading(false);
          return;
        }
        const passRef = doc(db, 'freeDeliveryPass', formattedPhone);
        const now = Date.now();
        const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

        try {
          await runTransaction(db, async (transaction) => {
            const passSnap = await transaction.get(passRef);
            let usesLeft = 3;
            let lastReset = now;

            if (passSnap.exists()) {
              const data = passSnap.data();
              lastReset = data.lastResetTimestamp ?? now;
              if (now - lastReset >= twoWeeksMs) {
                usesLeft = 3;
                lastReset = now;
              } else {
                usesLeft = data.usesLeft ?? 0;
              }
            }

            if (usesLeft <= 0) {
              throw new Error("OUT_OF_USES");
            }

            transaction.set(passRef, {
              usesLeft: usesLeft - 1,
              lastResetTimestamp: lastReset,
              lastUsedAt: serverTimestamp()
            }, { merge: true });

            transaction.set(orderRef, orderData);
          });

          // Decrement local state immediately
          setFreeDeliveryUsesLeft(prev => Math.max(0, prev - 1));
          setFreeDeliveryResetDate(prev => {
            if (now - (prev - twoWeeksMs) >= twoWeeksMs) {
              return now + twoWeeksMs;
            }
            return prev;
          });
        } catch (err: any) {
          if (err.message === "OUT_OF_USES") {
            await Swal.fire({
              title: 'Limit Reached',
              text: 'You have used up your 3 free deliveries for this cycle. Please select Bodaboda or ASAP delivery.',
              icon: 'warning'
            });
          } else {
            console.error("Transaction failed:", err);
            await Swal.fire({
              title: 'Checkout Error',
              text: 'Could not verify your Free Delivery Pass. Please try again.',
              icon: 'error'
            });
          }
          setLoading(false);
          return;
        }
      } else {
        // Regular non-free delivery order creation
        await setDoc(orderRef, orderData);
      }

      const templateParams = {
        customer_phone: formattedPhone,
        order_id: generatedOrderId,
        vendor_name: vendorName,
        order_items: `<ul>${orderItemsHtml}</ul>`,
        subtotal_amount: `TZS ${total.toFixed(2)}`,
        service_fee: `TZS 1000.00`,
        delivery_fee: `TZS ${deliveryFee.toFixed(2)}`,
        delivery_option: deliveryOptionLabel,
        delivery_eta: deliveryOptionEta,
        total_amount: `TZS ${orderTotal}`,
        admin_email: 'sosika.app@gmail.com',
        guest_phone: formattedPhone,
        display_location: displayLocation,
        customer_coords: locationCoords,
      };

      // 1. Define your IDs
      const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

      // 2. Send admin notification email
      emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams)
        .catch(err => console.warn('Admin email failed silently:', err));

      // 3. Send vendor notification emails
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

      // --- BEGIN MESEJI SMS NOTIFICATIONS ---

      // A. Prepare line items summary for standard SMS length limit
      const adminItemsText = cart
        .map(item => `${item.quantity}x ${item.name}`)
        .join(', ');

      // B. Send notification to the 2 Admin numbers in one operation
      const ADMIN_PHONES = '255760903468'; // Remember to return Abbas
      const adminSMSMessage = `New Sosika Order!\nOrder ID: ${docRef.id}\nVendor: ${vendorName}\nItems: ${adminItemsText}\nTotal: TZS ${orderTotal}\nCustomer: +${formattedPhone}\nLocation: ${displayLocation}`;

      sendMesejiSMS(ADMIN_PHONES, adminSMSMessage);

      // C. Send order confirmation to Customer
      const customerSMSMessage = `Habari! Oda yako ya Sosika imepokelewa kwa ufanisi.\nOda ID: ${docRef.id}\nJumla: TZS ${orderTotal}\nTunakujulisha punde itakapothibitishwa. Ahsante!`;

      sendMesejiSMS(formattedPhone, customerSMSMessage);

      // D. Send SMS notification to Premium Vendors (subscription-gated)
      for (const vid of uniqueVendorIds) {
        try {
          const vRef = doc(db, 'vendors', vid);
          const vSnap = await getDoc(vRef);
          if (vSnap.exists()) {
            const vData = vSnap.data();
            const isPremium = vData?.subscription?.tier === 'premium';
            const hasSmsFeature = vData?.subscription?.features_enabled?.sms_notifications === true;

            if (isPremium || hasSmsFeature) {
              const vendorPhone = vData?.phone || vData?.listing_data?.phone || vData?.auth_info?.phone_number;
              if (vendorPhone) {
                const formattedVendorPhone = formatTZPhoneNumber(vendorPhone);
                const vendorItemsText = cart
                  .filter(item => item.vendor_id === vid)
                  .map(item => `${item.quantity}x ${item.name}`)
                  .join(', ');
                const vName = vData?.name || vData?.listing_data?.name || 'Vendor';
                const vendorSMSMessage = `Sosika: ${vName} unayo Oda Mpya! 🔔\nOda: ${docRef.id}\nBidhaa: ${vendorItemsText}\nJumla: TZS ${orderTotal}\nMteja: +${formattedPhone}\nMahali: ${displayLocation}\nFungua Sosika Console kuthibitisha.`;

                sendMesejiSMS(formattedVendorPhone, vendorSMSMessage);
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to send vendor SMS for ${vid}:`, err);
        }
      }

      // --- END MESEJI SMS NOTIFICATIONS ---

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
    freeDeliveryUsesLeft,
    freeDeliveryResetDate,
  };
}

// async function updateDoc(docRef: DocumentReference<DocumentData, DocumentData>, data: { orderId: string }): Promise<void> {
//   try {
//     // defer to the Firestore SDK's updateDoc (imported as firestoreUpdateDoc)
//     await firestoreUpdateDoc(docRef as DocumentReference<DocumentData>, data);
//   } catch (err) {
//     console.error('Failed to update order document:', err);
//     throw err;
//   }
// }
