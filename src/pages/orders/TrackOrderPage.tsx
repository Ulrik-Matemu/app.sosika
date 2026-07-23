import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  Bike,
  ShoppingBag,
  Copy,
  Check,
  RefreshCw,
  MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";

interface OrderItem {
  id: string;
  name: string;
  price: string | number;
  quantity: number;
  vendor_id?: string;
  imageUrl?: string;
}

interface OrderData {
  orderId: string;
  phone: string;
  cart: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  totalAmount: number;
  displayLocation: string;
  locationCoords?: string;
  status: "pending" | "preparing" | "ready_for_pickup" | "delivered" | "declined" | string;
  deliveryOption: string;
  vendor_name?: string;
  timestamp?: any;
  acceptedAt?: any;
  pickedUpAt?: any;
  deliveredAt?: any;
  declinedAt?: any;
}

const STEPS = [
  {
    key: "pending",
    title: "Order Placed",
    subtitle: "Sent to kitchen, waiting for confirmation",
    icon: Clock,
  },
  {
    key: "preparing",
    title: "Preparing Food",
    subtitle: "Chef is actively cooking your meal",
    icon: ChefHat,
  },
  {
    key: "ready_for_pickup",
    title: "Out for Delivery",
    subtitle: "Food is ready & driver is on the way",
    icon: Bike,
  },
  {
    key: "delivered",
    title: "Delivered",
    subtitle: "Order complete. Enjoy your food!",
    icon: CheckCircle2,
  },
];

