import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
    <div className="border border-white/[0.08] rounded-2xl bg-white/[0.02] overflow-hidden transition-colors hover:border-white/20">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left text-sm font-bold text-white hover:text-[#00bfff] transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-[#00bfff]">{icon}</span>}
          <span>{title}</span>
        </div>
        <ChevronDown
          size={18}
          className={`text-zinc-400 transition-transform duration-300 ${
            isOpen ? "rotate-180 text-[#00bfff]" : ""
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
            <div className="p-4 pt-0 text-xs text-zinc-400 leading-relaxed border-t border-white/[0.04] space-y-2 mt-2">
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
  const [openTermsIndex, setOpenTermsIndex] = useState<number | null>(1); // Default open Refunds section

  const toggleTerms = (index: number) => {
    setOpenTermsIndex(openTermsIndex === index ? null : index);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  const benefits = [
    {
      icon: <Zap size={22} className="text-[#00bfff]" />,
      title: "Instant One-Tap Checkout",
      description:
        "No waiting for M-Pesa USSD prompts or searching for loose cash. Place orders in seconds flat with zero payment lag."
    },
    {
      icon: <GraduationCap size={22} className="text-[#00bfff]" />,
      title: "Built for Campus Life",
      description:
        "Budget your weekly meal money into Sosika Cash. Keep funds safe from accidental spending and guarantee warm meals during exam weeks."
    },
    {
      icon: <Truck size={22} className="text-emerald-400" />,
      title: "Full Delivery Coverage",
      description:
        "Sosika Cash pays for both your favorite meals and rider delivery fees seamlessly from a single unified wallet balance."
    },
    {
      icon: <ShieldCheck size={22} className="text-emerald-400" />,
      title: "Protected & Escrow-Safe",
      description:
        "Your money is safely locked in Sosika's encrypted system. If an order fails, funds stay safe in your account."
    },
    {
      icon: <Camera size={22} className="text-amber-400" />,
      title: "Snap & Earn Rewards",
      description:
        "Earn instant Sosika Cash top-ups (TZS 1,000 per approved photo) whenever you post food reviews and photo updates."
    },
    {
      icon: <PiggyBank size={22} className="text-amber-400" />,
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
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-[#00bfff]/30 pb-28">
      <Helmet>
        <title>Sosika Cash — Digital Wallet & Benefits</title>
        <meta
          name="description"
          content="Learn how Sosika Cash simplifies meal payments, covers delivery fees, and helps campus students budget effortlessly."
        />
      </Helmet>

      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3.5 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-full"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
            Sosika Cash v1.0
          </span>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-2xl mx-auto px-4 pt-8 space-y-10"
      >
        {/* HERO SECTION */}
        <motion.div variants={itemVariants} className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-[#00bfff]/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#00bfff]/20 via-zinc-900 to-black border border-[#00bfff]/40 flex items-center justify-center text-[#00bfff] shadow-2xl shadow-[#00bfff]/20">
              <Wallet size={38} />
            </div>
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-[#00bfff]/10 text-[#00bfff] border border-[#00bfff]/20">
              <Zap size={12} />
              <span>Smart Digital Wallet</span>
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Sosika <span className="text-[#00bfff]">Cash</span>
            </h1>
            <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
              The effortless way to pay for campus meals, late-night snacks, and delivery fees without handling physical money or network delays.
            </p>
          </div>
        </motion.div>

        {/* LIPA NAMBA CARD */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#00bfff]/10 via-zinc-900/90 to-black border border-[#00bfff]/30 p-5 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-[#00bfff]" />
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                Official Lipa Namba
              </span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
              0% Fee Top-Up
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                M-Pesa Merchant Till
              </div>
              <div className="text-2xl font-black font-mono tracking-widest text-[#00bfff] mt-0.5">
                353438054
              </div>
              <div className="text-xs font-semibold text-zinc-400">
                LIPA SOSIKA STORE
              </div>
            </div>

            <a
              href="https://wa.me/255760903468?text=Habari%20Sosika,%20naomba%20kuweka%20pesa%20kwenye%20Sosika%20Cash%20wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#00bfff]/20"
            >
              <MessageCircle size={15} />
              <span>Top-Up via WhatsApp</span>
            </a>
          </div>
        </motion.div>

        {/* WHY SOSIKA CASH (BENEFITS GRID) */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-extrabold text-white">Why Use Sosika Cash?</h2>
            <p className="text-xs text-zinc-400">Designed specifically to give you total control over food spending.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {benefits.map((benefit, idx) => (
              <div
                key={idx}
                className="bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] p-4 rounded-2xl space-y-2.5 transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-white/[0.04] w-fit border border-white/[0.08] group-hover:scale-105 transition-transform">
                  {benefit.icon}
                </div>
                <h3 className="text-xs font-extrabold text-white group-hover:text-[#00bfff] transition-colors">
                  {benefit.title}
                </h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* HOW IT WORKS */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-extrabold text-white">3 Simple Steps</h2>
            <p className="text-xs text-zinc-400">Get your digital wallet funded in under 60 seconds.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="relative bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl space-y-2"
              >
                <span className="text-2xl font-black font-mono text-[#00bfff]/30 block">
                  {step.number}
                </span>
                <h3 className="text-xs font-bold text-white">{step.title}</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CAMPUS LIFE FEATURED BANNER dns */}
        <motion.div
          variants={itemVariants}
          className="rounded-3xl bg-gradient-to-br from-purple-500/10 via-zinc-900 to-black border border-purple-500/20 p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <GraduationCap size={20} className="text-purple-400" />
            <span className="text-xs font-extrabold text-purple-300 uppercase tracking-wider">
              Campus Special Feature
            </span>
          </div>
          <h3 className="text-sm font-extrabold text-white">
            Smart Meal Budgeting for University Students
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Never run out of food money midway through the semester. Deposit your weekly food budget directly into Sosika Cash. It guarantees that even during hectic study or exam periods, your food and delivery fees are 100% pre-secured.
          </p>
        </motion.div>

        {/* TERMS & CONDITIONS ACCORDION */}
        <motion.div variants={itemVariants} className="space-y-4 pt-4 border-t border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <HelpCircle size={18} className="text-[#00bfff]" />
                <span>Terms, Conditions & Refunds</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
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
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium mb-2">
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
          className="text-center p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] space-y-3"
        >
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-bold">
            <CheckCircle2 size={16} />
            <span>Ready to simplify your meal payments?</span>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={() => navigate("/mood")}
              className="bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#00bfff]/20"
            >
              Explore Meals Now
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
