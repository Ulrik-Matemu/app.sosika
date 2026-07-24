import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import {
  Package,
  Clock,
  CheckCircle2,
  ChefHat,
  Bike,
  Search,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Loader2,
  Calendar,
  Activity,
  XCircle,
  TrendingUp
} from "lucide-react";

type TimeframeOption = "7d" | "14d" | "30d" | "90d" | "180d" | "365d" | "all" | "custom";

export default function LiveOrdersConsole() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Timeframe Filter State
  const [timeframe, setTimeframe] = useState<TimeframeOption>("30d");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "orders"),
      (snap) => {
        const list: any[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp || 0).getTime();
          const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        });
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error("Orders onSnapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleAdminStatusOverride = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus,
        adminOverrideAt: new Date(),
      });
    } catch (err) {
      console.error("Admin status override failed:", err);
      alert("Failed to override order status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Compute time boundary timestamp window
  const getTimeWindow = (): { startMs: number; endMs: number } => {
    const now = Date.now();
    let startMs = 0;
    let endMs = now;

    if (timeframe === "custom") {
      startMs = customStartDate ? new Date(`${customStartDate}T00:00:00`).getTime() : 0;
      endMs = customEndDate ? new Date(`${customEndDate}T23:59:59`).getTime() : now;
    } else if (timeframe === "7d") {
      startMs = now - 7 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "14d") {
      startMs = now - 14 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "30d") {
      startMs = now - 30 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "90d") {
      startMs = now - 90 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "180d") {
      startMs = now - 180 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "365d") {
      startMs = now - 365 * 24 * 60 * 60 * 1000;
    } else {
      // all time
      startMs = 0;
    }

    return { startMs, endMs };
  };

  const { startMs, endMs } = getTimeWindow();

  // Filter orders by timeframe
  const timeframeOrders = orders.filter((o) => {
    if (!o.timestamp) return true;
    const time = o.timestamp.seconds
      ? o.timestamp.seconds * 1000
      : new Date(o.timestamp).getTime();
    return time >= startMs && time <= endMs;
  });

  // Calculate Summary Metrics for Timeframe
  const totalTimeframeOrdersCount = timeframeOrders.length;
  const activeOrdersCount = timeframeOrders.filter(
    (o) => o.status === "pending" || o.status === "preparing" || o.status === "ready_for_pickup"
  ).length;
  const deliveredOrdersCount = timeframeOrders.filter((o) => o.status === "delivered").length;
  const declinedOrdersCount = timeframeOrders.filter((o) => o.status === "declined").length;
  const timeframeVolume = timeframeOrders
    .filter((o) => o.status !== "declined")
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Apply Status & Search Filters on Timeframe Orders
  const filteredOrders = timeframeOrders.filter((o) => {
    const matchesStatus = filterStatus === "all" || o.status === filterStatus;
    const search = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !search ||
      (o.id && o.id.toLowerCase().includes(search)) ||
      (o.phone && o.phone.toLowerCase().includes(search)) ||
      (o.vendor_name && o.vendor_name.toLowerCase().includes(search));
    return matchesStatus && matchesSearch;
  });

  const getWhatsAppCustomerUrl = (phone: string, orderId: string) => {
    const text = `Habari! Msaada kutoka Sosika Admin kuhusu oda yako #${orderId.slice(-6)}.`;
    const cleanPhone = phone.replace(/\D/g, "");
    return `https://wa.me/${cleanPhone.startsWith("255") ? cleanPhone : "255" + cleanPhone.replace(/^0/, "")}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Timeframe Filter Bar */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Calendar size={18} className="text-[#00bfff]" />
              <span>Live Orders Dispatch Timeframe</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Filter order stream volume, active dispatches, and historical order status records
            </p>
          </div>

          {/* Timeframe Preset Pills */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.08] overflow-x-auto max-w-full">
            {[
              { id: "7d", label: "7 Days" },
              { id: "14d", label: "14 Days" },
              { id: "30d", label: "30 Days" },
              { id: "90d", label: "90 Days" },
              { id: "180d", label: "180 Days" },
              { id: "365d", label: "365 Days" },
              { id: "all", label: "All Time" },
              { id: "custom", label: "Custom Range" }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeframe(opt.id as TimeframeOption)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  timeframe === opt.id
                    ? "bg-[#00bfff] text-black shadow-md shadow-[#00bfff]/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Range Picker */}
        {timeframe === "custom" && (
          <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-bold">Start Date:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#00bfff] font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-bold">End Date:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#00bfff] font-mono"
              />
            </div>

            <span className="text-emerald-400 font-mono text-[11px] font-bold">
              Active Window Applied
            </span>
          </div>
        )}
      </div>

      {/* Metrics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Orders in Window */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Total Orders
            </span>
            <Package size={16} className="text-[#00bfff]" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {totalTimeframeOrdersCount}
          </div>
          <span className="text-[10px] text-zinc-500 block">In selected timeframe</span>
        </div>

        {/* Live Active Orders */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Active Dispatches
            </span>
            <Activity size={16} className="text-[#00bfff]" />
          </div>
          <div className="text-xl font-black text-[#00bfff] font-mono flex items-baseline gap-2">
            <span>{activeOrdersCount}</span>
            <span className="text-[9px] font-bold text-emerald-400 animate-pulse">Live</span>
          </div>
          <span className="text-[10px] text-zinc-500 block">Pending / Preparing / Ready</span>
        </div>

        {/* Delivered Orders */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Delivered
            </span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {deliveredOrdersCount}
          </div>
          <span className="text-[10px] text-zinc-500 block">Completed deliveries</span>
        </div>

        {/* Declined Orders */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Declined
            </span>
            <XCircle size={16} className="text-red-400" />
          </div>
          <div className="text-xl font-black text-red-400 font-mono">
            {declinedOrdersCount}
          </div>
          <span className="text-[10px] text-zinc-500 block">Rejected or cancelled</span>
        </div>

        {/* Volume TZS */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Order Volume
            </span>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {timeframeVolume.toLocaleString()} TZS
          </div>
          <span className="text-[10px] text-zinc-500 block">Gross order value</span>
        </div>
      </div>

      {/* Search & Status Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.08] rounded-3xl p-5">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Package size={18} className="text-[#00bfff]" />
            <span>Orders Dispatch Table ({filteredOrders.length})</span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search Phone, Order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#00bfff]/50 transition-all font-mono"
            />
          </div>

          {/* Status Filter Pill Tabs */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] overflow-x-auto">
            {["all", "pending", "preparing", "ready_for_pickup", "delivered", "declined"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all whitespace-nowrap cursor-pointer ${
                  filterStatus === st
                    ? "bg-[#00bfff] text-black shadow-md shadow-[#00bfff]/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {st === "ready_for_pickup" ? "Ready" : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List Container */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400 space-y-3">
          <Loader2 size={24} className="animate-spin text-[#00bfff] mx-auto" />
          <p className="text-xs font-mono">Connecting to live order dispatch stream...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-12 text-center space-y-2">
          <Package size={32} className="text-zinc-600 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-300">No Orders Found</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            No customer orders match the selected timeframe and filter query.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.12] rounded-2xl p-4 sm:p-5 space-y-4 transition-all"
              >
                {/* Order Summary Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                        order.status === "delivered"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : order.status === "preparing"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : order.status === "declined"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-[#00bfff]/10 text-[#00bfff] border border-[#00bfff]/20"
                      }`}
                    >
                      {order.status === "preparing" ? (
                        <ChefHat size={18} />
                      ) : order.status === "ready_for_pickup" ? (
                        <Bike size={18} />
                      ) : order.status === "delivered" ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Clock size={18} />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">
                          {order.vendor_name || "Sosika Kitchen"}
                        </span>
                        <span className="font-mono text-xs text-zinc-400">
                          #{order.id.slice(-6)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span className="font-mono text-[#00bfff] font-bold">{order.phone}</span>
                        <span>•</span>
                        <span>{(order.totalAmount || 0).toLocaleString()} TZS</span>
                        <span>•</span>
                        <span className="capitalize font-bold text-zinc-300">{order.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Header Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={getWhatsAppCustomerUrl(order.phone, order.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1 transition-all"
                      title="WhatsApp Customer"
                    >
                      <MessageSquare size={14} />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>

                    <button
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Details</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="pt-4 border-t border-white/[0.06] space-y-4">
                    {/* Items List */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        Ordered Items
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {order.cart?.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white/[0.02] border border-white/[0.04] p-2.5 rounded-xl flex items-center justify-between text-xs"
                          >
                            <span className="text-zinc-200 font-semibold">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="font-mono text-zinc-400">
                              {(
                                (typeof item.price === "number"
                                  ? item.price
                                  : parseFloat(item.price as string) || 0) * item.quantity
                              ).toLocaleString()}{" "}
                              TZS
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery & Payment Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl">
                      <div>
                        <span className="text-zinc-500 text-[10px] font-bold uppercase block">
                          Delivery Destination
                        </span>
                        <span className="text-white font-medium">
                          {order.displayLocation || "No address recorded"}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px] font-bold uppercase block">
                          Payment Method
                        </span>
                        <span className="text-[#00bfff] font-mono font-bold capitalize">
                          {order.paymentMethod === "sosika_cash"
                            ? "Sosika Cash Wallet"
                            : order.paymentMethod === "hybrid_wallet_cash"
                            ? "Wallet + Cash on Delivery"
                            : "Cash on Delivery"}
                        </span>
                      </div>
                    </div>

                    {/* Emergency Admin Status Override Console */}
                    <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                      <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <ShieldAlert size={12} />
                        Emergency Admin Status Override
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          onClick={() => handleAdminStatusOverride(order.id, "preparing")}
                          disabled={updatingId === order.id || order.status === "preparing"}
                          className="py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 disabled:opacity-40 transition-all cursor-pointer"
                        >
                          Mark Preparing
                        </button>
                        <button
                          onClick={() => handleAdminStatusOverride(order.id, "ready_for_pickup")}
                          disabled={updatingId === order.id || order.status === "ready_for_pickup"}
                          className="py-2 rounded-xl text-xs font-bold bg-[#00bfff]/10 hover:bg-[#00bfff]/20 text-[#00bfff] border border-[#00bfff]/20 disabled:opacity-40 transition-all cursor-pointer"
                        >
                          Mark Dispatched
                        </button>
                        <button
                          onClick={() => handleAdminStatusOverride(order.id, "delivered")}
                          disabled={updatingId === order.id || order.status === "delivered"}
                          className="py-2 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 disabled:opacity-40 transition-all cursor-pointer"
                        >
                          Mark Delivered
                        </button>
                        <button
                          onClick={() => handleAdminStatusOverride(order.id, "declined")}
                          disabled={updatingId === order.id || order.status === "declined"}
                          className="py-2 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-40 transition-all cursor-pointer"
                        >
                          Mark Declined
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
