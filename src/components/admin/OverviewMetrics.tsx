import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, getDocs, query, limit } from "firebase/firestore";
import {
  TrendingUp,
  Store,
  Wallet,
  Camera,
  Activity,
  Smartphone,
  RefreshCw,
  Calendar,
  DollarSign
} from "lucide-react";

type TimeframeOption = "7d" | "14d" | "30d" | "90d" | "180d" | "365d" | "all" | "custom";

export default function OverviewMetrics() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [appEntries, setAppEntries] = useState<any[]>([]);

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

    // 1. Subscribe to live orders
    const ordersUnsub = onSnapshot(collection(db, "orders"), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setOrders(list);
    });

    // 2. Subscribe to vendors
    const vendorsUnsub = onSnapshot(collection(db, "vendors"), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setVendors(list);
    });

    // 3. Subscribe to wallets
    const walletsUnsub = onSnapshot(collection(db, "wallets"), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setWallets(list);
    });

    // 4. Fetch photo submissions
    getDocs(collection(db, "food_photo_submissions")).then((snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setSubmissions(list);
    });

    // 5. Fetch app entries analytics
    getDocs(query(collection(db, "app_entries"), limit(100))).then((snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setAppEntries(list);
      setLoading(false);
    });

    return () => {
      ordersUnsub();
      vendorsUnsub();
      walletsUnsub();
    };
  }, []);

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

  // Filter orders by time window
  const filteredOrders = orders.filter((o) => {
    if (o.status === "declined") return false;
    if (!o.timestamp) return true; // Include legacy orders if timestamp missing
    const time = o.timestamp.seconds
      ? o.timestamp.seconds * 1000
      : new Date(o.timestamp).getTime();
    return time >= startMs && time <= endMs;
  });

  // Calculate Period Analytics
  const periodRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const periodOrdersCount = filteredOrders.length;
  const periodAOV = periodOrdersCount > 0 ? Math.round(periodRevenue / periodOrdersCount) : 0;

  // Platform metrics
  const activeOrdersCount = orders.filter(
    (o) => o.status === "pending" || o.status === "preparing" || o.status === "ready_for_pickup"
  ).length;

  const deliveredOrdersCount = orders.filter((o) => o.status === "delivered").length;
  const approvedVendorsCount = vendors.filter((v) => v.is_approved || v.auth_info?.is_approved).length;

  const totalWalletLiability = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const approvedPhotoRewardsCount = submissions.filter((s) => s.status === "approved").length;
  const totalRewardsPayout = approvedPhotoRewardsCount * 1000;

  if (loading) {
    return (
      <div className="p-8 text-center text-zinc-400 space-y-3">
        <RefreshCw size={24} className="animate-spin text-[#00bfff] mx-auto" />
        <p className="text-xs font-mono">Aggregating live platform metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Timeframe Filter Control Bar */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Calendar size={18} className="text-[#00bfff]" />
              <span>Revenue & Analytics Timeframe</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Filter platform GMV revenue, completed orders, and average order value (AOV)
            </p>
          </div>

          {/* Timeframe Preset Pill Tabs */}
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

        {/* Custom Range Input Modal Row */}
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
              Active Date Window Applied
            </span>
          </div>
        )}
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Period GMV Revenue */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {timeframe === "all" ? "Total Revenue" : `Revenue (${timeframe.toUpperCase()})`}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {periodRevenue.toLocaleString()} TZS
          </div>
          <p className="text-[11px] text-zinc-500">
            From {periodOrdersCount} orders in window
          </p>
        </div>

        {/* Average Order Value - AOV */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Avg Order Value
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">
            {periodAOV.toLocaleString()} TZS
          </div>
          <p className="text-[11px] text-zinc-500">
            Average ticket size
          </p>
        </div>

        {/* Live Active Orders */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Active Orders Now
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#00bfff]/10 text-[#00bfff] border border-[#00bfff]/20 flex items-center justify-center">
              <Activity size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#00bfff] font-mono">
              {activeOrdersCount}
            </span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Stream
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            {deliveredOrdersCount} delivered overall
          </p>
        </div>

        {/* Verified Vendors */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Verified Vendors
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Store size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {approvedVendorsCount} / {vendors.length}
          </div>
          <p className="text-[11px] text-zinc-500">
            {vendors.filter((v) => v.is_open).length} open for orders
          </p>
        </div>

        {/* Sosika Cash Wallet Ecosystem */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Wallet Liabilities
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Wallet size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {totalWalletLiability.toLocaleString()} TZS
          </div>
          <p className="text-[11px] text-zinc-500">
            Across {wallets.length} customer wallets
          </p>
        </div>
      </div>

      {/* Rewards & App Entries Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Food Photo Rewards Summary */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Camera size={16} className="text-[#00bfff]" />
              <span>Food Photo Rewards Program</span>
            </h3>
            <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
              {totalRewardsPayout.toLocaleString()} TZS Paid
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-2xl">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Uploads</span>
              <span className="text-lg font-black text-white font-mono">{submissions.length}</span>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-2xl">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Approved</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{approvedPhotoRewardsCount}</span>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-2xl">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Pending</span>
              <span className="text-lg font-black text-[#00bfff] font-mono">
                {submissions.filter((s) => s.status === "pending").length}
              </span>
            </div>
          </div>
        </div>

        {/* Live App Usage & Entry Stream */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone size={16} className="text-purple-400" />
              <span>App Traffic & Session Analytics</span>
            </h3>
            <span className="text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-full font-bold">
              {appEntries.length} Recorded Sessions
            </span>
          </div>

          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {appEntries.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">No app session entries logged yet.</p>
            ) : (
              appEntries.slice(0, 5).map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl text-xs"
                >
                  <div>
                    <span className="font-mono text-[#00bfff] font-bold">
                      {entry.phone || entry.userPhone || "Guest Session"}
                    </span>
                    <span className="text-zinc-500 text-[10px] block">
                      Source: {entry.source || "direct_web"}
                    </span>
                  </div>
                  <span className="text-zinc-400 font-mono text-[10px]">
                    {entry.timestamp?.seconds
                      ? new Date(entry.timestamp.seconds * 1000).toLocaleTimeString()
                      : "Recently"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
