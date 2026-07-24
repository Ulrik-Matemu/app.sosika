import { useState } from "react";
import AdminLogin from "../../components/my-components/AdminLogin";
import OverviewMetrics from "../../components/admin/OverviewMetrics";
import LiveOrdersConsole from "../../components/admin/LiveOrdersConsole";
import VendorManager from "../../components/admin/VendorManager";
import PhotoModerationConsole from "../../components/admin/PhotoModerationConsole";
import WalletConsole from "../../components/admin/WalletConsole";
import {
  LayoutDashboard,
  Package,
  Store,
  Camera,
  Wallet,
  LogOut,
  ShieldCheck
} from "lucide-react";

type AdminTab = "overview" | "orders" | "vendors" | "photos" | "wallet";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-sans antialiased pb-24">
      {/* Admin Top Sticky Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0b]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand & Auth Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] flex items-center justify-center font-bold">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight">Sosika Control</h1>
                <span className="text-[10px] font-mono font-bold bg-[#00bfff]/20 text-[#00bfff] px-2 py-0.5 rounded-full border border-[#00bfff]/30 uppercase">
                  System Admin
                </span>
              </div>
              <p className="text-xs text-zinc-400">Platform Command Center & Live Operations</p>
            </div>
          </div>

          {/* Module Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.08] overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "overview"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <LayoutDashboard size={15} />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "orders"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Package size={15} />
              <span>Live Orders</span>
            </button>

            <button
              onClick={() => setActiveTab("vendors")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "vendors"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Store size={15} />
              <span>Vendors</span>
            </button>

            <button
              onClick={() => setActiveTab("photos")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "photos"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Camera size={15} />
              <span>Photo Rewards</span>
            </button>

            <button
              onClick={() => setActiveTab("wallet")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "wallet"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Wallet size={15} />
              <span>Wallet Console</span>
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => setIsAuthenticated(false)}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {activeTab === "overview" && <OverviewMetrics />}
        {activeTab === "orders" && <LiveOrdersConsole />}
        {activeTab === "vendors" && <VendorManager />}
        {activeTab === "photos" && <PhotoModerationConsole />}
        {activeTab === "wallet" && <WalletConsole />}
      </main>
    </div>
  );
}