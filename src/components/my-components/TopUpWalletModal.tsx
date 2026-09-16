import { useState } from "react";
import {
  MessageSquare,
  PhoneCall,
  Copy,
  Check,
} from "lucide-react";
import { useWallet } from "../../context/WalletContext";
import BottomSheet from "./BottomSheet";

interface TopUpWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOPUP_PRESETS = [5000, 10000, 20000];

export default function TopUpWalletModal({ isOpen, onClose }: TopUpWalletModalProps) {
  const { balance, phone } = useWallet();
  const [selectedAmount, setSelectedAmount] = useState<number>(10000);
  const [customAmount, setCustomAmount] = useState<string>("10000");
  const [copiedLipa, setCopiedLipa] = useState(false);

  const LIPA_NUMBER = "353438054";
  const ADMIN_PHONE = "+255778903468";

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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Top up Sosika Cash">
      {/* Preset amount chips */}
      <div className="flex gap-2">
        {TOPUP_PRESETS.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => handleSelectPreset(amt)}
            className={`flex-1 py-3.5 rounded-[13px] font-mono text-sm font-bold transition-colors border ${
              selectedAmount === amt && customAmount === amt.toString()
                ? "bg-sosika-amber text-sosika-ground border-sosika-amber"
                : "bg-surface-2 text-content-secondary border-edge-2"
            }`}
          >
            {amt.toLocaleString()}
          </button>
        ))}
      </div>

      <input
        type="number"
        placeholder="Enter amount (TZS)"
        value={customAmount}
        onChange={(e) => {
          setCustomAmount(e.target.value);
          const parsed = parseFloat(e.target.value);
          if (!isNaN(parsed)) setSelectedAmount(parsed);
        }}
        className="w-full bg-surface-2 border border-edge-2 rounded-2xl py-3 px-4 text-sm text-content placeholder-content-faint outline-none focus:border-sosika-amber/35 transition-colors font-mono font-bold"
      />

      {/* Step 1 */}
      <div className="rounded-[18px] border border-edge-2 bg-surface-1 p-[18px] flex flex-col gap-3.5">
        <div className="font-mono text-[10px] tracking-[0.14em] text-content-muted">
          STEP 1 · SEND VIA LIPA NAMBA
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[22px] font-bold tracking-[-0.01em] text-content">{LIPA_NUMBER}</div>
            <div className="text-xs text-content-muted mt-[5px]">Sosika Tanzania Ltd · M-Pesa</div>
          </div>
          <button
            type="button"
            onClick={copyLipaNumber}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-ink border border-sosika-amber/35 px-[14px] py-[10px] rounded-[11px] active:scale-95 transition-transform shrink-0"
          >
            {copiedLipa ? (
              <>
                <Check size={13} className="text-emerald-ink" />
                <span className="text-emerald-ink">Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Step 2 */}
      <div>
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-faint mb-2">
          Step 2 · Confirm with us
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-sosika-amber text-sosika-ground font-bold py-3 rounded-2xl text-sm active:opacity-90 transition-opacity"
          >
            <MessageSquare size={15} />
            <span>WhatsApp</span>
          </a>
          <a
            href={`tel:${ADMIN_PHONE}`}
            className="flex items-center justify-center gap-2 bg-surface-2 border border-edge-2 text-content font-bold py-3 rounded-2xl text-sm"
          >
            <PhoneCall size={15} className="text-amber-ink" />
            <span>Call</span>
          </a>
        </div>
      </div>

      <p className="text-xs text-content-muted leading-[1.55]">
        Credited within 10 minutes. We verify every transfer manually — you'll get an SMS when it lands.
      </p>

      <button
        type="button"
        onClick={() => {
          onClose();
          window.location.href = "/sosika-cash";
        }}
        className="w-full bg-sosika-amber text-sosika-ground font-bold py-[18px] rounded-2xl text-[15px] active:opacity-90 transition-opacity"
      >
        Submit top-up
      </button>
    </BottomSheet>
  );
}
