import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import Navbar from "../../components/my-components/navbar";
import UploadFoodPhotoModal from "../../components/my-components/UploadFoodPhotoModal";
import {
  ArrowLeft,
  MapPin,
  AlertCircle,
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
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

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
      <div className="min-h-screen bg-ground flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-8 h-8 text-accent-ink animate-spin" />
        <p className="text-xs font-mono text-content-muted">Syncing live kitchen order stream…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-ground text-content p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-surface-1 border border-edge-2 rounded-[18px] p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-[18px] bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold">Order track notice</h2>
            <p className="text-xs text-content-tertiary leading-relaxed">
              {error || "Could not locate order."}
            </p>
          </div>
          <button
            onClick={() => navigate("/orders")}
            className="w-full bg-sosika-cyan text-on-accent font-bold py-[17px] rounded-2xl text-sm active:opacity-90 transition-opacity"
          >
            View all my orders
          </button>
        </div>
      </div>
    );
  }

  const currentStepIdx = getStepIndex(order.status);
  const isDeclined = order.status === "declined";
  const firstItem = order.cart?.[0];

  const STEPS = [
    { title: "Confirmed", desc: "Order sent to vendor" },
    { title: "Preparing", desc: "The kitchen is cooking" },
    { title: "Rider on the way", desc: "Out for delivery" },
    { title: "Delivered", desc: "Order completed" },
  ];

  return (
    <div className="min-h-screen bg-ground text-content pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-chrome backdrop-blur-xl border-b border-edge-1">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-3 border border-edge-2 text-content-secondary"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-[13px] font-semibold text-content-muted">Order</span>
          <button
            onClick={copyOrderId}
            className="flex items-center gap-1.5 font-mono text-[13px] text-content-secondary"
            title="Copy order ID"
          >
            {copiedId ? (
              <span className="text-emerald-ink">Copied</span>
            ) : (
              <span>#{order.orderId.slice(-6)} ⧉</span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-6 flex flex-col gap-6">
        {/* Hero */}
        <div>
          <h2 className="text-[28px] font-bold tracking-[-0.025em] leading-[1.15] text-content">
            {isDeclined
              ? "Order declined."
              : `${order.vendor_name || "The kitchen"} is ${STEPS[currentStepIdx]?.title.toLowerCase() === "confirmed" ? "getting your order" : STEPS[currentStepIdx]?.title.toLowerCase()}.`}
          </h2>
          <p className="text-[15px] text-content-muted mt-2">
            {isDeclined
              ? "The vendor was unable to accept this order."
              : STEPS[currentStepIdx]?.desc || "Real-time updates from the vendor"}
          </p>
        </div>

        {/* Vertical step timeline */}
        {!isDeclined && (
          <div className="border border-edge-2 bg-surface-1 rounded-[22px] px-5 py-[22px]">
            {STEPS.map((step, idx) => {
              const isPassed = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              const isDone = idx <= currentStepIdx;
              const isLast = idx === STEPS.length - 1;

              return (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center flex-none">
                    <span
                      className={
                        isDone
                          ? `w-[11px] h-[11px] rounded-full bg-sosika-cyan flex-none ${isCurrent ? "shadow-[0_0_0_5px_rgba(0,191,255,0.14)]" : ""}`
                          : "w-[11px] h-[11px] rounded-full border-2 border-edge-3 flex-none"
                      }
                    />
                    {!isLast && (
                      <span className={`w-0.5 flex-1 ${isPassed || isCurrent ? "bg-sosika-cyan/35" : "bg-surface-3"}`} />
                    )}
                  </div>
                  <div className={isLast ? "" : "pb-[26px]"}>
                    <div className={`text-sm font-bold ${isDone ? "text-content" : "font-semibold text-content-muted"}`}>
                      {step.title}
                    </div>
                    {isCurrent && (
                      <div className="font-mono text-[11px] text-accent-ink mt-1">Now</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Call kitchen / WhatsApp */}
        <div className="flex gap-2.5">
          <a
            href={`tel:${order.phone}`}
            className="flex-1 text-center border border-edge-3 rounded-[15px] py-3.5 text-[13px] font-semibold text-content-secondary"
          >
            Call kitchen
          </a>
          <a
            href={getWhatsAppSupportUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center border border-edge-3 rounded-[15px] py-3.5 text-[13px] font-semibold text-content-secondary"
          >
            WhatsApp
          </a>
        </div>

        {/* Photo reward nudge */}
        {firstItem && (
          <button
            onClick={() => setPhotoModalOpen(true)}
            className="w-full text-left rounded-[18px] border border-sosika-amber/25 bg-sosika-amber/[0.055] p-4 flex items-center justify-between gap-3"
          >
            <div>
              <div className="text-[13px] font-bold text-amber-ink">Snap your food, earn 500</div>
              <div className="text-[11px] text-content-tertiary mt-[3px]">Credited to Sosika Cash after review</div>
            </div>
            <span className="text-lg flex-none">📸</span>
          </button>
        )}

        {/* Delivery address (not in the mockup, kept for real order data) */}
        <div className="flex items-start gap-2.5 -mt-2">
          <MapPin size={14} className="text-accent-ink mt-0.5 flex-none" />
          <div className="min-w-0">
            <p className="text-sm text-content font-medium leading-snug">
              {order.displayLocation || "Address recorded"}
            </p>
            <p className="font-mono text-[11px] text-content-muted mt-0.5">{order.phone}</p>
          </div>
        </div>

        {/* Order items + payment breakdown */}
        <div className="bg-surface-1 border border-edge-2 rounded-[18px] p-4">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-faint mb-3">
            Items ordered ({order.cart?.reduce((acc, i) => acc + i.quantity, 0) || 0})
          </div>

          <div className="flex flex-col gap-2">
            {order.cart?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-content-secondary">{item.quantity}x {item.name}</span>
                <span className="font-mono text-content-tertiary">
                  {formatPrice(
                    (typeof item.price === "number" ? item.price : parseFloat(item.price as string)) * item.quantity
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 text-xs pt-3 mt-3 border-t border-edge-1">
            <div className="flex justify-between text-content-muted">
              <span>Subtotal</span>
              <span className="font-mono text-content-secondary">{formatPrice(order.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between text-content-muted">
              <span>Delivery</span>
              <span className="font-mono text-content-secondary">{formatPrice(order.deliveryFee || 0)}</span>
            </div>
            <div className="flex justify-between text-content-muted">
              <span>Service</span>
              <span className="font-mono text-content-secondary">{formatPrice(order.serviceFee || 1000)}</span>
            </div>
            {order.walletDiscount && order.walletDiscount > 0 && (
              <div className="flex justify-between text-emerald-ink font-semibold">
                <span>Sosika Cash discount</span>
                <span className="font-mono">-{formatPrice(order.walletDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-content pt-2 border-t border-edge-1">
              <span>
                {order.paymentMethod === "sosika_cash"
                  ? "Paid with Sosika Cash"
                  : "Total · cash"}
              </span>
              <span className="font-mono text-accent-ink">
                {formatPrice(order.cashPayable !== undefined ? order.cashPayable : order.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </main>

      {firstItem && (
        <UploadFoodPhotoModal
          isOpen={photoModalOpen}
          onClose={() => setPhotoModalOpen(false)}
          orderId={order.orderId}
          phone={order.phone}
          vendorId={firstItem.vendor_id || ""}
          vendorName={order.vendor_name || "the kitchen"}
          menuItemId={firstItem.id}
          menuItemName={firstItem.name}
        />
      )}

      <Navbar />
    </div>
  );
}
