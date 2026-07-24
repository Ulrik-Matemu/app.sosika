import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import {
  ArrowLeft,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  Bike,
  ShoppingBag,
  Copy,
  Check,
  MessageSquare,
  Loader2
} from "lucide-react";


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
  status: "pending" | "preparing" | "ready_for_pickup" | "delivered" | "declined";
  totalAmount: number;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  displayLocation?: string;
  vendor_name?: string;
  cart: OrderItem[];
  timestamp?: any;
  deliveryOption?: string;
  paymentMethod?: string;
  walletDiscount?: number;
  cashPayable?: number;
}

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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/orders");
    }
  };

  const getWhatsAppSupportUrl = () => {
    const text = `Habari Sosika Support! Naomba msaada kuhusu oda yangu #${order?.orderId.slice(-6)} (ID: ${order?.orderId}).`;
    return `https://wa.me/255760903468?text=${encodeURIComponent(text)}`;
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

  const formatPrice = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return (isNaN(num) ? 0 : num).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-8 h-8 text-[#00bfff] animate-spin" />
        <p className="text-xs font-mono text-zinc-400">Syncing live kitchen order stream...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-white p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white/[0.02] border border-white/[0.08] rounded-3xl p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black">Order Track Notice</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {error || "Could not locate order."}
            </p>
          </div>
          <button
            onClick={() => navigate("/orders")}
            className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold py-3.5 rounded-xl text-xs transition-all cursor-pointer"
          >
            View All My Orders
          </button>
        </div>
      </div>
    );
  }

  const currentStepIdx = getStepIndex(order.status);
  const isDeclined = order.status === "declined";

  const STEPS = [
    { title: "Received", icon: Clock, desc: "Order sent to vendor" },
    { title: "Cooking", icon: ChefHat, desc: "Preparing your food" },
    { title: "Dispatched", icon: Bike, desc: "On the way to you" },
    { title: "Delivered", icon: CheckCircle2, desc: "Order completed" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-sans antialiased pb-24 relative overflow-hidden">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/[0.06] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
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
              <p className="text-xs text-zinc-400 mt-1">
                {isDeclined
                  ? "The vendor was unable to accept this order."
                  : STEPS[currentStepIdx]?.desc || "Real-time updates from vendor"}
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] flex items-center justify-center shrink-0">
              <Clock size={24} />
            </div>
          </div>

          {/* Stepper Timeline */}
          {!isDeclined && (
            <div className="pt-4 border-t border-white/[0.06] space-y-4">
              <div className="grid grid-cols-4 gap-2 relative">
                {STEPS.map((step, idx) => {
                  const IconComp = step.icon;
                  const isPassed = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <div key={idx} className="flex flex-col items-center text-center space-y-2">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                          isCurrent
                            ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20 scale-105 ring-4 ring-[#00bfff]/20"
                            : isPassed
                            ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                            : "bg-white/[0.03] border border-white/[0.06] text-zinc-600"
                        }`}
                      >
                        <IconComp size={18} />
                      </div>
                      <span
                        className={`text-[11px] font-bold ${
                          isCurrent
                            ? "text-[#00bfff]"
                            : isPassed
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
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <MapPin size={14} className="text-[#00bfff]" />
              Delivery Destination
            </h3>
            <a
              href={getWhatsAppSupportUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-extrabold border border-emerald-500/20 transition-all cursor-pointer"
            >
              <MessageSquare size={13} />
              <span>WhatsApp Support</span>
            </a>
          </div>
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
                : "Standard Delivery"}
            </span>
          </div>

          <div className="space-y-2.5">
            {order.cart?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1">
                <span className="text-zinc-200 font-medium">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-mono text-zinc-400">
                  {formatPrice(
                    (typeof item.price === "number" ? item.price : parseFloat(item.price as string)) * item.quantity
                  )}{" "}
                  TZS
                </span>
              </div>
            ))}
          </div>

          {/* Payment Summary */}
          <div className="pt-3 border-t border-white/[0.05] space-y-1.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span className="font-mono">{formatPrice(order.subtotal || 0)} TZS</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Delivery Fee</span>
              <span className="font-mono">{formatPrice(order.deliveryFee || 0)} TZS</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Service Fee</span>
              <span className="font-mono">{formatPrice(order.serviceFee || 1000)} TZS</span>
            </div>

            {order.walletDiscount && order.walletDiscount > 0 && (
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Sosika Cash Discount</span>
                <span className="font-mono">-{formatPrice(order.walletDiscount)} TZS</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/[0.05]">
              <span>
                {order.paymentMethod === "sosika_cash"
                  ? "Total Paid (Sosika Cash)"
                  : order.paymentMethod === "hybrid_wallet_cash"
                  ? "Cash Payable to Driver"
                  : "Total Amount (Cash)"}
              </span>
              <span className="text-[#00bfff] font-mono">
                {formatPrice(order.cashPayable !== undefined ? order.cashPayable : order.totalAmount)} TZS
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
