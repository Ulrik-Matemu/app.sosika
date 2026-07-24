import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MessageSquare,
  PhoneCall,
  Copy,
  Check,
  ShieldCheck,
  ArrowUpRight,
  TrendingUp,
  Lock
} from "lucide-react";
import { useWallet } from "../../context/WalletContext";

interface TopUpWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOPUP_PRESETS = [2000, 5000, 10000, 20000];

export default function TopUpWalletModal({ isOpen, onClose }: TopUpWalletModalProps) {
  const { balance, phone } = useWallet();
  const [selectedAmount, setSelectedAmount] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [copiedLipa, setCopiedLipa] = useState(false);

  const LIPA_NUMBER = "656313666";
  const ADMIN_PHONE = "+255760903468";

  const targetAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;
  const projectedBalance = balance + targetAmount;

  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const copyLipaNumber = () => {
    triggerHaptic();
    navigator.clipboard.writeText(LIPA_NUMBER);
    setCopiedLipa(true);
    setTimeout(() => setCopiedLipa(false), 2200);
  };

  const getWhatsAppUrl = () => {
    const text = `Habari Sosika Admin! Naomba kuweka salio la Sosika Cash Wallet.\n\n📱 Simu: ${phone || "N/A"}\n💵 Kiasi cha Top-Up: TZS ${targetAmount.toLocaleString()}\n💳 Salio jipya kutarajiwa: TZS ${projectedBalance.toLocaleString()}\n\nTafadhali niongezee salio baada ya malipo ya Lipa Namba. Ahsante!`;
    return `https://wa.me/255760903468?text=${encodeURIComponent(text)}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
        {/* Backdrop click to close */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-transparent"
        />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full sm:max-w-md bg-[#0c0c10] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 text-white relative overflow-hidden font-sans max-h-[92vh] overflow-y-auto"
        >
          {/* Top Grab Handle for Mobile */}
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto sm:hidden mb-1" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all cursor-pointer z-10"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>

          {/* Header & Trust Badge */}
          <div className="space-y-3 relative z-10 pt-1 sm:pt-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={13} />
              <span>Verified Sosika Wallet Escrow</span>
            </div>

            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Sosika Cash Top-Up
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                Add instant in-app wallet credit to pay for meals & delivery fees seamlessly.
              </p>
            </div>

            {/* Interactive Projected Balance Card */}
            <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    Current Balance
                  </span>
                  <span className="text-lg font-bold text-zinc-300 font-mono">
                    {balance.toLocaleString()} TZS
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block flex items-center gap-1 justify-end">
                    <TrendingUp size={11} />
                    Projected Balance
                  </span>
                  <span className="text-2xl font-black text-[#00bfff] font-mono">
                    {projectedBalance.toLocaleString()} TZS
                  </span>
                </div>
              </div>

              {targetAmount > 0 && (
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>Selected Top-Up:</span>
                  <span className="text-emerald-400 font-bold">+{targetAmount.toLocaleString()} TZS</span>
                </div>
              )}
            </div>
          </div>

          {/* Step 1: Select Amount */}
          <div className="space-y-2.5 relative z-10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-200">
                1. Select Top-Up Amount
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">TZS</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {TOPUP_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setSelectedAmount(amt);
                    setCustomAmount("");
                  }}
                  className={`py-2.5 rounded-xl text-xs font-mono font-extrabold transition-all border cursor-pointer ${
                    selectedAmount === amt && !customAmount
                      ? "bg-[#00bfff] text-black border-[#00bfff] shadow-lg shadow-[#00bfff]/20"
                      : "bg-white/[0.03] text-zinc-300 border-white/[0.08] hover:bg-white/[0.08]"
                  }`}
                >
                  +{amt.toLocaleString()}
                </button>
              ))}
            </div>

            <input
              type="number"
              placeholder="Or enter custom amount (e.g. 15000)"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#00bfff]/60 transition-all font-mono"
            />
          </div>

          {/* Step 2: Payment via Lipa Namba */}
          <div className="space-y-3 relative z-10 pt-1">
            <label className="text-xs font-bold text-zinc-200 block">
              2. Send Payment via Lipa Namba
            </label>

            {/* High-Contrast Lipa Card */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block truncate">
                  Airtel Money Lipa Namba (ULRIK MATEMU)
                </span>
                <span className="text-xl font-black font-mono text-white tracking-wider block mt-0.5">
                  {LIPA_NUMBER}
                </span>
              </div>

              <button
                type="button"
                onClick={copyLipaNumber}
                className="flex items-center gap-1.5 text-xs font-extrabold text-[#00bfff] bg-[#00bfff]/10 hover:bg-[#00bfff]/20 px-3.5 py-2 rounded-xl border border-[#00bfff]/30 transition-all cursor-pointer shrink-0 active:scale-95"
              >
                {copiedLipa ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Till</span>
                  </>
                )}
              </button>
            </div>

            {/* Step 3: Action Buttons */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-zinc-200 block">
                3. Notify Admin for Instant Credit
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/15 active:scale-95"
                >
                  <MessageSquare size={16} />
                  <span>WhatsApp Admin</span>
                  <ArrowUpRight size={14} />
                </a>

                <a
                  href={`tel:${ADMIN_PHONE}`}
                  className="flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-bold py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-95"
                >
                  <PhoneCall size={16} className="text-[#00bfff]" />
                  <span>Direct Call</span>
                </a>
              </div>
            </div>

            {/* Trust Footer Note */}
            <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] text-zinc-500 font-medium">
              <Lock size={11} className="text-emerald-400" />
              <span>100% Guaranteed Manual Top-Up • Credits in &lt; 2 mins</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
