import { useState } from "react";
import AdminLogin from "../../components/my-components/AdminLogin";
import OverviewMetrics from "../../components/admin/OverviewMetrics";
import LiveOrdersConsole from "../../components/admin/LiveOrdersConsole";
import VendorManager from "../../components/admin/VendorManager";
import PhotoModerationConsole from "../../components/admin/PhotoModerationConsole";
import WalletConsole from "../../components/admin/WalletConsole";
import FreeDeliveryManager from "../../components/admin/FreeDeliveryManager";
import GeoInsightsConsole from "../../components/admin/GeoInsightsConsole";
import PricingConsole from "../../components/admin/PricingConsole";
import MenuItemManager from "../../components/admin/MenuItemManager";
import { FeaturedItemsManager } from "../../components/admin/FeaturedItemsManager";
import { PromotionsManager } from "../../components/admin/PromotionsManager";
import {
  LayoutDashboard,
  Package,
  Store,
  Camera,
  Wallet,
  Gift,
  Compass,
  LogOut,
  ShieldCheck,
  DollarSign,
  UtensilsCrossed,
  Flame,
  Megaphone,
} from "lucide-react";

type AdminTab = "overview" | "orders" | "vendors" | "menu" | "featured" | "promotions" | "pricing" | "geomap" | "freepass" | "photos" | "wallet";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-sans antialiased pb-24">
      {/* Admin Top Sticky Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0b]/95 backdrop-blur-xl border-b border-white/[0.08] px-3 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          {/* Top Row: Brand & Lock Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] flex items-center justify-center font-bold shrink-0">
                <ShieldCheck size={20} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate">Sosika Control</h1>
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-[#00bfff]/20 text-[#00bfff] px-2 py-0.5 rounded-full border border-[#00bfff]/30 uppercase shrink-0">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-400 truncate">Platform Command Center & Operations</p>
              </div>
            </div>

            {/* Lock Button */}
            <button
              onClick={() => setIsAuthenticated(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all cursor-pointer shrink-0"
              title="Lock Admin Console"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Lock Session</span>
            </button>
          </div>

          {/* Bottom Row: Module Tab Switcher with Scroll */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.08] overflow-x-auto max-w-full scrollbar-none">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "overview"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <LayoutDashboard size={14} />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "orders"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Package size={14} />
              <span>Live Orders</span>
            </button>

            <button
              onClick={() => setActiveTab("vendors")}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "vendors"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Store size={14} />
              <span>Vendors</span>
            </button>

            <button
              onClick={() => setActiveTab("menu")}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "menu"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <UtensilsCrossed size={14} />
              <span>Menu Items</span>
            </button>

            <button
              onClick={() => setActiveTab("featured")}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "featured"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Flame size={14} />
              <span>Featured Picks</span>
            </button>

            <button
              onClick={() => setActiveTab("promotions")}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "promotions"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Megaphone size={14} />
              <span>Promotions</span>
            </button>

            <button
              onClick={() => setActiveTab("pricing")}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "pricing"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <DollarSign size={14} />
              <span>Pricing Tariffs</span>
            </button>

            <button
              onClick={() => setActiveTab("geomap")}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "geomap"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Compass size={14} />
              <span>Geo Map</span>
            </button>

            <button
              onClick={() => setActiveTab("freepass")}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "freepass"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Gift size={14} />
              <span>Free Delivery</span>
            </button>

            <button
              onClick={() => setActiveTab("photos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "photos"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Camera size={14} />
              <span>Photo Rewards</span>
            </button>

            <button
              onClick={() => setActiveTab("wallet")}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "wallet"
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Wallet size={14} />
              <span>Wallet Console</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {activeTab === "overview" && <OverviewMetrics />}
        {activeTab === "orders" && <LiveOrdersConsole />}
        {activeTab === "vendors" && <VendorManager />}
        {activeTab === "menu" && <MenuItemManager />}
        {activeTab === "featured" && <FeaturedItemsManager />}
        {activeTab === "promotions" && <PromotionsManager />}
        {activeTab === "pricing" && <PricingConsole />}
        {activeTab === "geomap" && <GeoInsightsConsole />}
        {activeTab === "freepass" && <FreeDeliveryManager />}
        {activeTab === "photos" && <PhotoModerationConsole />}
        {activeTab === "wallet" && <WalletConsole />}
      </main>
    </div>
  );
}