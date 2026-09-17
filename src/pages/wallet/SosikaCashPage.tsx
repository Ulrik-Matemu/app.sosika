import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Wallet,
  ArrowLeft,
  Zap,
  GraduationCap,
  ShieldCheck,
  Truck,
  Camera,
  PiggyBank,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Lock,
  RefreshCw,
  AlertCircle,
  MessageCircle
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useWallet, WalletTransaction } from "../../context/WalletContext";
import RowList, { RowListItem } from "../../components/my-components/RowList";
import TopUpWalletModal from "../../components/my-components/TopUpWalletModal";
import Navbar from "../../components/my-components/navbar";

const TRANSACTION_LABELS: Record<WalletTransaction["type"], string> = {
  photo_reward: "Photo reward",
  manual_topup: "Top-up · Lipa Namba",
  gateway_topup: "Top-up",
  order_payment: "Order payment",
  admin_adjustment: "Adjustment",
  refund: "Refund",
};

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  children,
  isOpen,
  onToggle,
  icon
}) => {
  return (
    <div className="border border-edge-2 rounded-2xl bg-surface-1 overflow-hidden transition-colors hover:border-white/20">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left text-sm font-bold text-content hover:text-accent-ink transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-accent-ink">{icon}</span>}
          <span>{title}</span>
        </div>
        <ChevronDown
          size={18}
          className={`text-content-tertiary transition-transform duration-300 ${
            isOpen ? "rotate-180 text-accent-ink" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="p-4 pt-0 text-xs text-content-tertiary leading-relaxed border-t border-edge-1 space-y-2 mt-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function SosikaCashPage() {
  const navigate = useNavigate();
  const { balance, transactions } = useWallet();
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [openTermsIndex, setOpenTermsIndex] = useState<number | null>(1); // Default open Refunds section

  const formatTxDate = (timestamp: unknown): string => {
    const hasToDate = (v: unknown): v is { toDate: () => Date } =>
      typeof v === "object" && v !== null && "toDate" in v;
    const date = hasToDate(timestamp)
      ? timestamp.toDate()
      : timestamp
      ? new Date(timestamp as string | number)
      : null;
    if (!date) return "";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const ledgerItems: RowListItem[] = transactions.slice(0, 8).map((t) => {
    const isDebit = t.type === "order_payment";
    return {
      id: t.id,
      title: t.description || TRANSACTION_LABELS[t.type],
      subtitle: formatTxDate(t.timestamp),
      trailing: (
        <span
          className={`font-mono text-sm font-bold ${
            isDebit ? "text-content-secondary" : "text-emerald-ink"
          }`}
        >
          {isDebit ? "−" : "+"}
          {t.amount.toLocaleString()}
        </span>
      ),
    };
  });

  const toggleTerms = (index: number) => {
    setOpenTermsIndex(openTermsIndex === index ? null : index);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  const benefits = [
    {
      icon: <Zap size={22} className="text-accent-ink" />,
      title: "Instant One-Tap Checkout",
      description:
        "No waiting for M-Pesa USSD prompts or searching for loose cash. Place orders in seconds flat with zero payment lag."
    },
    {
      icon: <GraduationCap size={22} className="text-accent-ink" />,
      title: "Built for Campus Life",
      description:
        "Budget your weekly meal money into Sosika Cash. Keep funds safe from accidental spending and guarantee warm meals during exam weeks."
    },
    {
      icon: <Truck size={22} className="text-emerald-ink" />,
      title: "Full Delivery Coverage",
      description:
        "Sosika Cash pays for both your favorite meals and rider delivery fees seamlessly from a single unified wallet balance."
    },
    {
      icon: <ShieldCheck size={22} className="text-emerald-ink" />,
      title: "Protected & Escrow-Safe",
      description:
        "Your money is safely locked in Sosika's encrypted system. If an order fails, funds stay safe in your account."
    },
    {
      icon: <Camera size={22} className="text-amber-ink" />,
      title: "Snap & Earn Rewards",
      description:
        "Earn instant Sosika Cash top-ups (TZS 1,000 per approved photo) whenever you post food reviews and photo updates."
    },
    {
      icon: <PiggyBank size={22} className="text-amber-ink" />,
      title: "Zero Hidden Fees",
      description:
        "Top-ups are 100% free with zero transaction markups. TZS 10,000 deposited is TZS 10,000 ready to spend."
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Top-up via Lipa Namba",
      description:
        "Send your desired amount via M-Pesa, Tigo Pesa, or HaloPesa to Till No. 353438054 (LIPA SOSIKA STORE)."
    },
    {
      number: "02",
      title: "Instant Balance Update",
      description:
        "Notify admin via WhatsApp or direct tap to verify. Your Sosika Cash balance updates in real-time."
    },
    {
      number: "03",
      title: "Order Foods Effortlessly",
      description:
        "Choose Sosika Cash at checkout and enjoy lightning-quick meal confirmation with no extra steps."
    }
  ];

  return (
    <div className="min-h-screen bg-ground text-content pb-28">
      <Helmet>
        <title>Sosika Cash — Digital Wallet & Benefits</title>
        <meta
          name="description"
          content="Learn how Sosika Cash simplifies meal payments, covers delivery fees, and helps campus students budget effortlessly."
        />
      </Helmet>

      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-chrome backdrop-blur-xl border-b border-edge-1 px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-3 border border-edge-2 text-content-secondary"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-[16px] font-bold text-content">Sosika Cash</h1>
      </div>

      {/* BALANCE & ACTIVITY — canvas screen 11 */}
      <div className="max-w-md mx-auto px-5">
        <div className="pt-[30px]">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-content-muted">
            Available balance
          </div>
          <div className="flex items-baseline gap-2 mt-2.5">
            <span className="font-mono text-[46px] font-bold tracking-[-0.03em] text-amber-ink">
              {balance.toLocaleString()}
            </span>
            <span className="font-mono text-[15px] text-content-muted">TZS</span>
          </div>
          <p className="text-[13px] text-content-muted mt-2.5 leading-[1.55]">
            Spend it on any order — partial payment allowed, the rest in cash.
          </p>
        </div>

        <div className="flex gap-[9px] mt-[22px]">
          <button
            type="button"
            onClick={() => setIsTopUpOpen(true)}
            className="flex-1 bg-sosika-amber text-sosika-ground font-bold text-sm py-4 rounded-[15px] active:opacity-90 transition-opacity"
          >
            Top up
          </button>
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="flex-1 bg-transparent border border-edge-3 text-content-secondary font-semibold text-sm py-4 rounded-[15px] active:opacity-90 transition-opacity"
          >
            Earn more
          </button>
        </div>

        {ledgerItems.length > 0 && (
          <div className="mt-7">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-faint">
              Activity
            </div>
            <div className="mt-2">
              <RowList items={ledgerItems} />
            </div>
          </div>
        )}
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-md mx-auto px-5 pt-10 space-y-10"
      >
        {/* HERO SECTION */}
        <motion.div variants={itemVariants} className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-sosika-cyan/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-[18px] bg-gradient-to-br from-sosika-cyan/20 via-ground to-black border border-sosika-cyan/40 flex items-center justify-center text-accent-ink shadow-2xl shadow-sosika-cyan/20">
              <Wallet size={38} />
            </div>
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-sosika-cyan/10 text-accent-ink border border-sosika-cyan/20">
              <Zap size={12} />
              <span>Smart Digital Wallet</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-content">
              Sosika <span className="text-accent-ink">Cash</span>
            </h2>
            <p className="text-sm text-content-tertiary max-w-md mx-auto leading-relaxed">
              The effortless way to pay for campus meals, late-night snacks, and delivery fees without handling physical money or network delays.
            </p>
          </div>
        </motion.div>

        {/* LIPA NAMBA CARD */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-[18px] bg-gradient-to-r from-sosika-cyan/10 via-ground/90 to-black border border-sosika-cyan/30 p-5 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between pb-3 border-b border-edge-2">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-accent-ink" />
              <span className="text-xs font-extrabold text-content uppercase tracking-wider">
                Official Lipa Namba
              </span>
            </div>
            <span className="text-[10px] font-mono bg-sosika-emerald/10 text-emerald-ink border border-sosika-emerald/20 px-2 py-0.5 rounded-full font-bold">
              0% Fee Top-Up
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-content-muted uppercase tracking-widest font-mono">
                M-Pesa Merchant Till
              </div>
              <div className="text-2xl font-bold font-mono tracking-widest text-accent-ink mt-0.5">
                353438054
              </div>
              <div className="text-xs font-semibold text-content-tertiary">
                LIPA SOSIKA STORE
              </div>
            </div>

            <a
              href="https://wa.me/255760903468?text=Habari%20Sosika,%20naomba%20kuweka%20pesa%20kwenye%20Sosika%20Cash%20wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-sosika-cyan hover:bg-sosika-cyan text-black font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-sosika-cyan/20"
            >
              <MessageCircle size={15} />
              <span>Top-Up via WhatsApp</span>
            </a>
          </div>
        </motion.div>

        {/* WHY SOSIKA CASH (BENEFITS GRID) */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-extrabold text-content">Why Use Sosika Cash?</h2>
            <p className="text-xs text-content-tertiary">Designed specifically to give you total control over food spending.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {benefits.map((benefit, idx) => (
              <div
                key={idx}
                className="bg-surface-1 border border-edge-2 hover:border-edge-3 p-4 rounded-2xl space-y-2.5 transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-surface-2 w-fit border border-edge-2 group-hover:scale-105 transition-transform">
                  {benefit.icon}
                </div>
                <h3 className="text-xs font-extrabold text-content group-hover:text-accent-ink transition-colors">
                  {benefit.title}
                </h3>
                <p className="text-[11px] text-content-tertiary leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* HOW IT WORKS */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-extrabold text-content">3 Simple Steps</h2>
            <p className="text-xs text-content-tertiary">Get your digital wallet funded in under 60 seconds.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="relative bg-surface-1 border border-edge-2 p-4 rounded-2xl space-y-2"
              >
                <span className="text-2xl font-bold font-mono text-accent-ink/30 block">
                  {step.number}
                </span>
                <h3 className="text-xs font-bold text-content">{step.title}</h3>
                <p className="text-[11px] text-content-tertiary leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CAMPUS LIFE FEATURED BANNER dns */}
        <motion.div
          variants={itemVariants}
          className="rounded-[18px] bg-gradient-to-br from-purple-500/10 via-ground to-black border border-purple-500/20 p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <GraduationCap size={20} className="text-purple-400" />
            <span className="text-xs font-extrabold text-purple-300 uppercase tracking-wider">
              Campus Special Feature
            </span>
          </div>
          <h3 className="text-sm font-extrabold text-content">
            Smart Meal Budgeting for University Students
          </h3>
          <p className="text-xs text-content-tertiary leading-relaxed">
            Never run out of food money midway through the semester. Deposit your weekly food budget directly into Sosika Cash. It guarantees that even during hectic study or exam periods, your food and delivery fees are 100% pre-secured.
          </p>
        </motion.div>

        {/* TERMS & CONDITIONS ACCORDION */}
        <motion.div variants={itemVariants} className="space-y-4 pt-4 border-t border-edge-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-content flex items-center gap-2">
                <HelpCircle size={18} className="text-accent-ink" />
                <span>Terms, Conditions & Refunds</span>
              </h2>
              <p className="text-xs text-content-tertiary mt-0.5">
                Clear guidelines to protect your funds and maintain Sosika platform integrity.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <AccordionItem
              title="1. Wallet Balance & Deposits"
              isOpen={openTermsIndex === 0}
              onToggle={() => toggleTerms(0)}
              icon={<Wallet size={16} />}
            >
              <p>• Sosika Cash is a closed-loop digital store balance usable exclusively for purchases within the Sosika app.</p>
              <p>• Top-ups are non-interest bearing. Sosika is a technology provider, not a financial banking institution.</p>
              <p>• Deposits are credited upon confirmation of valid payment to M-Pesa Till No. 353438054 (LIPA SOSIKA STORE).</p>
            </AccordionItem>

            <AccordionItem
              title="2. Refund & Cancellation Policy (Strict No-Cash Refund)"
              isOpen={openTermsIndex === 1}
              onToggle={() => toggleTerms(1)}
              icon={<RefreshCw size={16} />}
            >
              <div className="p-3 rounded-xl bg-sosika-amber/10 border border-sosika-amber/20 text-amber-300 font-medium mb-2">
                <strong>Important:</strong> No cash or mobile money withdrawals are granted once funds are deposited into Sosika Cash.
              </div>
              <p>• <strong>Order Issues or Cancellations:</strong> If an order cannot be fulfilled by a vendor or is cancelled due to stock unavailability, the exact purchase price will be refunded <strong>back to your Sosika Cash wallet</strong> balance within 24 hours.</p>
              <p>• <strong>Non-Cash Policy:</strong> Sosika Cash balances cannot be cashed out, transferred to bank accounts, or withdrawn as M-Pesa cash under any circumstances.</p>
              <p>• <strong>Delivery Fees:</strong> Delivery fees are refundable to wallet only if the rider failed to initiate dispatch.</p>
            </AccordionItem>

            <AccordionItem
              title="3. User Responsibility & Account Security"
              isOpen={openTermsIndex === 2}
              onToggle={() => toggleTerms(2)}
              icon={<ShieldCheck size={16} />}
            >
              <p>• You are responsible for ensuring that the phone number linked to your Sosika wallet is accurate and accessible by you.</p>
              <p>• Sosika is not liable for orders authorized from your device or phone number by third parties.</p>
              <p>• Any suspected unauthorized access should be reported to Sosika Admin within 24 hours via WhatsApp (+255760903468).</p>
            </AccordionItem>

            <AccordionItem
              title="4. Photo Review Reward Program Rules"
              isOpen={openTermsIndex === 3}
              onToggle={() => toggleTerms(3)}
              icon={<Camera size={16} />}
            >
              <p>• Photo review rewards (e.g. TZS 1,000 per approved photo) are granted at Sosika's discretion following photo moderation.</p>
              <p>• Submitting stock internet images, inappropriate photos, or duplicate submissions will result in forfeiture of rewards and potential wallet suspension.</p>
            </AccordionItem>

            <AccordionItem
              title="5. Disputes & Customer Support"
              isOpen={openTermsIndex === 4}
              onToggle={() => toggleTerms(4)}
              icon={<AlertCircle size={16} />}
            >
              <p>• Transaction or balance discrepancies must be reported to Sosika customer care within 7 days of the event.</p>
              <p>• Sosika reserves the right to review transaction logs and system audit trails to resolve disputes fairly.</p>
            </AccordionItem>
          </div>
        </motion.div>

        {/* BOTTOM CTA FOOTER */}
        <motion.div
          variants={itemVariants}
          className="text-center p-6 rounded-[18px] bg-surface-1 border border-edge-2 space-y-3"
        >
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-ink font-bold">
            <CheckCircle2 size={16} />
            <span>Ready to simplify your meal payments?</span>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={() => navigate("/mood")}
              className="bg-sosika-cyan hover:bg-sosika-cyan text-black font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-sosika-cyan/20"
            >
              Explore Meals Now
            </button>
          </div>
        </motion.div>
      </motion.div>

      <TopUpWalletModal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} />

      <Navbar />
    </div>
  );
}
