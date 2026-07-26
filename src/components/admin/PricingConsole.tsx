import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { usePlatformConfig, DEFAULT_PLATFORM_CONFIG } from "../../hooks/usePlatformConfig";
import {
  DollarSign,
  Truck,
  Calculator,
  Save,
  CheckCircle,
  RefreshCw,
  Clock,
  Zap,
  Tag
} from "lucide-react";

export default function PricingConsole() {
  const config = usePlatformConfig();

  // Delivery Form State
  const [pricePerKm, setPricePerKm] = useState<number>(DEFAULT_PLATFORM_CONFIG.pricePerKm);
  const [minBaseFee, setMinBaseFee] = useState<number>(DEFAULT_PLATFORM_CONFIG.minBaseFee);
  const [nighttimeSurcharge, setNighttimeSurcharge] = useState<number>(DEFAULT_PLATFORM_CONFIG.nighttimeSurcharge);
  const [asapSurcharge, setAsapSurcharge] = useState<number>(DEFAULT_PLATFORM_CONFIG.asapSurcharge);
  const [roundingUnit, setRoundingUnit] = useState<number>(DEFAULT_PLATFORM_CONFIG.roundingUnit);

  // Service Fee Form State
  const [serviceFee, setServiceFee] = useState<number>(DEFAULT_PLATFORM_CONFIG.serviceFee);

  // Status State
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState("");
  const [serviceSuccess, setServiceSuccess] = useState("");
  const [error, setError] = useState("");

  // Live Simulator Test Inputs
  const [testDistance, setTestDistance] = useState<number>(4.5);
  const [testDeliveryOption, setTestDeliveryOption] = useState<"bodaboda" | "asap" | "free" | "pickup">("bodaboda");
  const [isNighttime, setIsNighttime] = useState<boolean>(false);

  // Sync state when config finishes loading
  useEffect(() => {
    if (config.loaded) {
      setPricePerKm(config.pricePerKm);
      setMinBaseFee(config.minBaseFee);
      setNighttimeSurcharge(config.nighttimeSurcharge);
      setAsapSurcharge(config.asapSurcharge);
      setRoundingUnit(config.roundingUnit);
      setServiceFee(config.serviceFee);
    }
  }, [config.loaded, config.pricePerKm, config.minBaseFee, config.nighttimeSurcharge, config.asapSurcharge, config.roundingUnit, config.serviceFee]);

  // Save Delivery Fee Settings
  const handleSaveDeliveryConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDelivery(true);
    setDeliverySuccess("");
    setError("");

    try {
      await setDoc(
        doc(db, "system_settings", "global"),
        {
          delivery: {
            pricePerKm: Number(pricePerKm) || 0,
            minBaseFee: Number(minBaseFee) || 0,
            nighttimeSurcharge: Number(nighttimeSurcharge) || 0,
            asapSurcharge: Number(asapSurcharge) || 0,
            roundingUnit: Number(roundingUnit) || 100,
          },
          updatedAt: new Date(),
        },
        { merge: true }
      );
      setDeliverySuccess("Delivery fee rules updated successfully!");
      setTimeout(() => setDeliverySuccess(""), 4000);
    } catch (err: any) {
      console.error("Error saving delivery configuration:", err);
      setError("Failed to save delivery fee configuration.");
    } finally {
      setSavingDelivery(false);
    }
  };

  // Save Service Fee Settings
  const handleSaveServiceFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingService(true);
    setServiceSuccess("");
    setError("");

    try {
      await setDoc(
        doc(db, "system_settings", "global"),
        {
          serviceFee: Number(serviceFee) || 0,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      setServiceSuccess("Platform service fee updated successfully!");
      setTimeout(() => setServiceSuccess(""), 4000);
    } catch (err: any) {
      console.error("Error saving service fee:", err);
      setError("Failed to save service fee.");
    } finally {
      setSavingService(false);
    }
  };

  // Live Simulator Calculation Logic
  const calcBase = Math.max(Math.ceil((testDistance || 0) * (pricePerKm || 0)), minBaseFee || 0);
  let simulatedDeliveryFee = 0;
  if (testDeliveryOption === "free" || testDeliveryOption === "pickup") {
    simulatedDeliveryFee = 0;
  } else {
    const fixedSurcharge = testDeliveryOption === "asap" ? (asapSurcharge || 0) : 0;
    const unit = roundingUnit || 100;
    simulatedDeliveryFee = Math.ceil((calcBase + fixedSurcharge) / unit) * unit;
    if (isNighttime) {
      simulatedDeliveryFee += (nighttimeSurcharge || 0);
    }
  }
  const simulatedGrandTotal = 5000 + simulatedDeliveryFee + (serviceFee || 0); // Assuming 5,000 TZS sample food subtotal

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Header Banner */}
      <div className="bg-white/[0.02] border border-white/[0.08] p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] flex items-center justify-center font-bold">
              <DollarSign size={20} />
            </div>
            <h2 className="text-lg font-black text-white tracking-tight">Platform Fee Pricing Engine</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Configure dynamic distance-based delivery tariffs, night surcharges, and order platform service fees in real-time across the application.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-white/[0.03] px-3.5 py-2 rounded-xl border border-white/[0.08]">
          <span className="text-zinc-400">Status:</span>
          {config.loaded ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle size={13} /> Live Sync Active
            </span>
          ) : (
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <RefreshCw size={13} className="animate-spin" /> Loading Rules...
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Delivery Fee Config (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Configuration Form */}
          <form
            onSubmit={handleSaveDeliveryConfig}
            className="bg-white/[0.02] border border-white/[0.08] p-6 rounded-3xl space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Truck size={18} className="text-[#00bfff]" />
                <span>Distance & Delivery Pricing Tariffs</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">system_settings/global.delivery</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Distance Rate */}
              <div className="space-y-1.5 bg-white/[0.02] p-3.5 rounded-2xl border border-white/[0.06]">
                <label className="text-zinc-300 font-bold flex items-center justify-between">
                  <span>Price per KM (TZS)</span>
                  <span className="text-[10px] font-mono text-[#00bfff]">Active: {config.pricePerKm}</span>
                </label>
                <p className="text-[11px] text-zinc-500">Factor multiplied by straight-line distance in kilometers.</p>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={pricePerKm}
                  onChange={(e) => setPricePerKm(Number(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-white outline-none focus:border-[#00bfff] font-mono"
                />
              </div>

              {/* Minimum Base Fee */}
              <div className="space-y-1.5 bg-white/[0.02] p-3.5 rounded-2xl border border-white/[0.06]">
                <label className="text-zinc-300 font-bold flex items-center justify-between">
                  <span>Minimum Base Fee Floor (TZS)</span>
                  <span className="text-[10px] font-mono text-[#00bfff]">Active: {config.minBaseFee}</span>
                </label>
                <p className="text-[11px] text-zinc-500">Minimum delivery charge even for very short distances.</p>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={minBaseFee}
                  onChange={(e) => setMinBaseFee(Number(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-white outline-none focus:border-[#00bfff] font-mono"
                />
              </div>

              {/* Nighttime Surcharge */}
              <div className="space-y-1.5 bg-white/[0.02] p-3.5 rounded-2xl border border-white/[0.06]">
                <label className="text-zinc-300 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-purple-400" />
                    <span>Nighttime Surcharge (TZS)</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#00bfff]">Active: {config.nighttimeSurcharge}</span>
                </label>
                <p className="text-[11px] text-zinc-500">Extra charge applied to orders placed between 19:00 and 06:00.</p>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={nighttimeSurcharge}
                  onChange={(e) => setNighttimeSurcharge(Number(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-white outline-none focus:border-[#00bfff] font-mono"
                />
              </div>

              {/* ASAP Surcharge */}
              <div className="space-y-1.5 bg-white/[0.02] p-3.5 rounded-2xl border border-white/[0.06]">
                <label className="text-zinc-300 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Zap size={13} className="text-amber-400" />
                    <span>ASAP Premium Surcharge (TZS)</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#00bfff]">Active: {config.asapSurcharge}</span>
                </label>
                <p className="text-[11px] text-zinc-500">Flat surcharge added when customer selects ASAP priority delivery.</p>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={asapSurcharge}
                  onChange={(e) => setAsapSurcharge(Number(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-white outline-none focus:border-[#00bfff] font-mono"
                />
              </div>
            </div>

            {/* Rounding Unit */}
            <div className="space-y-1.5 bg-white/[0.02] p-3.5 rounded-2xl border border-white/[0.06] text-xs">
              <label className="text-zinc-300 font-bold flex items-center justify-between">
                <span>Rounding Precision Unit (TZS)</span>
                <span className="text-[10px] font-mono text-[#00bfff]">Active: {config.roundingUnit} TZS</span>
              </label>
              <p className="text-[11px] text-zinc-500">Calculated fee is rounded up to the nearest multiple of this number (e.g. 100).</p>
              <input
                type="number"
                min="10"
                step="10"
                value={roundingUnit}
                onChange={(e) => setRoundingUnit(Number(e.target.value))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-white outline-none focus:border-[#00bfff] font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {deliverySuccess ? (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle size={14} /> {deliverySuccess}
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500">Changes update customer checkouts instantly.</span>
              )}

              <button
                type="submit"
                disabled={savingDelivery}
                className="bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-[#00bfff]/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save size={14} />
                <span>{savingDelivery ? "Saving Rules..." : "Save Delivery Tariff"}</span>
              </button>
            </div>
          </form>

          {/* Platform Service Fee Form */}
          <form
            onSubmit={handleSaveServiceFee}
            className="bg-white/[0.02] border border-white/[0.08] p-6 rounded-3xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Tag size={18} className="text-emerald-400" />
                <span>Platform Service Fee</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">system_settings/global.serviceFee</span>
            </div>

            <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.06] space-y-2 text-xs">
              <label className="text-zinc-300 font-bold flex items-center justify-between">
                <span>Fixed Platform Service Fee per Order (TZS)</span>
                <span className="text-[10px] font-mono text-emerald-400">Active: {config.serviceFee.toLocaleString()} TZS</span>
              </label>
              <p className="text-[11px] text-zinc-500">
                Fixed commission/service fee charged to the customer on every single transaction.
              </p>
              <input
                type="number"
                min="0"
                step="100"
                value={serviceFee}
                onChange={(e) => setServiceFee(Number(e.target.value))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-white outline-none focus:border-emerald-400 font-mono text-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              {serviceSuccess ? (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle size={14} /> {serviceSuccess}
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500">Applied automatically to every checkout cart.</span>
              )}

              <button
                type="submit"
                disabled={savingService}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save size={14} />
                <span>{savingService ? "Saving..." : "Save Service Fee"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Price Simulator (1 col) */}
        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/[0.08] p-6 rounded-3xl space-y-5 sticky top-24">
            <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06] text-sm font-extrabold text-white">
              <Calculator size={18} className="text-[#00bfff]" />
              <span>Live Checkout Fee Simulator</span>
            </div>

            <p className="text-xs text-zinc-400">
              Test how your unsaved or saved rules calculate total fees for customers in real-time.
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Test Distance (KM)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={testDistance}
                  onChange={(e) => setTestDistance(Number(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-white outline-none focus:border-[#00bfff] font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Delivery Channel</label>
                <select
                  value={testDeliveryOption}
                  onChange={(e) => setTestDeliveryOption(e.target.value as any)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-white outline-none focus:border-[#00bfff]"
                >
                  <option value="bodaboda" className="bg-zinc-900">Bodaboda (Standard)</option>
                  <option value="asap" className="bg-zinc-900">ASAP by Sosika (Premium)</option>
                  <option value="free" className="bg-zinc-900">Free Delivery Pass</option>
                  <option value="pickup" className="bg-zinc-900">Self Pickup</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-zinc-300 font-bold">Simulate Nighttime (19:00 - 06:00)</span>
                <input
                  type="checkbox"
                  checked={isNighttime}
                  onChange={(e) => setIsNighttime(e.target.checked)}
                  className="w-4 h-4 accent-[#00bfff] cursor-pointer"
                />
              </div>
            </div>

            {/* Calculation Breakdown Output */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider">
                Simulated Receipt Breakdown
              </div>

              <div className="flex justify-between text-zinc-400">
                <span>Sample Food Subtotal</span>
                <span className="font-mono text-zinc-200">5,000 TZS</span>
              </div>

              <div className="flex justify-between text-zinc-400">
                <span>Calculated Base Distance Fee</span>
                <span className="font-mono text-zinc-200">{calcBase.toLocaleString()} TZS</span>
              </div>

              {testDeliveryOption === "asap" && (
                <div className="flex justify-between text-amber-400">
                  <span>+ ASAP Surcharge</span>
                  <span className="font-mono">+{(asapSurcharge || 0).toLocaleString()} TZS</span>
                </div>
              )}

              {isNighttime && testDeliveryOption !== "free" && testDeliveryOption !== "pickup" && (
                <div className="flex justify-between text-purple-400">
                  <span>+ Nighttime Surcharge</span>
                  <span className="font-mono">+{(nighttimeSurcharge || 0).toLocaleString()} TZS</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-300 font-bold pt-1 border-t border-white/[0.06]">
                <span>Total Delivery Fee</span>
                <span className="font-mono text-[#00bfff]">{simulatedDeliveryFee.toLocaleString()} TZS</span>
              </div>

              <div className="flex justify-between text-zinc-400">
                <span>Platform Service Fee</span>
                <span className="font-mono text-emerald-400">{(serviceFee || 0).toLocaleString()} TZS</span>
              </div>

              <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-white/[0.08]">
                <span>Simulated Order Total</span>
                <span className="font-mono text-emerald-400">{simulatedGrandTotal.toLocaleString()} TZS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
