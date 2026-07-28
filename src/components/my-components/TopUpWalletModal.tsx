import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MessageSquare,
  PhoneCall,
  Copy,
  Check,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { useWallet } from "../../context/WalletContext";

interface TopUpWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOPUP_PRESETS = [1000, 5000, 10000, 20000];

export default function TopUpWalletModal({ isOpen, onClose }: TopUpWalletModalProps) {
  const { balance, phone } = useWallet();
  const [selectedAmount, setSelectedAmount] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState<string>("5000");
  const [copiedLipa, setCopiedLipa] = useState(false);

  const LIPA_NUMBER = "353438054";
  const ADMIN_PHONE = "+255778903468";

  // Amount calculation synchronized with input field
  const targetAmount = parseFloat(customAmount) || 0;
  const projectedBalance = balance + targetAmount;

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const handleSelectPreset = (amt: number) => {
    triggerHaptic();
    setSelectedAmount(amt);
    setCustomAmount(amt.toString());
  };

  const copyLipaNumber = () => {
    triggerHaptic();
    navigator.clipboard.writeText(LIPA_NUMBER);
    setCopiedLipa(true);
    setTimeout(() => setCopiedLipa(false), 2200);
  };

  const getWhatsAppUrl = () => {
    const text = `Habari Sosika Admin! Naomba kuweka salio la Sosika Cash Wallet.\n\n📱 Simu: ${phone || "N/A"}\n💵 Top-Up: TZS ${targetAmount.toLocaleString()}\n💳 Salio Jipya: TZS ${projectedBalance.toLocaleString()}\n\nAhsante!`;
    return `https://wa.me/255760903468?text=${encodeURIComponent(text)}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Highest Z-Index Layering (z-[9999]) to rise on top of everything including bottom navbar */}
      <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/80 backdrop-blur-md">
        {/* Backdrop click to close */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-transparent"
        />

        {/* Sleek Professional Bottom Rising Sheet Drawer */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="w-full sm:max-w-md bg-[#0b0b0f] border-t border-white/[0.12] rounded-t-[28px] p-5 sm:p-6 shadow-2xl space-y-4 text-white relative overflow-hidden font-sans max-h-[90vh] overflow-y-auto z-10"
        >
          {/* Top Drag Handle Bar */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-1 cursor-grab" />

          {/* iOS Style Drawer Header */}
          <div className="relative flex items-center justify-center pb-2 border-b border-white/[0.06]">
            <h2 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <Sparkles size={15} className="text-[#00bfff]" />
              <span>Sosika Cash Top-Up</span>
            </h2>

            <button
              onClick={onClose}
              className="absolute right-0 p-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-all cursor-pointer"
              aria-label="Close drawer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Minimal Contact Advisory Banner */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-amber-300">
            <AlertCircle size={16} className="shrink-0 text-amber-400" />
            <span className="leading-tight font-medium text-[11px]">
              <strong>Tip:</strong> Contact Sosika first via WhatsApp/Call before paying to confirm instant wallet processing.
            </span>
          </div>

          {/* Sleek Minimal Balance Card */}
          <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Current Balance
              </span>
              <span className="text-sm font-extrabold text-white font-mono">
                {balance.toLocaleString()} TZS
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block flex items-center gap-1 justify-end">
                <TrendingUp size={11} />
                New Balance
              </span>
              <span className="text-lg font-black text-[#00bfff] font-mono">
                {projectedBalance.toLocaleString()} TZS
              </span>
            </div>
          </div>

          {/* Amount Selector & Input Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
              <span>Select or Enter Amount</span>
              <span className="font-mono text-[10px] text-zinc-500">TZS</span>
            </div>

            {/* Synchronized Preset Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {TOPUP_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleSelectPreset(amt)}
                  className={`py-2 rounded-xl text-xs font-mono font-black transition-all border cursor-pointer ${
                    selectedAmount === amt && customAmount === amt.toString()
                      ? "bg-[#00bfff] text-black border-[#00bfff] shadow-md shadow-[#00bfff]/20"
                      : "bg-white/[0.03] text-zinc-300 border-white/[0.08] hover:bg-white/[0.08]"
                  }`}
                >
                  +{amt.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Input Field reflecting preset amounts */}
            <div className="relative">
              <input
                type="number"
                placeholder="Enter amount (TZS)"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  const parsed = parseFloat(e.target.value);
                  if (!isNaN(parsed)) setSelectedAmount(parsed);
                }}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#00bfff] transition-all font-mono font-bold"
              />
            </div>
          </div>

          {/* Lipa Namba (Mpesa Merchant Till) Section */}
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-wider block">
                  M-PESA Merchant Till
                </span>
                <span className="text-lg font-black font-mono text-white tracking-wider block mt-0.5">
                  {LIPA_NUMBER}
                </span>
                <span className="text-[10px] text-zinc-400 block font-medium">
                  Name: LIPA SOSIKA STORE
                </span>
              </div>

              <button
                type="button"
                onClick={copyLipaNumber}
                className="flex items-center gap-1 text-xs font-extrabold text-[#00bfff] bg-[#00bfff]/10 hover:bg-[#00bfff]/20 px-3 py-2 rounded-xl border border-[#00bfff]/30 transition-all cursor-pointer shrink-0 active:scale-95"
              >
                {copiedLipa ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy Till</span>
                  </>
                )}
              </button>
            </div>

            {/* Cross-Network Guidance Badge */}
            <p className="text-[10px] text-zinc-500 pt-1 border-t border-white/[0.04]">
              <span className="text-zinc-400 font-bold">M-Pesa / Tigo / Halopesa:</span> Lipa Namba ➔ M-Pesa (`656313666`).
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold py-3 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-[#00bfff]/15 active:scale-95"
            >
              <MessageSquare size={15} />
              <span>WhatsApp Admin</span>
            </a>

            <a
              href={`tel:${ADMIN_PHONE}`}
              className="flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-bold py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-95"
            >
              <PhoneCall size={15} className="text-[#00bfff]" />
              <span>Call Direct</span>
            </a>
          </div>

          {/* Footer Security Note */}
          <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500 font-medium pt-1">
            <ShieldCheck size={11} className="text-emerald-400" />
            <span>Escrow Protected • 100% Instant Credit</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
