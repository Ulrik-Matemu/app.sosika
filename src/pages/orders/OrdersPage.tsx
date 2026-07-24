import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import Navbar from "../../components/my-components/navbar";
import { useOrders, OrderRecord, getPhoneVariations } from "../../context/OrdersContext";
import { useWallet } from "../../context/WalletContext";
import { usePhoneAuth } from "../../hooks/usePhoneAuth";
import { useCartContext } from "../../context/cartContext";
import UploadFoodPhotoModal from "../../components/my-components/UploadFoodPhotoModal";
import TopUpWalletModal from "../../components/my-components/TopUpWalletModal";
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
  Bike,
  Receipt,
  Sparkles,
  Camera,
  Wallet
} from "lucide-react";
import { motion } from "framer-motion";

export default function OrdersPage() {
  const navigate = useNavigate();
  const { activeOrders, pastOrders, loading, userPhone, refreshOrders, setUserPhone } = useOrders();
  const { balance } = useWallet();
  const { user, sendOTP, confirmOTP, loading: authLoading, error: authError, signOut } = usePhoneAuth();
  const { addToCart } = useCartContext();

  const [activeTab, setActiveTab] = useState<"active" | "history" | "account">("active");

  const [phoneInput, setPhoneInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Top Up Modal State
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);

  // Photo Upload Modal State
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [submittedKeys, setSubmittedKeys] = useState<Set<string>>(new Set());
  const [targetPhotoItem, setTargetPhotoItem] = useState<{
    orderId: string;
    vendorId: string;
    vendorName: string;
    menuItemId: string;
    menuItemName: string;
  } | null>(null);

  useEffect(() => {
    if (!userPhone) return;
    const fetchSubmissions = async () => {
      try {
        const variations = getPhoneVariations(userPhone);
        if (variations.length === 0) return;

        const q = query(
          collection(db, "food_photo_submissions"),
          where("phone", "in", variations.slice(0, 10))
        );
        const snap = await getDocs(q);
        const keys = new Set<string>();
        snap.forEach((d) => {
          const data = d.data();
          if (data.orderId && data.menuItemId) {
            keys.add(`${data.orderId}_${data.menuItemId}`);
          }
        });
        setSubmittedKeys(keys);
      } catch (err) {
        console.warn("[OrdersPage] Failed to fetch photo submissions:", err);
      }
    };
    fetchSubmissions();
  }, [userPhone, photoModalOpen]);

  const openPhotoModal = (order: OrderRecord, item: any) => {
    setTargetPhotoItem({
      orderId: order.orderId,
      vendorId: (item.vendor_id || (order as any).vendor_id || "vendor_1"),
      vendorName: order.vendor_name || "Vendor",
      menuItemId: item.id || "item_1",
      menuItemName: item.name,
    });
    setPhotoModalOpen(true);
  };

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
      setPhoneError("Please enter a valid phone number (e.g. 0712 345 678 or +255712345678).");
      return;
    }

    const success = await sendOTP(formatted, "recaptcha-container");
    if (success) {
      setUserPhone(formatted);
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
    if (authUser && authUser.phoneNumber) {
      setUserPhone(authUser.phoneNumber);
      setOtpSent(false);
      setOtpInput("");
      refreshOrders();
      setActiveTab("active");
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
          label: "Order Received",
          color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          icon: Clock
        };
      case "preparing":
        return {
          label: "Cooking in Kitchen",
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

  return (
    <>
      <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-[#00bfff]/20 font-sans antialiased pb-28 relative overflow-hidden">
        {/* Invisible reCAPTCHA container required for Firebase Phone Auth */}
        <div id="recaptcha-container" />

        {/* Top Sticky Header */}
        <header className="sticky top-0 z-40 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/[0.06] px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00bfff]/20 to-indigo-500/10 border border-[#00bfff]/30 flex items-center justify-center text-[#00bfff] shadow-lg shadow-[#00bfff]/5">
                <Package size={20} />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                  <span>My Orders</span>
                  {userPhone && (
                    <span className="text-[10px] font-mono text-[#00bfff] bg-[#00bfff]/10 px-2 py-0.5 rounded-md border border-[#00bfff]/20">
                      {userPhone}
                    </span>
                  )}
                </h1>
                <p className="text-[11px] text-zinc-400">
                  Real-time live kitchen tracking & receipts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTopUpModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00bfff]/15 to-emerald-500/10 border border-[#00bfff]/30 text-white text-xs font-black shadow-lg shadow-[#00bfff]/5 hover:border-[#00bfff]/60 transition-all cursor-pointer group"
                title="Click to Top Up Sosika Cash"
              >
                <Wallet size={15} className="text-[#00bfff]" />
                <span className="font-mono text-[#00bfff]">{formatPrice(balance)} TZS</span>
                <span className="ml-1 text-[9px] bg-[#00bfff] text-black font-extrabold px-1.5 py-0.5 rounded-md group-hover:scale-105 transition-transform">
                  + Top Up
                </span>
              </button>

              <button
                onClick={refreshOrders}
                disabled={loading}
                className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-300 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Sync Live Orders"
              >
                <RefreshCw size={16} className={loading ? "animate-spin text-[#00bfff]" : ""} />
              </button>

              {user && (
                <button
                  onClick={signOut}
                  className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-zinc-400 transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Segmented Tab Bar */}
          <div className="max-w-2xl mx-auto pt-4">
            <div className="grid grid-cols-3 bg-white/[0.03] p-1 rounded-2xl border border-white/[0.06]">
              <button
                onClick={() => setActiveTab("active")}
                className={`relative py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "active" ? "text-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                {activeTab === "active" && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 bg-[#00bfff] rounded-xl shadow-lg shadow-[#00bfff]/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>Active</span>
                  {activeOrders.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                      activeTab === "active" ? "bg-black text-[#00bfff]" : "bg-[#00bfff] text-black"
                    }`}>
                      {activeOrders.length}
                    </span>
                  )}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`relative py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "history" ? "text-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                {activeTab === "history" && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 bg-[#00bfff] rounded-xl shadow-lg shadow-[#00bfff]/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Receipt size={14} />
                  <span>History</span>
                  {pastOrders.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono ${
                      activeTab === "history" ? "bg-black text-white" : "bg-white/[0.1] text-zinc-300"
                    }`}>
                      {pastOrders.length}
                    </span>
                  )}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("account")}
                className={`relative py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "account" ? "text-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                {activeTab === "account" && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 bg-[#00bfff] rounded-xl shadow-lg shadow-[#00bfff]/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  <span>{user ? "Verified" : "Phone Sync"}</span>
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6 relative z-10">

          {/* Skeleton Loader during initial load */}
          {loading && (
            <div className="space-y-4 py-4 animate-pulse">
              <div className="h-28 bg-white/[0.03] border border-white/[0.06] rounded-2xl w-full" />
              <div className="h-28 bg-white/[0.03] border border-white/[0.06] rounded-2xl w-full" />
            </div>
          )}

          {/* TAB 1: ACTIVE ORDERS */}
          {activeTab === "active" && !loading && (
            <div className="space-y-4">
              {activeOrders.length > 0 ? (
                <div className="space-y-4">
                  {activeOrders.map((order) => {
                    const statusMeta = getStatusBadge(order.status);
                    const StatusIcon = statusMeta.icon;

                    return (
                      <motion.div
                        key={order.orderId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate(`/track/${order.orderId}`)}
                        className="bg-white/[0.03] hover:bg-white/[0.05] border border-[#00bfff]/30 hover:border-[#00bfff]/60 rounded-3xl p-6 transition-all cursor-pointer group space-y-4 shadow-xl shadow-[#00bfff]/5 relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                              Order #{order.orderId.slice(-6)}
                            </span>
                            <h3 className="text-lg font-black text-white group-hover:text-[#00bfff] transition-colors mt-0.5">
                              {order.vendor_name || "Sosika Kitchen"}
                            </h3>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-sm ${statusMeta.color}`}
                          >
                            <StatusIcon size={14} className="animate-pulse" />
                            {statusMeta.label}
                          </span>
                        </div>

                        {/* Cart Summary */}
                        {order.cart && order.cart.length > 0 && (
                          <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-2xl text-xs text-zinc-300 space-y-1">
                            {order.cart.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-zinc-200">
                                  {item.quantity}x {item.name}
                                </span>
                                <span className="font-mono text-zinc-400 text-[11px]">
                                  {formatPrice((typeof item.price === "number" ? item.price : parseFloat(item.price as string)) * item.quantity)} TZS
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Total Amount</span>
                            <span className="font-black text-white font-mono text-sm">
                              {formatPrice(order.totalAmount)} TZS
                            </span>
                          </div>

                          <button className="bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-[#00bfff]/20 transition-all group-hover:scale-105">
                            <span>Track Live</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white/[0.015] border border-white/[0.05] rounded-3xl p-8 text-center space-y-4 my-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] flex items-center justify-center mx-auto">
                    <Sparkles size={28} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">No Active Orders</h3>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                      You don't have any food being prepared in the kitchen right now.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      to="/mood/results"
                      className="inline-flex items-center gap-2 bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold px-6 py-3.5 rounded-xl text-xs transition-all active:scale-[0.99] shadow-lg shadow-[#00bfff]/10"
                    >
                      <span>Explore Menus & Order</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ORDER HISTORY */}
          {activeTab === "history" && !loading && (
            <div className="space-y-4">
              {pastOrders.length > 0 ? (
                <div className="space-y-3">
                  {pastOrders.map((order) => {
                    const statusMeta = getStatusBadge(order.status);
                    const StatusIcon = statusMeta.icon;

                    return (
                      <motion.div
                        key={order.orderId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4 hover:border-white/[0.12] transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                              #{order.orderId.slice(-6)}
                            </span>
                            <h3 className="text-sm font-bold text-white mt-0.5">
                              {order.vendor_name || "Sosika Kitchen"}
                            </h3>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusMeta.color}`}
                          >
                            <StatusIcon size={12} />
                            {statusMeta.label}
                          </span>
                        </div>

                        {order.cart && order.cart.length > 0 && (
                          <div className="text-xs text-zinc-400 space-y-2 bg-white/[0.015] p-3 rounded-xl border border-white/[0.04]">
                            {order.cart.map((i, idx) => {
                              const itemKey = `${order.orderId}_${i.id || "item_1"}`;
                              const isSubmitted = submittedKeys.has(itemKey);

                              return (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="truncate max-w-[180px] text-zinc-200 font-medium">
                                      {i.quantity}x {i.name}
                                    </span>
                                    {isSubmitted ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/20 shrink-0">
                                        <CheckCircle2 size={11} />
                                        <span>Submitted</span>
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => openPhotoModal(order, i)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#00bfff]/10 hover:bg-[#00bfff]/20 text-[#00bfff] text-[10px] font-extrabold border border-[#00bfff]/20 transition-all cursor-pointer shrink-0"
                                        title="Upload photo of this meal to earn 1,000 TZS Sosika Cash"
                                      >
                                        <Camera size={11} />
                                        <span>+1,000 TZS</span>
                                      </button>
                                    )}
                                  </div>
                                  <span className="font-mono text-zinc-400 text-[11px] shrink-0 ml-2">
                                    {formatPrice((typeof i.price === "number" ? i.price : parseFloat(i.price as string)) * i.quantity)} TZS
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Total Price</span>
                            <span className="font-extrabold text-white font-mono">
                              {formatPrice(order.totalAmount)} TZS
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/track/${order.orderId}`)}
                              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 font-semibold text-[11px] transition-all cursor-pointer"
                            >
                              Receipt
                            </button>
                            <button
                              onClick={() => handleReorder(order)}
                              className="px-3.5 py-2 rounded-xl bg-[#00bfff]/10 hover:bg-[#00bfff]/20 text-[#00bfff] font-extrabold text-[11px] transition-all cursor-pointer border border-[#00bfff]/20"
                            >
                              Reorder
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white/[0.015] border border-white/[0.05] rounded-3xl p-8 text-center space-y-4 my-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-zinc-500 flex items-center justify-center mx-auto">
                    <ShoppingBag size={28} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">No Order History Discovered</h3>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                      Completed and past orders will be archived here for easy re-ordering and receipts.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PHONE SYNC & AUTH */}
          {activeTab === "account" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-tr from-white/[0.03] to-white/[0.01] border border-white/[0.08] rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-2xl bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] shrink-0">
                    <ShieldCheck size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Firebase Phone Sync</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {user
                        ? `Your phone ${user.phoneNumber} is authenticated. All orders linked to this number sync automatically.`
                        : "Verify your phone number via Firebase SMS to sync orders across all your devices."}
                    </p>
                  </div>
                </div>

                {!user && (
                  <>
                    {!otpSent ? (
                      <form onSubmit={handleSendOTP} className="space-y-3 pt-2">
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                          <input
                            type="tel"
                            required
                            placeholder="Enter phone (e.g. 0712 345 678)"
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
                      <form onSubmit={handleVerifyOTP} className="space-y-3 pt-2 animate-in fade-in duration-200">
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
                  </>
                )}

                {user && (
                  <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
                    <span className="text-xs text-zinc-400">Authenticated Session</span>
                    <button
                      onClick={signOut}
                      className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all cursor-pointer"
                    >
                      Disconnect Phone
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {targetPhotoItem && (
        <UploadFoodPhotoModal
          isOpen={photoModalOpen}
          onClose={() => setPhotoModalOpen(false)}
          orderId={targetPhotoItem.orderId}
          phone={userPhone || ""}
          vendorId={targetPhotoItem.vendorId}
          vendorName={targetPhotoItem.vendorName}
          menuItemId={targetPhotoItem.menuItemId}
          menuItemName={targetPhotoItem.menuItemName}
        />
      )}

      <TopUpWalletModal
        isOpen={topUpModalOpen}
        onClose={() => setTopUpModalOpen(false)}
      />

      <Navbar />
    </>
  );
}
