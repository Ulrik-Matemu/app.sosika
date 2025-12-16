import { useState, useEffect, useCallback } from 'react';
import emailjs from '@emailjs/browser';
import Swal from 'sweetalert2';
// import { getOrderSummaryHtml } from '../pages/explore/orderSummaryHtml';
import { logEvent, analytics } from '../firebase';
// import axios from 'axios';
// import { getDeliveryFee } from '../services/deliveryFee';
// import { toast } from './use-toast';

emailjs.init(import.meta.env.VITE_EMAILJS_USER_ID);

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
      // Pause loading while we ask the user for a phone number (guest checkout only)
      setLoading(false);

      const phoneResult = await Swal.fire({
      title: 'Let Us Reach Out',
      text: 'Please enter your phone number to continue with checkout.',
      icon: 'info',
      input: 'tel',
      inputLabel: 'Phone Number',
      inputPlaceholder: 'e.g. +1234567890',
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
      if (phoneResult.isDismissed) {
      return;
      }

      const phone = phoneResult.value as string;
      // Persist guest phone so other parts of the app can access it if needed
      localStorage.setItem('guestPhone', phone);
      (window as any).guestPhone = phone;

      // Resume loading and continue checkout as guest
      setLoading(true);
      // Note: downstream code currently uses `userId`. Consider updating templateParams/logEvent
      // to prefer guestPhone when userId is absent.
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

    // --- BEGIN EmailJS Payload Generation ---

    const locationJsonString = localStorage.getItem('sosika_locations');

let locationCoords = 'N/A';
let mapLinkCoords = 'N/A';

if (locationJsonString && locationJsonString !== 'N/A') {
    try {
        // Parse the JSON string into an object
        const locationObject = JSON.parse(locationJsonString);
        
        // Format the coordinates as a comma-separated string for the template
        locationCoords = `${locationObject.lat},${locationObject.lng}`; 
        
        // This is the formatted string used in the Google Maps link
        mapLinkCoords = locationCoords; 

    } catch (e) {
        console.error("Error parsing location JSON:", e);
        // Fallback if parsing fails
        mapLinkCoords = 'N/A';
        locationCoords = 'N/A';
    }
}

    // 1. Calculate the total price
    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    const orderTotal = total.toFixed(2);

    // 2. Format the line items into a readable string (for the email body)
    const orderItemsHtml = cart.map(item =>
      `<li>${item.quantity} x ${item.name} @ $${parseFloat(item.price).toFixed(2)}</li>`
    ).join(''); // This creates a single HTML string of <li> elements

    // 3. Construct the full template parameters object
    const templateParams = {
      // These keys must match the variable names in your EmailJS template
      customer_name: userId, // Assuming userId is the customer's name/ID
      order_id: `ORD-${Date.now()}`, // Generate a temporary ID
      order_items: `<ul>${orderItemsHtml}</ul>`, // The HTML list of items
      total_amount: `$${orderTotal}`,
      admin_email: 'sosika.app@gmail.com', // The email address you want to send *to*
      guest_phone: localStorage.getItem('guestPhone') || 'N/A',
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

      // ----------------------------------------------------------------
      // NEW EMAILJS INTEGRATION START
      // ----------------------------------------------------------------

      // 1. Define your IDs
            const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID; // e.g., 'gmail_service'
            const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID; // e.g., 'order_notification'
      
            // 2. Prepare the payload (reuse values computed above to avoid duplicate calculations)
            const emailTemplateParams = {
              ...templateParams,
              admin_email: 'sosika.app@gmail.com', // Recipient email
            };
      
            // 3. Send the email!
            const emailResponse = await emailjs.send(
              SERVICE_ID,
              TEMPLATE_ID,
              emailTemplateParams
            );

      if (emailResponse.status === 200) {
        await Swal.fire({
          title: 'Order Submitted',
          text: `Order ID: ${templateParams.order_id} has been sent successfully! We will contact you shortly.`,
          icon: "success"
        });
        setCart([]); // Clear the cart on success
        // window.location.href = `/order-tracking/${templateParams.order_id}`; // Redirect if desired
      } else {
        // Handle non-200 EmailJS response
        throw new Error(`EmailJS failed with status: ${emailResponse.status}`);
      }

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
  };
}
