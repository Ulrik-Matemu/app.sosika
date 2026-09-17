import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Clock,
  Check,
  Sparkles,
  Phone,
  Copy,
  MessageSquare,
  Wallet,
  Coins,
  ShieldCheck,
} from "lucide-react";
import { collection, getDocs, getDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { MenuItem, Vendor } from "../mood/types/types";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { useDropCountdown } from "../../hooks/useDropCountdown";
import { useWallet } from "../../context/WalletContext";
import { usePlatformConfig } from "../../hooks/usePlatformConfig";
import { formatTZPhoneNumber } from "../../hooks/useCart";
import { sendMesejiSMS } from "../../services/meseji";
import emailjs from "@emailjs/browser";
import TopUpWalletModal from "../../components/my-components/TopUpWalletModal";
import Navbar from "../../components/my-components/navbar";
import Swal from "sweetalert2";
import posthog from "posthog-js";

emailjs.init(import.meta.env.VITE_EMAILJS_USER_ID);

// Lipa Namba & Admin Contact details matching TopUpWalletModal
const LIPA_NUMBER = "353438054";
const WHATSAPP_PHONE = "255760903468";

// Portion pricing defaults for Custom Biryani
const PORTIONS = [
  { id: "single", label: "Single Portion", sublabel: "1 Person", price: 12000 },
  { id: "double", label: "Double Portion", sublabel: "2 Persons", price: 22000 },
  { id: "family", label: "Family Feast Pack", sublabel: "4–5 Persons", price: 45000 },
];

const PROTEINS = [
  { id: "chicken", label: "Chicken (Kuku)", priceModifier: 0 },
  { id: "beef", label: "Beef (Ng'ombe)", priceModifier: 0 },
  { id: "goat", label: "Goat / Mutton (Mbuzi)", priceModifier: 2000 },
  { id: "fish", label: "Fish (Samaki)", priceModifier: 3000 },
  { id: "veggie", label: "Vegetarian Biryani", priceModifier: -1000 },
];

const SIDES = [
  { id: "kachumbari", label: "Kachumbari Salad", price: 1000 },
  { id: "egg", label: "Boiled Egg", price: 1000 },
  { id: "gravy", label: "Extra Spicy Gravy", price: 2000 },
  { id: "rice", label: "Extra Biryani Rice", price: 3000 },
];

// Helper to compute next Friday's date (used for order metadata, separate from the live countdown display)
function getNextFridayTarget(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const target = new Date(now);

  if (dayOfWeek === 5 && now.getHours() < 22) {
    return now;
  }

  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0) daysUntilFriday = 7;

  target.setDate(now.getDate() + daysUntilFriday);
  target.setHours(12, 0, 0, 0);
  return target;
}

