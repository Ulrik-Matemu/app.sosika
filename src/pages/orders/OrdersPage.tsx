import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/my-components/navbar";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { usePhoneAuth } from "../../hooks/usePhoneAuth";
import { useCartContext } from "../../context/cartContext";
import {
  Package,
  Clock,
  ChevronRight,
  Phone,
  ShieldCheck,
  Loader2,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  LogOut,
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Bike
} from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  price: string | number;
  quantity: number;
}

interface OrderRecord {
  orderId: string;
  phone: string;
  cart?: OrderItem[];
  vendor_name?: string;
  totalAmount: number;
  status: "pending" | "preparing" | "ready_for_pickup" | "delivered" | "declined" | string;
  timestamp?: any;
  deliveryOption?: string;
  displayLocation?: string;
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const { user, sendOTP, confirmOTP, loading: authLoading, error: authError, signOut } = usePhoneAuth();
  const { addToCart } = useCartContext();

  const [phoneInput, setPhoneInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [localOrders, setLocalOrders] = useState<OrderRecord[]>([]);

  // Load local device orders on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sosika_placed_orders");
      if (raw) {
        setLocalOrders(JSON.parse(raw));
      }
      const savedPhone = localStorage.getItem("guestPhone");
      if (savedPhone && !phoneInput) {
        setPhoneInput(savedPhone);
      }
    } catch (e) {
      console.warn("Failed to parse local orders:", e);
    }
  }, []);

  // Listen to Firestore orders when Firebase Auth user is present
  useEffect(() => {
    if (!user || !user.phoneNumber) {
      setOrders([]);
      return;
    }

    setLoadingOrders(true);
    const formattedPhone = user.phoneNumber;

    // Fetch orders matching user's phone number
    const q = query(
      collection(db, "orders"),
      where("phone", "==", formattedPhone),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: OrderRecord[] = [];
        snapshot.forEach((doc) => {
          list.push({ orderId: doc.id, ...doc.data() } as OrderRecord);
        });
        setOrders(list);
        setLoadingOrders(false);
      },
      (err) => {
        console.error("Firestore orders subscription error:", err);
        setLoadingOrders(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Format local phone input to Tanzanian E.164 format (+255...)
  const formatPhoneE164 = (raw: string) => {
    const digits = raw.replace(/\D/g, "").trim();
    if (digits.startsWith("255")) return `+${digits}`;
    if (digits.startsWith("0")) return `+255${digits.substring(1)}`;
    if (digits.length === 9) return `+255${digits}`;
    return `+${digits}`;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);

    const formatted = formatPhoneE164(phoneInput);
    if (formatted.length < 12) {
      setPhoneError("Please enter a valid phone number (e.g. 0712345678 or +255712345678).");
      return;
    }

    const success = await sendOTP(formatted, "recaptcha-container");
    if (success) {
      setOtpSent(true);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);

    if (otpInput.trim().length < 6) {
      setPhoneError("Please enter the 6-digit code sent to your phone.");
      return;
    }

    const authUser = await confirmOTP(otpInput.trim());
    if (authUser) {
      setOtpSent(false);
      setOtpInput("");
    }
  };

  const handleReorder = (order: OrderRecord) => {
    if (order.cart && order.cart.length > 0) {
      order.cart.forEach((item) => {
        addToCart({
          id: item.id,
          name: item.name,
          price: typeof item.price === "number" ? item.price.toString() : item.price,
          quantity: item.quantity,
          vendor_id: (order as any).vendor_id || "vendor_1",
          isAvailable: true,
          category: "mains",
          description: "",
          imageUrl: ""
        });
      });
      navigate("/cart");
    }
  };

  const formatPrice = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return (isNaN(num) ? 0 : num).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Order Placed",
          color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          icon: Clock
        };
      case "preparing":
        return {
          label: "Preparing",
          color: "bg-[#00bfff]/10 text-[#00bfff] border-[#00bfff]/20",
          icon: ChefHat
        };
      case "ready_for_pickup":
        return {
          label: "Out for Delivery",
          color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
          icon: Bike
        };
      case "delivered":
        return {
          label: "Delivered",
          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          icon: CheckCircle2
        };
      case "declined":
        return {
          label: "Declined",
          color: "bg-red-500/10 text-red-400 border-red-500/20",
          icon: AlertCircle
        };
      default:
        return {
          label: status,
          color: "bg-zinc-800 text-zinc-400 border-zinc-700",
          icon: Clock
        };
    }
  };

  // Combine user orders or local orders
  const displayOrders = user ? orders : localOrders;
  const activeOrders = displayOrders.filter(
    (o) => o.status === "pending" || o.status === "preparing" || o.status === "ready_for_pickup"
  );
  const pastOrders = displayOrders.filter(
    (o) => o.status === "delivered" || o.status === "declined"
  );

  return (
    <>
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-[#00bfff]/20 font-sans antialiased pb-24 relative overflow-hidden">
      {/* Invisible reCAPTCHA container required for Firebase Phone Auth */}
      <div id="recaptcha-container" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/[0.06] px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00bfff]/10 border border-[#00bfff]/20 flex items-center justify-center text-[#00bfff]">
              <Package size={20} />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white">
                My Orders & Live Tracking
              </h1>
              <p className="text-[11px] text-zinc-400">
                {user ? `Phone verified: ${user.phoneNumber}` : "Track live orders & history"}
              </p>
            </div>
          </div>

          {user && (
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-zinc-400 text-xs font-semibold transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6 relative z-10">

        {/* Phone Authentication Card (If not signed in) */}
        {!user && (
          <div className="bg-gradient-to-tr from-white/[0.03] to-white/[0.01] border border-white/[0.08] rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Access Orders Across Devices</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Verify your phone number via Firebase SMS to sync and view your full order history on any phone or browser.
                </p>
              </div>
            </div>

            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-3 pt-1">
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                  <input
                    type="tel"
                    required
                    placeholder="Enter phone number (e.g. 0712 345 678)"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#00bfff]/40 focus:bg-white/[0.05] transition-all"
                  />
                </div>

                {(phoneError || authError) && (
                  <p className="text-[11px] text-red-400 flex items-center gap-1.5">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>{phoneError || authError}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold py-3.5 rounded-xl text-xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#00bfff]/10"
                >
                  {authLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending SMS Code...
                    </>
                  ) : (
                    <>
                      <span>Send Verification SMS</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-3 pt-1 animate-in fade-in duration-200">
                <div className="bg-[#00bfff]/5 border border-[#00bfff]/20 p-3 rounded-xl text-xs text-zinc-300 flex items-center justify-between">
                  <span>SMS Code sent to <strong>{formatPhoneE164(phoneInput)}</strong></span>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-[#00bfff] text-[11px] font-bold hover:underline"
                  >
                    Change
                  </button>
                </div>

                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit SMS code"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl py-3 px-4 text-center font-mono text-base tracking-widest text-white placeholder-zinc-600 outline-none focus:border-[#00bfff]/40 focus:bg-white/[0.05] transition-all"
                />

                {(phoneError || authError) && (
                  <p className="text-[11px] text-red-400 flex items-center gap-1.5">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>{phoneError || authError}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-gradient-to-r from-[#00bfff] to-[#00a8e6] text-black font-extrabold py-3.5 rounded-xl text-xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#00bfff]/10"
                >
                  {authLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Verifying Code...
                    </>
                  ) : (
                    <>
                      <span>Verify & Access History</span>
                      <CheckCircle2 size={14} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Loading Indicator */}
        {loadingOrders && (
          <div className="py-12 text-center space-y-3">
            <RefreshCw size={24} className="animate-spin text-[#00bfff] mx-auto" />
            <p className="text-xs text-zinc-500">Syncing live order updates...</p>
          </div>
        )}

        {/* Active Orders Section */}
        {activeOrders.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00bfff] animate-ping" />
                Active Orders in Progress ({activeOrders.length})
              </h2>
            </div>

            <div className="space-y-3">
              {activeOrders.map((order) => {
                const statusMeta = getStatusBadge(order.status);
                const StatusIcon = statusMeta.icon;

                return (
                  <div
                    key={order.orderId}
                    onClick={() => navigate(`/track/${order.orderId}`)}
                    className="bg-white/[0.03] hover:bg-white/[0.05] border border-[#00bfff]/30 hover:border-[#00bfff]/50 rounded-2xl p-5 transition-all cursor-pointer group space-y-4 shadow-lg shadow-[#00bfff]/5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                          #{order.orderId.slice(-6)}
                        </span>
                        <h3 className="text-base font-extrabold text-white group-hover:text-[#00bfff] transition-colors mt-0.5">
                          {order.vendor_name || "Sosika Kitchen"}
                        </h3>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${statusMeta.color}`}
                      >
                        <StatusIcon size={12} />
                        {statusMeta.label}
                      </span>
                    </div>

                    {/* Cart snippet */}
                    {order.cart && order.cart.length > 0 && (
                      <div className="text-xs text-zinc-400 line-clamp-1 border-t border-white/[0.04] pt-3">
                        {order.cart.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="font-extrabold text-white font-mono">
                        {formatPrice(order.totalAmount)} TZS
                      </span>

                      <span className="text-[#00bfff] font-bold text-xs flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Live Track</span>
                        <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past Orders Section */}
        {pastOrders.length > 0 && (
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Past Orders ({pastOrders.length})
            </h2>

            <div className="space-y-3">
              {pastOrders.map((order) => {
                const statusMeta = getStatusBadge(order.status);
                const StatusIcon = statusMeta.icon;

                return (
                  <div
                    key={order.orderId}
                    className="bg-white/[0.015] border border-white/[0.05] rounded-2xl p-5 space-y-4 hover:border-white/[0.1] transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                          #{order.orderId.slice(-6)}
                        </span>
                        <h3 className="text-sm font-bold text-white">
                          {order.vendor_name || "Sosika Kitchen"}
                        </h3>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.color}`}
                      >
                        <StatusIcon size={12} />
                        {statusMeta.label}
                      </span>
                    </div>

                    {order.cart && order.cart.length > 0 && (
                      <div className="text-xs text-zinc-400 space-y-1">
                        {order.cart.map((i, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="truncate max-w-[200px]">
                              {i.quantity}x {i.name}
                            </span>
                            <span className="font-mono text-zinc-500">
                              {formatPrice((typeof i.price === "number" ? i.price : parseFloat(i.price as string)) * i.quantity)} TZS
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Total Paid</span>
                        <span className="font-extrabold text-white font-mono">
                          {formatPrice(order.totalAmount)} TZS
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/track/${order.orderId}`)}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 font-semibold text-[11px] transition-all cursor-pointer"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleReorder(order)}
                          className="px-3 py-1.5 rounded-xl bg-[#00bfff]/10 hover:bg-[#00bfff]/20 text-[#00bfff] font-bold text-[11px] transition-all cursor-pointer"
                        >
                          Reorder
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loadingOrders && displayOrders.length === 0 && (
          <div className="bg-white/[0.015] border border-white/[0.05] rounded-3xl p-8 text-center space-y-4 my-6">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-zinc-500 flex items-center justify-center mx-auto">
              <ShoppingBag size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Orders Discovered Yet</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                When you order food from Sosika vendors, your live delivery progress and order receipts will show up here.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/mood/results"
                className="inline-flex items-center gap-2 bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold px-6 py-3 rounded-xl text-xs transition-all active:scale-[0.99] shadow-lg shadow-[#00bfff]/10"
              >
                <span>Browse Menu Items</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

      </main>
    </div>
    <Navbar />
    </>

  );
}
