import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  query,
  where,
  limit
} from "firebase/firestore";
import {
  Wallet,
  Search,
  PlusCircle,
  RefreshCw,
  Clock,
  UserCheck
} from "lucide-react";

export default function WalletConsole() {
  const [searchPhone, setSearchPhone] = useState("");
  const [searchedWallet, setSearchedWallet] = useState<any | null>(null);
  const [searchedTx, setSearchedTx] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Manual Credit Form
  const [creditPhone, setCreditPhone] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditType, setCreditType] = useState<"manual_topup" | "refund" | "adjustment">("manual_topup");
  const [description, setDescription] = useState("Manual Lipa Namba Top-Up");
  const [submitting, setSubmitting] = useState(false);

  // Recent Global Transactions
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const fetchRecentTransactions = async () => {
    setLoadingRecent(true);
    try {
      const q = query(collection(db, "wallet_transactions"), limit(25));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setRecentTx(list);
    } catch (err) {
      console.error("Error fetching recent transactions:", err);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchRecentTransactions();
  }, []);

  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "").trim();
    if (!digits) return "";
    if (digits.startsWith("255")) return `+${digits}`;
    if (digits.startsWith("0")) return `+255${digits.substring(1)}`;
    return `+255${digits}`;
  };

  const handleSearchWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone) return;

    const formatted = normalizePhone(searchPhone);
    setLoadingSearch(true);

    try {
      const walletRef = doc(db, "wallets", formatted);
      const snap = await getDoc(walletRef);

      if (snap.exists()) {
        setSearchedWallet({ phone: snap.id, ...snap.data() });
      } else {
        setSearchedWallet({ phone: formatted, balance: 0, notFound: true });
      }

      // Fetch user's transactions
      const q = query(collection(db, "wallet_transactions"), where("phone", "==", formatted));
      const txSnap = await getDocs(q);
      const txList: any[] = [];
      txSnap.forEach((d) => txList.push({ id: d.id, ...d.data() }));
      txList.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setSearchedTx(txList);
    } catch (err) {
      console.error("Search wallet error:", err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleExecuteCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditPhone || !creditAmount) {
      alert("Please fill customer phone number and top-up amount.");
      return;
    }

    const formatted = normalizePhone(creditPhone);
    const amountNum = parseFloat(creditAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Invalid top-up amount.");
      return;
    }

    setSubmitting(true);
    try {
      const batch = writeBatch(db);

      // 1. Get current balance
      const walletRef = doc(db, "wallets", formatted);
      const walletSnap = await getDoc(walletRef);
      const currentBal = walletSnap.exists() ? walletSnap.data().balance || 0 : 0;
      const newBal = currentBal + amountNum;

      // 2. Set updated balance
      batch.set(
        walletRef,
        { phone: formatted, balance: newBal, updatedAt: new Date() },
        { merge: true }
      );

      // 3. Log transaction ledger record
      const txRef = doc(collection(db, "wallet_transactions"));
      batch.set(txRef, {
        id: txRef.id,
        phone: formatted,
        amount: amountNum,
        type: creditType,
        description: description || "Admin Wallet Adjustment",
        timestamp: new Date(),
      });

      await batch.commit();
      alert(`Success! Credited TZS ${amountNum.toLocaleString()} to ${formatted}. New balance: TZS ${newBal.toLocaleString()}`);

      setCreditPhone("");
      setCreditAmount("");
      setDescription("Manual Lipa Namba Top-Up");
      fetchRecentTransactions();

      if (searchedWallet && searchedWallet.phone === formatted) {
        setSearchedWallet({ phone: formatted, balance: newBal });
      }
    } catch (err) {
      console.error("Admin wallet credit error:", err);
      alert("Failed to credit wallet.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.08] rounded-3xl p-5">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Wallet size={20} className="text-amber-400" />
            <span>Sosika Cash Wallet Console</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Customer balance lookup, manual Lipa Namba crediting, and transaction audit ledger
          </p>
        </div>

        {/* Phone Lookup Form */}
        <form onSubmit={handleSearchWallet} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="tel"
              placeholder="Lookup Phone (e.g. 0760...)"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#00bfff]/50 transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loadingSearch || !searchPhone}
            className="bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {loadingSearch ? "Searching..." : "Lookup"}
          </button>
        </form>
      </div>

      {/* Searched Customer Result Panel */}
      {searchedWallet && (
        <div className="bg-white/[0.02] border border-amber-500/30 rounded-3xl p-6 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <UserCheck size={18} className="text-amber-400" />
              <h3 className="font-extrabold text-sm text-white">
                Customer Wallet Account: <span className="font-mono text-[#00bfff]">{searchedWallet.phone}</span>
              </h3>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full">
              Balance: {(searchedWallet.balance || 0).toLocaleString()} TZS
            </span>
          </div>

          {/* Searched Wallet Transaction History */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              Account Transaction Ledger ({searchedTx.length})
            </span>

            {searchedTx.length === 0 ? (
              <p className="text-xs text-zinc-500 font-mono py-2">No transactions recorded for this wallet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {searchedTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl text-xs"
                  >
                    <div>
                      <span className="font-bold text-white block">{tx.description || tx.type}</span>
                      <span className="text-zinc-500 text-[10px] font-mono">
                        {tx.timestamp?.seconds
                          ? new Date(tx.timestamp.seconds * 1000).toLocaleString()
                          : "Recently"}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-extrabold ${
                        tx.amount > 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} TZS
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Form & Global Ledger Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Wallet Credit Form */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 space-y-4">
          <div className="pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <PlusCircle size={16} className="text-[#00bfff]" />
              <span>Credit Customer Wallet (Lipa Namba / Manual)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Directly credit a customer's Sosika Cash balance after receiving Lipa Namba payment
            </p>
          </div>

          <form onSubmit={handleExecuteCredit} className="space-y-3.5 text-xs">
            <div>
              <label className="text-zinc-300 font-bold block mb-1">Customer Phone Number</label>
              <input
                type="tel"
                required
                placeholder="e.g. 0760... or +255760..."
                value={creditPhone}
                onChange={(e) => setCreditPhone(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff] font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Amount (TZS)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff] font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Entry Type</label>
                <select
                  value={creditType}
                  onChange={(e) => setCreditType(e.target.value as any)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
                >
                  <option value="manual_topup" className="bg-zinc-900">Manual Lipa Top-Up</option>
                  <option value="refund" className="bg-zinc-900">Order Refund</option>
                  <option value="adjustment" className="bg-zinc-900">Admin Adjustment</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-zinc-300 font-bold block mb-1">Note / Description</label>
              <input
                type="text"
                placeholder="e.g. Top-up via Lipa Namba 656313666"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-white outline-none focus:border-[#00bfff]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !creditPhone || !creditAmount}
              className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00bfff]/20 disabled:opacity-40"
            >
              {submitting ? "Crediting Balance..." : "Credit Customer Wallet Balance"}
            </button>
          </form>
        </div>

        {/* Global Recent Transactions Audit Log */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Clock size={16} className="text-emerald-400" />
              <span>Platform Wallet Ledger</span>
            </h3>
            <button
              onClick={fetchRecentTransactions}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-bold"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {loadingRecent ? (
              <p className="text-xs text-zinc-500 text-center py-6">Loading transaction ledger...</p>
            ) : recentTx.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No recent wallet transactions.</p>
            ) : (
              recentTx.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] p-3 rounded-2xl text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#00bfff] font-bold">{tx.phone}</span>
                      <span className="text-[10px] uppercase font-bold text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded">
                        {tx.type}
                      </span>
                    </div>
                    <span className="text-zinc-400 text-[11px] block mt-0.5">
                      {tx.description}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono font-black ${
                        tx.amount > 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} TZS
                    </span>
                    <span className="text-zinc-600 text-[9px] block font-mono">
                      {tx.timestamp?.seconds
                        ? new Date(tx.timestamp.seconds * 1000).toLocaleTimeString()
                        : "Recently"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