export default function BiryaniPage() {
  const navigate = useNavigate();
  const { locations } = useLocationStorage();
  const userLocation = locations[0] || { lat: -3.37, lng: 36.7, address: "Arusha City" };
  const platformConfig = usePlatformConfig();
  const { balance, phone: walletPhone } = useWallet();

  // State
  const [activeTab, setActiveTab] = useState<"catalog" | "custom">("catalog");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [vendorsMap, setVendorsMap] = useState<Record<string, Vendor>>({});
  const [loadingItems, setLoadingItems] = useState(true);

  // Countdown state — shared with Home and Search drop teasers
  const countdown = useDropCountdown();

  // Custom Biryani Builder State
  const [selectedPortion, setSelectedPortion] = useState(PORTIONS[0]);
  const [selectedProtein, setSelectedProtein] = useState(PROTEINS[0]);
  const [selectedSides, setSelectedSides] = useState<string[]>(["kachumbari"]);
  const [customInstructions, setCustomInstructions] = useState("");

  // Selected Item for Checkout (catalog or custom)
  const [checkoutItem, setCheckoutItem] = useState<{
    id: string;
    name: string;
    price: number;
    vendor_id: string;
    vendor_name: string;
    details: string;
  } | null>(null);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState(localStorage.getItem("guestPhone") || walletPhone || "");
  const [paymentMethod, setPaymentMethod] = useState<"lipa_namba" | "wallet" | "cod">("lipa_namba");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLipa, setCopiedLipa] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  // 2. Fetch Biryani items from Firestore
  useEffect(() => {
    const loadBiryaniData = async () => {
      setLoadingItems(true);
      try {
        // Fetch vendors
        const vendorSnap = await getDocs(collection(db, "vendors"));
        const vMap: Record<string, Vendor> = {};
        vendorSnap.forEach((d) => {
          vMap[d.id] = { id: d.id, ...d.data() } as Vendor;
        });
        setVendorsMap(vMap);

        // Fetch menu items matching biryani
        const itemSnap = await getDocs(collection(db, "menuItems"));
        const bItems: MenuItem[] = [];
        itemSnap.forEach((d) => {
          const data = d.data() as MenuItem;
          const searchStr = `${data.name} ${data.category} ${data.description || ""}`.toLowerCase();
          if (searchStr.includes("biryani") || searchStr.includes("birian") || searchStr.includes("biryan")) {
            bItems.push({ ...data, id: d.id });
          }
        });
        setMenuItems(bItems);
      } catch (err) {
        console.error("Failed to load biryani data:", err);
      } finally {
        setLoadingItems(false);
      }
    };

    loadBiryaniData();
  }, []);

  // Calculate Custom Biryani Total
  const customTotal = useMemo(() => {
    let total = selectedPortion.price + selectedProtein.priceModifier;
    selectedSides.forEach((sideId) => {
      const side = SIDES.find((s) => s.id === sideId);
      if (side) total += side.price;
    });
    return Math.max(10000, total);
  }, [selectedPortion, selectedProtein, selectedSides]);

  // Delivery Fee calculation
  const calculatedDeliveryFee = useMemo(() => {
    if (!platformConfig.loaded) return 2000;
    return platformConfig.minBaseFee || 2000;
  }, [platformConfig]);

  const handleOpenCatalogCheckout = (item: MenuItem) => {
    const vName = vendorsMap[item.vendor_id]?.name || "Sosika Biryani Partner";
    setCheckoutItem({
      id: item.id,
      name: item.name,
      price: parseFloat(item.price) || 12000,
      vendor_id: item.vendor_id,
      vendor_name: vName,
      details: item.description || "Fresh Friday Biryani",
    });
    setIsCheckoutOpen(true);
  };

  const handleOpenCustomCheckout = () => {
    const sidesText = selectedSides
      .map((sId) => SIDES.find((s) => s.id === sId)?.label)
      .filter(Boolean)
      .join(", ");

    const details = `${selectedPortion.label} (${selectedProtein.label}) ${
      sidesText ? `+ ${sidesText}` : ""
    } ${customInstructions ? `[Note: ${customInstructions}]` : ""}`;

    // Pick first vendor or default
    const firstVendorId = Object.keys(vendorsMap)[0] || "sosika_main_kitchen";
    const vName = vendorsMap[firstVendorId]?.name || "Sosika Gourmet Kitchen";

    setCheckoutItem({
      id: `custom_biryani_${Date.now()}`,
      name: `Custom Biryani (${selectedProtein.label})`,
      price: customTotal,
      vendor_id: firstVendorId,
      vendor_name: vName,
      details,
    });
    setIsCheckoutOpen(true);
  };

  const copyLipaNumber = () => {
    navigator.clipboard.writeText(LIPA_NUMBER);
    setCopiedLipa(true);
    setTimeout(() => setCopiedLipa(false), 2000);
  };

  const handlePlaceOrder = async () => {
    if (!checkoutItem) return;
    if (!phoneInput.trim()) {
      Swal.fire({
        title: "Phone Required",
        text: "Please enter your phone number so we can reach you for delivery.",
        icon: "warning",
        confirmButtonColor: "#00bfff",
      });
      return;
    }

    const formattedPhone = formatTZPhoneNumber(phoneInput);
    localStorage.setItem("guestPhone", formattedPhone);

    const subtotal = checkoutItem.price;
    const serviceFee = platformConfig.serviceFee || 1000;
    const totalAmount = subtotal + calculatedDeliveryFee + serviceFee;

    // Check Wallet Balance if paying with wallet
    if (paymentMethod === "wallet" && balance < totalAmount) {
      Swal.fire({
        title: "Insufficient Wallet Balance",
        text: `Your wallet balance is TZS ${balance.toLocaleString()}. You need TZS ${totalAmount.toLocaleString()} to complete this order.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Top Up Wallet",
        confirmButtonColor: "#00bfff",
      }).then((res) => {
        if (res.isConfirmed) {
          setIsTopUpOpen(true);
        }
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const orderRef = doc(collection(db, "orders"));
      const generatedOrderId = orderRef.id;

      const isFriday = countdown.isLive;
      const targetDate = isFriday ? new Date().toISOString().split("T")[0] : getNextFridayTarget().toISOString().split("T")[0];

      const orderData = {
        userId: localStorage.getItem("userId") || "guest",
        phone: formattedPhone,
        cart: [
          {
            id: checkoutItem.id,
            name: checkoutItem.name,
            price: checkoutItem.price.toString(),
            quantity: 1,
            vendor_id: checkoutItem.vendor_id,
            description: checkoutItem.details,
          },
        ],
        subtotal,
        deliveryFee: calculatedDeliveryFee,
        serviceFee,
        totalAmount,
        orderId: generatedOrderId,
        displayLocation: userLocation.address || "Arusha",
        locationCoords: `${userLocation.lat},${userLocation.lng}`,
        rawCoordinates: JSON.stringify(userLocation),
        timestamp: serverTimestamp(),
        status: "pending",
        riderId: null,
        assignedAt: null,
        pickedUpAt: null,
        deliveredAt: null,
        paymentStatus: paymentMethod === "wallet" ? "paid_via_wallet" : "unpaid",
        paymentMethod: paymentMethod === "wallet" ? "sosika_cash" : paymentMethod === "lipa_namba" ? "lipa_namba" : "cash_on_delivery",
        walletDiscount: 0,
        cashPayable: paymentMethod === "wallet" ? 0 : totalAmount,
        deliveryOption: "bodaboda",
        vendor_name: checkoutItem.vendor_name,
        vendor_ids: [checkoutItem.vendor_id],
        isFridayPreOrder: !isFriday,
        scheduledForDate: targetDate,
        customInstructions: checkoutItem.details,
      };

      await setDoc(orderRef, orderData);

      // --- BEGIN EMAILJS & MESEJI SMS NOTIFICATIONS ---
      const orderItemsHtml = `<li>1 × ${checkoutItem.name} (${checkoutItem.details}) — TZS ${subtotal.toLocaleString()}</li>`;
      const templateParams = {
        customer_phone: formattedPhone,
        order_id: generatedOrderId,
        vendor_name: checkoutItem.vendor_name,
        order_items: `<ul>${orderItemsHtml}</ul>`,
        subtotal_amount: `TZS ${subtotal.toFixed(2)}`,
        service_fee: `TZS ${serviceFee.toFixed(2)}`,
        delivery_fee: `TZS ${calculatedDeliveryFee.toFixed(2)}`,
        delivery_option: "Bodaboda (Friday Special)",
        delivery_eta: isFriday ? "Today 12:00 PM" : `Friday ${targetDate}`,
        total_amount: `TZS ${totalAmount.toFixed(2)}`,
        admin_email: "sosika.app@gmail.com",
        guest_phone: formattedPhone,
        display_location: userLocation.address || "Arusha",
        customer_coords: `${userLocation.lat},${userLocation.lng}`,
      };

      const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

      // 1. Send Admin Email
      if (SERVICE_ID && TEMPLATE_ID) {
        emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams)
          .catch((err) => console.warn("Admin EmailJS failed silently:", err));
      }

      // 2. Send Vendor Email
      try {
        const vRef = doc(db, "vendors", checkoutItem.vendor_id);
        const vSnap = await getDoc(vRef);
        if (vSnap.exists()) {
          const vData = vSnap.data();
          const vendorEmail = vData?.auth_info?.email || vData?.email;
          if (vendorEmail && SERVICE_ID && TEMPLATE_ID) {
            const vendorTemplateParams = {
              ...templateParams,
              admin_email: vendorEmail,
              vendor_name: vData?.name || checkoutItem.vendor_name,
            };
            emailjs.send(SERVICE_ID, TEMPLATE_ID, vendorTemplateParams)
              .catch((err) => console.warn("Vendor EmailJS failed silently:", err));
          }
        }
      } catch (err) {
        console.warn("Failed to send vendor email:", err);
      }

      // 3. Send Admin SMS via Meseji
      const adminSMS = `New Friday Biryani ${!isFriday ? "Pre-Order" : "Order"}!\nOrder ID: ${generatedOrderId}\nVendor: ${checkoutItem.vendor_name}\nItem: ${checkoutItem.name}\nTotal: TZS ${totalAmount.toLocaleString()}\nCustomer: +${formattedPhone}\nLocation: ${userLocation.address || "Arusha"}`;
      sendMesejiSMS("255778903468", adminSMS, generatedOrderId);

      // 4. Send Customer SMS via Meseji
      const customerSMS = isFriday
        ? `Habari! Oda yako ya Friday Biryani imepokelewa kwa ufanisi.\nOda ID: ${generatedOrderId}\nJumla: TZS ${totalAmount.toLocaleString()}\nTunaiandaa sasa hivi. Ahsante!`
        : `Habari! Pre-order yako ya Friday Biryani imepokelewa kwa ufanisi.\nOda ID: ${generatedOrderId}\nJumla: TZS ${totalAmount.toLocaleString()}\nSiku ya Delivery: Ijumaa (${targetDate}). Ahsante!`;
      sendMesejiSMS(formattedPhone, customerSMS, generatedOrderId);

      // 5. Send Vendor SMS via Meseji if subscribed
      try {
        const vRef = doc(db, "vendors", checkoutItem.vendor_id);
        const vSnap = await getDoc(vRef);
        if (vSnap.exists()) {
          const vData = vSnap.data();
          const isPremium = vData?.subscription?.tier === "premium";
          const hasSmsFeature = vData?.subscription?.features_enabled?.sms_notifications === true;
          if (isPremium || hasSmsFeature) {
            const vendorPhone = vData?.phone || vData?.listing_data?.phone || vData?.auth_info?.phone_number;
            if (vendorPhone) {
              const vendorSMS = `New Biryani Order Received!\nOrder ID: ${generatedOrderId}\nItem: ${checkoutItem.name}\nCustomer: +${formattedPhone}`;
              sendMesejiSMS(vendorPhone, vendorSMS, generatedOrderId);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to send vendor SMS:", err);
      }

      posthog.capture("biryani_order_placed", {
        order_id: generatedOrderId,
        is_preorder: !isFriday,
        payment_method: paymentMethod,
        total_amount: totalAmount,
      });

      setIsCheckoutOpen(false);

      Swal.fire({
        title: isFriday ? "Order Placed! 🍛" : "Pre-Order Secured! 🍛",
        text: isFriday
          ? "Your Friday Biryani order has been received and is being prepared!"
          : `Your pre-order for Friday (${targetDate}) has been locked in! We will contact you on Friday morning.`,
        icon: "success",
        confirmButtonColor: "#00bfff",
        confirmButtonText: "Track Order",
      }).then(() => {
        navigate(`/track/${generatedOrderId}`);
      });
    } catch (err) {
      console.error("Failed to place biryani order:", err);
      Swal.fire({
        title: "Order Failed",
        text: "Could not place your order. Please try again.",
        icon: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ground text-content pb-32">
      {/* Drop photo header */}
      <div className="relative h-[200px] bg-[repeating-linear-gradient(135deg,#1B160A_0_7px,#141009_7px_14px)] flex flex-col justify-between p-5">
        <button
          onClick={() => navigate(-1)}
          className="w-[34px] h-[34px] rounded-xl bg-black/70 border border-edge-3 flex items-center justify-center text-white flex-none"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-amber-ink">
            Weekly drop
          </div>
          <h1 className="text-[28px] font-bold tracking-[-0.025em] mt-[7px]">Friday Biryani</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-5 space-y-5">
        {/* Countdown panel */}
        <div className="rounded-[20px] border border-sosika-amber/28 bg-sosika-amber/[0.055] p-[18px]">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-amber-ink">
              {countdown.isLive ? "Orders open now" : "Orders close in"}
            </span>
            <span className="text-[11px] font-semibold text-content-tertiary truncate max-w-[140px]">
              {userLocation.address}
            </span>
          </div>

          {countdown.isLive ? (
            <div className="mt-3">
              <h2 className="text-[15px] font-bold text-content">
                Fresh hot biryani is available today
              </h2>
              <p className="text-[13px] text-content-secondary leading-[1.55] mt-2">
                Order now for instant lunch or dinner delivery.
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mt-[14px]">
                <div className="flex-1 bg-black/60 rounded-[13px] py-3 text-center">
                  <div className="font-mono text-[22px] font-bold text-amber-ink leading-none">{countdown.days}</div>
                  <div className="font-mono text-[9px] text-content-muted uppercase tracking-[0.14em] mt-1">Days</div>
                </div>
                <div className="flex-1 bg-black/60 rounded-[13px] py-3 text-center">
                  <div className="font-mono text-[22px] font-bold text-amber-ink leading-none">{countdown.hours}</div>
                  <div className="font-mono text-[9px] text-content-muted uppercase tracking-[0.14em] mt-1">Hrs</div>
                </div>
                <div className="flex-1 bg-black/60 rounded-[13px] py-3 text-center">
                  <div className="font-mono text-[22px] font-bold text-amber-ink leading-none">{countdown.minutes}</div>
                  <div className="font-mono text-[9px] text-content-muted uppercase tracking-[0.14em] mt-1">Min</div>
                </div>
              </div>
              <p className="text-[13px] text-content-secondary leading-[1.55] mt-[14px]">
                Biryani is a Friday tradition. Pre-order now to guarantee your portion — you pay at delivery, same as any order.
              </p>
            </>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex-1 text-center text-[13px] py-3 rounded-[13px] transition-colors ${
              activeTab === "catalog"
                ? "font-bold text-on-accent bg-sosika-cyan"
                : "font-semibold text-content-tertiary bg-surface-2 border border-edge-2"
            }`}
          >
            Available now
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`flex-1 text-center text-[13px] py-3 rounded-[13px] transition-colors ${
              activeTab === "custom"
                ? "font-bold text-on-accent bg-sosika-cyan"
                : "font-semibold text-content-tertiary bg-surface-2 border border-edge-2"
            }`}
          >
            Custom order
          </button>
        </div>

        {/* CATALOG TAB */}
        {activeTab === "catalog" && (
          <div>
            {loadingItems ? (
              <div className="py-12 text-center text-content-muted text-xs flex justify-center items-center gap-2">
                <Clock className="w-4 h-4 animate-spin" /> Loading Biryani spots...
              </div>
            ) : menuItems.length === 0 ? (
              <div className="bg-surface-1 border border-edge-2 rounded-2xl p-6 text-center space-y-3">
                <p className="text-xs text-content-tertiary">
                  No standard vendor biryani items listed yet, but you can build a custom Biryani order right now!
                </p>
                <button
                  onClick={() => setActiveTab("custom")}
                  className="px-4 py-2 rounded-xl bg-sosika-cyan text-black font-bold text-xs"
                >
                  Create Custom Biryani Order 🍛
                </button>
              </div>
            ) : (
              menuItems.map((item, idx) => {
                const vendorName = vendorsMap[item.vendor_id]?.name || "Sosika Biryani Spot";
                const isFirst = idx === 0;
                return (
                  <div
                    key={item.id}
                    className="flex gap-3.5 items-center py-3.5 border-b border-edge-1 last:border-b-0"
                  >
                    <div className="flex-none w-14 h-14 rounded-[15px] overflow-hidden bg-[repeating-linear-gradient(135deg,#17171A_0_7px,#131316_7px_14px)]">
                      {item.image_url && (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[10px] tracking-[0.1em] text-content-muted truncate uppercase">
                        {vendorName}
                      </p>
                      <h3 className="text-[15px] font-semibold text-content truncate mt-1">{item.name}</h3>
                      <p className="font-mono text-[13px] font-bold text-content mt-[5px]">
                        {Number(item.price).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenCatalogCheckout(item)}
                      className={`flex-none text-xs px-3.5 py-2.5 rounded-[11px] transition-colors ${
                        isFirst
                          ? "font-bold text-on-accent bg-sosika-cyan"
                          : "font-semibold text-content-secondary border border-edge-3"
                      }`}
                    >
                      {countdown.isLive ? "Order now" : "Pre-order"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* CUSTOM ORDER BUILDER TAB */}
        {activeTab === "custom" && (
          <div className="bg-surface-1 border border-edge-2 rounded-2xl p-4 space-y-4">
            <h3 className="text-xs font-bold text-content uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-ink" />
              Build Your Custom Biryani
            </h3>

            {/* 1. Portion Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-content-tertiary mb-2">
                1. Select Portion Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PORTIONS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPortion(p)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedPortion.id === p.id
                        ? "bg-sosika-cyan/10 border-sosika-cyan text-white"
                        : "bg-black/30 border-edge-2 text-content-tertiary hover:border-edge-3"
                    }`}
                  >
                    <p className="text-xs font-bold">{p.label}</p>
                    <p className="text-[9px] text-content-tertiary">{p.sublabel}</p>
                    <p className="text-[10px] font-extrabold text-accent-ink mt-1">
                      {p.price.toLocaleString()} TZS
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Protein Choice */}
            <div>
              <label className="block text-[11px] font-semibold text-content-tertiary mb-2">
                2. Select Meat / Protein
              </label>
              <div className="space-y-1.5">
                {PROTEINS.map((prot) => (
                  <button
                    key={prot.id}
                    onClick={() => setSelectedProtein(prot)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all ${
                      selectedProtein.id === prot.id
                        ? "bg-sosika-amber/10 border-sosika-amber/40 text-amber-300"
                        : "bg-black/30 border-edge-2 text-content-tertiary hover:border-edge-3"
                    }`}
                  >
                    <span>{prot.label}</span>
                    {prot.priceModifier !== 0 && (
                      <span className="text-[10px] font-bold">
                        {prot.priceModifier > 0 ? `+${prot.priceModifier.toLocaleString()} TZS` : `${prot.priceModifier.toLocaleString()} TZS`}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Extra Sides */}
            <div>
              <label className="block text-[11px] font-semibold text-content-tertiary mb-2">
                3. Add Extra Sides (Optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SIDES.map((side) => {
                  const isSelected = selectedSides.includes(side.id);
                  return (
                    <button
                      key={side.id}
                      onClick={() => {
                        setSelectedSides((prev) =>
                          isSelected ? prev.filter((id) => id !== side.id) : [...prev, side.id]
                        );
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-sosika-emerald/10 border-sosika-emerald/40 text-emerald-300"
                          : "bg-black/30 border-edge-2 text-content-tertiary hover:border-edge-3"
                      }`}
                    >
                      <span>{side.label}</span>
                      <span className="text-[10px] font-bold text-content-tertiary">
                        +{side.price.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Special Instructions */}
            <div>
              <label className="block text-[11px] font-semibold text-content-tertiary mb-1">
                4. Special Preparation Notes (Optional)
              </label>
              <textarea
                placeholder="e.g. Extra spicy gravy, non-spicy rice, no onions in kachumbari..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={2}
                className="w-full bg-black/40 border border-edge-2 rounded-xl p-2.5 text-xs text-white placeholder-content-muted outline-none focus:border-sosika-cyan"
              />
            </div>

            {/* Price Summary & Order Button */}
            <div className="pt-3 border-t border-edge-2 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-content-tertiary">Total Custom Biryani Price</p>
                <p className="text-base font-bold text-accent-ink">{customTotal.toLocaleString()} TZS</p>
              </div>
              <button
                onClick={handleOpenCustomCheckout}
                className="px-5 py-2.5 rounded-xl bg-sosika-cyan text-black font-extrabold text-xs hover:bg-sosika-cyan transition-all shadow-md shadow-sosika-cyan/20"
              >
                {countdown.isLive ? "Order Custom Biryani 🍛" : "Pre-Order Custom Biryani 🍛"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CHECKOUT DRAWER */}
      {isCheckoutOpen && checkoutItem && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-scrim backdrop-blur-md">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="w-full max-w-md bg-ground border-t border-edge-2 rounded-t-[28px] p-5 pb-8 sm:pb-6 space-y-4 max-h-[88vh] overflow-y-auto select-none"
          >
            {/* Top Drag Handle */}
            <div className="w-10 h-1 bg-edge-3 rounded-full mx-auto mb-1 cursor-grab" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-edge-2 pb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-amber-ink uppercase tracking-widest">
                    {countdown.isLive ? "Friday Order Checkout" : "Friday Pre-Order Checkout"}
                  </span>
                  <span className="text-[9px] font-extrabold text-emerald-ink bg-sosika-emerald/10 px-1.5 py-0.5 rounded border border-sosika-emerald/20">
                    🔒 Secure 256-Bit
                  </span>
                </div>
                <h3 className="text-sm font-bold text-content truncate">{checkoutItem.name}</h3>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-2 border border-edge-2 flex items-center justify-center text-content-tertiary hover:text-content"
              >
                ✕
              </button>
            </div>

            {/* Item & Price Summary */}
            <div className="bg-surface-2 border border-edge-2 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-content-tertiary">Item Subtotal</span>
                <span className="font-bold text-content">{checkoutItem.price.toLocaleString()} TZS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-tertiary">Delivery Fee (Estimated)</span>
                <span className="font-bold text-content">{calculatedDeliveryFee.toLocaleString()} TZS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-tertiary">Service Fee</span>
                <span className="font-bold text-content">{(platformConfig.serviceFee || 1000).toLocaleString()} TZS</span>
              </div>
              <div className="pt-2 border-t border-edge-2 flex justify-between font-bold text-sm text-accent-ink">
                <span>Total Amount</span>
                <span>
                  {(checkoutItem.price + calculatedDeliveryFee + (platformConfig.serviceFee || 1000)).toLocaleString()} TZS
                </span>
              </div>
            </div>

            {/* Phone Number Entry */}
            <div>
              <label className="block text-xs font-semibold text-content-secondary mb-1">
                Your Contact Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                <input
                  type="tel"
                  placeholder="e.g. 0712345678 or 255712345678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-black/40 border border-edge-2 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-sosika-cyan"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-content-secondary mb-2">
                Select Payment Method
              </label>
              <div className="space-y-2">
                {/* 1. Lipa Namba */}
                <button
                  onClick={() => setPaymentMethod("lipa_namba")}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    paymentMethod === "lipa_namba"
                      ? "bg-sosika-cyan/10 border-sosika-cyan text-white"
                      : "bg-surface-2 border-edge-2 text-content-tertiary hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Coins className="w-4 h-4 text-accent-ink" />
                    <div>
                      <p className="text-xs font-bold">Lipa Namba (Advance Payment)</p>
                      <p className="text-[10px] text-content-tertiary">Pay via Vodacom / Tigo / Airtel Lipa Namba</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-accent-ink bg-sosika-cyan/10 px-2 py-0.5 rounded">
                    Recommended
                  </span>
                </button>

                {/* 2. Sosika Wallet — temporarily disabled. This path used to
                    mark the order paymentStatus: "paid_via_wallet" without
                    ever actually debiting the wallet (no deductWalletBalance
                    call existed on this page), and wallet writes are now
                    server-only regardless. Comes back once this checkout
                    moves behind the `placeOrder` callable (Phase 1). */}
                <div
                  className="w-full p-3 rounded-xl border border-edge-2 bg-surface-1 text-left flex items-center justify-between opacity-50"
                  title="Paying with Sosika Cash at checkout is temporarily unavailable"
                >
                  <div className="flex items-center gap-2.5">
                    <Wallet className="w-4 h-4 text-content-muted" />
                    <div>
                      <p className="text-xs font-bold text-content-tertiary">Sosika Cash Wallet</p>
                      <p className="text-[10px] text-amber-ink/80 font-bold">
                        Unavailable for checkout
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Cash on Delivery */}
                <button
                  onClick={() => setPaymentMethod("cod")}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    paymentMethod === "cod"
                      ? "bg-sosika-emerald/10 border-sosika-emerald/40 text-white"
                      : "bg-surface-2 border-edge-2 text-content-tertiary hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-ink" />
                    <div>
                      <p className="text-xs font-bold">Cash / Pay on Delivery</p>
                      <p className="text-[10px] text-content-tertiary">Pay when your Biryani is delivered</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Lipa Namba Details Display when selected */}
            {paymentMethod === "lipa_namba" && (
              <div className="bg-black/60 border border-sosika-cyan/30 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-content-tertiary uppercase">Sosika Lipa Namba</span>
                  <span className="text-xs font-extrabold text-accent-ink font-mono">{LIPA_NUMBER}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyLipaNumber}
                    className="flex-1 py-1.5 rounded-lg bg-surface-3 hover:bg-surface-3 text-xs font-bold flex items-center justify-center gap-1 text-content"
                  >
                    {copiedLipa ? <Check className="w-3.5 h-3.5 text-emerald-ink" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLipa ? "Copied!" : "Copy Lipa Namba"}
                  </button>
                  <a
                    href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
                      `Habari Sosika! Nimeweka oda ya Biryani (TZS ${(
                        checkoutItem.price +
                        calculatedDeliveryFee +
                        (platformConfig.serviceFee || 1000)
                      ).toLocaleString()}). Simu: ${phoneInput}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 rounded-lg bg-sosika-emerald/20 border border-sosika-emerald/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1 hover:bg-sosika-emerald/30"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Receipt
                  </a>
                </div>
              </div>
            )}

            {/* Final Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-sosika-cyan text-black font-extrabold text-xs uppercase tracking-wider hover:bg-sosika-cyan transition-all disabled:opacity-50 shadow-lg shadow-sosika-cyan/30"
            >
              {isSubmitting
                ? "Securing Your Order..."
                : countdown.isLive
                ? "Confirm Friday Order 🍛"
                : "Confirm Friday Pre-Order 🍛"}
            </button>
          </motion.div>
        </div>
      )}

      {/* TopUp Wallet Modal */}
      <TopUpWalletModal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} />

      <Navbar />
    </div>
  );
}