export default function TrackOrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError("No Order ID provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const orderRef = doc(db, "orders", orderId);

    const unsubscribe = onSnapshot(
      orderRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setOrder({ orderId: docSnap.id, ...docSnap.data() } as OrderData);
          setError(null);
        } else {
          setError("Order not found. Please check your order reference number.");
          setOrder(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Firestore onSnapshot error:", err);
        setError("Unable to connect to live order status. Please check your connection.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  const copyOrderId = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const getStepIndex = (status?: string) => {
    switch (status) {
      case "pending":
        return 0;
      case "preparing":
        return 1;
      case "ready_for_pickup":
        return 2;
      case "delivered":
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(order?.status);
  const isDeclined = order?.status === "declined";

  const formatPrice = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return (isNaN(num) ? 0 : num).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col items-center justify-center p-6 selection:bg-[#00bfff]/20 font-sans">
        <div className="w-16 h-16 rounded-2xl bg-[#00bfff]/10 border border-[#00bfff]/20 flex items-center justify-center text-[#00bfff] mb-4 animate-pulse">
          <RefreshCw size={28} className="animate-spin" />
        </div>
        <p className="text-sm font-bold text-zinc-400 tracking-wider animate-pulse">
          Connecting to Live Kitchen Stream...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-white p-4 flex flex-col items-center justify-center font-sans antialiased">
        <div className="max-w-md w-full bg-white/[0.02] border border-white/[0.08] rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold tracking-tight">Order Not Discovered</h1>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
              {error || "We couldn't find an order matching that reference ID."}
            </p>
          </div>
          <div className="pt-2 space-y-3">
            <button
              onClick={() => navigate("/orders")}
              className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold py-3.5 rounded-xl text-xs transition-all active:scale-[0.99] shadow-lg shadow-[#00bfff]/10"
            >
              View My Orders
            </button>
            <Link
              to="/mood/results"
              className="block w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 font-semibold py-3 rounded-xl text-xs transition-all"
            >
              Explore Restaurants
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-[#00bfff]/20 font-sans antialiased pb-24 relative overflow-hidden">
      {/* Background Lighting Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-96 h-96 rounded-full bg-[#00bfff]/5 blur-[120px]" />
        <div className="absolute top-[10%] right-[10%] w-80 h-80 rounded-full bg-indigo-500/[0.04] blur-[120px]" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/[0.06] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-300 transition-all active:scale-95 cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#00bfff] block">
              Live Order Tracker
            </span>
            <h1 className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-xs">
              {order.vendor_name || "Sosika Kitchen"}
            </h1>
          </div>
          <button
            onClick={copyOrderId}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-[11px] font-mono text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Copy Order ID"
          >
            {copiedId ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>#{order.orderId.slice(-6)}</span>
              </>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6 relative z-10">

        {/* Live Status Hero Card */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#00bfff]/10 text-[#00bfff] border border-[#00bfff]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00bfff] animate-ping" />
                Live Status
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-3">
                {isDeclined
                  ? "Order Declined"
                  : currentStepIdx === 0
                  ? "Order Received"
                  : currentStepIdx === 1
                  ? "Cooking in Kitchen 🍳"
                  : currentStepIdx === 2
                  ? "Dispatched / Out for Delivery 🛵"
                  : "Order Delivered 🎉"}
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {isDeclined
                  ? "The vendor was unable to fulfill your order request."
                  : STEPS[currentStepIdx]?.subtitle}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-[#00bfff]/20 to-indigo-500/10 border border-[#00bfff]/30 text-[#00bfff] shrink-0">
              {isDeclined ? (
                <AlertCircle size={28} className="text-red-400" />
              ) : currentStepIdx === 3 ? (
                <CheckCircle2 size={28} className="text-emerald-400" />
              ) : (
                <ChefHat size={28} className="animate-bounce" />
              )}
            </div>
          </div>

          {/* Declined Alert */}
          {isDeclined && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 space-y-1">
              <span className="font-bold block">Order Could Not Be Fulfilled</span>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                This order was declined by the restaurant. If you have questions or made a payment, please contact Sosika Customer Support.
              </p>
            </div>
          )}

          {/* Stepper Progress Bar */}
          {!isDeclined && (
            <div className="pt-2 space-y-6">
              {/* Line Bar Indicator */}
              <div className="relative w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#00bfff] via-[#00a8e6] to-emerald-400"
                  initial={{ width: "0%" }}
                  animate={{
                    width: `${((currentStepIdx + 1) / STEPS.length) * 100}%`
                  }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>

              {/* Step Items List */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {STEPS.map((step, idx) => {
                  const isDone = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;
                  const Icon = step.icon;

                  return (
                    <div key={step.key} className="space-y-1.5 flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          isCurrent
                            ? "bg-[#00bfff] text-black ring-4 ring-[#00bfff]/20 font-bold scale-110 shadow-lg shadow-[#00bfff]/20"
                            : isDone
                            ? "bg-[#00bfff]/20 text-[#00bfff] border border-[#00bfff]/40"
                            : "bg-white/[0.03] text-zinc-600 border border-white/[0.05]"
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <span
                        className={`text-[10px] font-extrabold tracking-tight leading-tight block ${
                          isCurrent
                            ? "text-[#00bfff]"
                            : isDone
                            ? "text-zinc-200"
                            : "text-zinc-600"
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Delivery Location & Contact Card */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <MapPin size={14} className="text-[#00bfff]" />
            Delivery Destination
          </h3>
          <div className="space-y-1 text-xs">
            <p className="text-white font-semibold leading-normal">
              {order.displayLocation || "Address recorded"}
            </p>
            <p className="text-zinc-500 font-mono text-[11px]">
              Contact Phone: {order.phone}
            </p>
          </div>
        </div>

        {/* Order Items Breakdown */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <ShoppingBag size={14} className="text-[#00bfff]" />
              Items Ordered ({order.cart?.reduce((acc, i) => acc + i.quantity, 0) || 0})
            </h3>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {order.deliveryOption === "free"
                ? "Free Pass Delivery"
                : order.deliveryOption === "pickup"
                ? "Self Pickup"
                : "Standard Delivery"}
            </span>
          </div>

          <div className="space-y-3">
            {order.cart?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-[#00bfff]/10 text-[#00bfff] font-extrabold text-[11px] flex items-center justify-center shrink-0">
                    {item.quantity}x
                  </span>
                  <span className="text-zinc-200 font-semibold truncate">
                    {item.name}
                  </span>
                </div>
                <span className="font-mono text-zinc-300 font-bold shrink-0 ml-4">
                  {formatPrice((typeof item.price === "number" ? item.price : parseFloat(item.price as string)) * item.quantity)} TZS
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Calculations */}
          <div className="pt-4 border-t border-white/[0.05] space-y-2 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span className="font-mono">{formatPrice(order.subtotal)} TZS</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Delivery Fee</span>
              <span className="font-mono">
                {order.deliveryFee === 0 ? "FREE" : `${formatPrice(order.deliveryFee)} TZS`}
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Service Fee</span>
              <span className="font-mono">{formatPrice(order.serviceFee || 1000)} TZS</span>
            </div>
            <div className="flex justify-between text-white font-extrabold text-sm pt-2 border-t border-white/[0.05]">
              <span>Total Amount</span>
              <span className="font-mono text-[#00bfff]">{formatPrice(order.totalAmount)} TZS</span>
            </div>
          </div>
        </div>

        {/* Support & Action Shortcuts */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <a
            href={`https://wa.me/255778903468?text=${encodeURIComponent(
              `Hello Sosika Support, I need help with my Order #${order.orderId.slice(-6)}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold py-3.5 rounded-xl text-xs transition-all active:scale-[0.99]"
          >
            <MessageSquare size={16} />
            <span>WhatsApp Support</span>
          </a>

          <a
            href="tel:+255778903468"
            className="flex items-center justify-center gap-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 font-bold py-3.5 rounded-xl text-xs transition-all active:scale-[0.99]"
          >
            <Phone size={16} />
            <span>Direct Call</span>
          </a>
        </div>

      </main>
    </div>
  );
}
