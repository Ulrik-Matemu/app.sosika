import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../../firebase";
import {
  collection, doc, updateDoc, onSnapshot,
  query, where, addDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";
import {
  Store, Utensils, ShoppingBag, Clock, CheckCircle2,
  XCircle, AlertCircle, Plus, Edit3, Trash2, Loader2, Save, Upload, Eye, EyeOff,
  TrendingUp, Lock, Smartphone, Monitor, MapPin, Phone, LogOut
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";

type TabType = "orders" | "menu" | "profile";

// Helper function to handle asynchronous asset routing directly into Cloudinary endpoints
const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET!);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) throw new Error("Asset transformation pipeline rejected.");
  const data = await response.json();
  return data.secure_url;
};

// Professional Web Audio Chime Synthesizer
const playChime = (ctx: AudioContext) => {
  try {
    const now = ctx.currentTime;

    // Osc 1 - Pure Sine Chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Osc 2 - Harmonizing bell sound (slightly higher and delayed)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.00, now + 0.15); // A5
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.001, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.08, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.85);

    osc2.start(now + 0.1);
    osc2.stop(now + 1.05);
  } catch (e) {
    console.warn("Audio Context playback failed or blocked by autoplay permissions.", e);
  }
};

// Client-Side Environment Detection Helper
// Detects if user is running inside the compiled Android wrapper (Capacitor/TWA/WebView)
// vs. a standard desktop web browser session.
const isAndroidWrapper = (): boolean => {
  if (typeof window === "undefined") return false;
  const isAndroidUA = /Android/i.test(navigator.userAgent);
  const isWebView = /wv/i.test(navigator.userAgent) || (window as any).AndroidInterface;
  return isAndroidUA || isWebView;
};

// Helper to mask sensitive customer data for free-tier vendors
const maskPhoneNumber = (phone: string): string => {
  if (!phone || phone.length < 6) return "🔒 Premium Feature";
  return phone.substring(0, 6) + "******";
};

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("orders");
  const [vendorData, setVendorData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDataFetching, setIsDataFetching] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const vendorId = currentUser?.uid;

  // Audio control loop variables
  const audioContextRef = useRef<AudioContext | null>(null);
  const chimeIntervalRef = useRef<any>(null);
  const [userInteracted, setUserInteracted] = useState(false);
  const [audioBlockedNotification, setAudioBlockedNotification] = useState(false);

  // Track user interaction to unlock browser autoplay limits gracefully
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
      setUserInteracted(true);
      setAudioBlockedNotification(false);
    };

    window.addEventListener("click", initAudio);
    window.addEventListener("keydown", initAudio);
    return () => {
      window.removeEventListener("click", initAudio);
      window.removeEventListener("keydown", initAudio);
    };
  }, []);

  // Watch for pending orders and play looping alert sound if user interacted
  useEffect(() => {
    const hasPending = orders.some((order: any) => order.status === "pending");

    if (hasPending) {
      if (userInteracted) {
        if (audioContextRef.current) {
          if (audioContextRef.current.state === "suspended") {
            audioContextRef.current.resume();
          }
          playChime(audioContextRef.current);
        }

        if (!chimeIntervalRef.current) {
          chimeIntervalRef.current = setInterval(() => {
            if (audioContextRef.current) {
              playChime(audioContextRef.current);
            }
          }, 3000);
        }
      } else {
        setAudioBlockedNotification(true);
      }
    } else {
      if (chimeIntervalRef.current) {
        clearInterval(chimeIntervalRef.current);
        chimeIntervalRef.current = null;
      }
      setAudioBlockedNotification(false);
    }

    return () => {
      if (chimeIntervalRef.current) {
        clearInterval(chimeIntervalRef.current);
        chimeIntervalRef.current = null;
      }
    };
  }, [orders, userInteracted]);

  // 1. Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (!user) {
        // Immediately redirect to vendor authentication portal to prevent mounting loop
        navigate("/vendor-auth");
      } else if (!user.emailVerified) {
        toast({
          title: "Verification Required",
          description: "Please verify your email before accessing the dashboard.",
          variant: "destructive"
        });
        signOut(auth).then(() => navigate("/vendor-auth"));
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 2. Stream Firestore Data once authenticated
  useEffect(() => {
    if (!vendorId) return;

    setIsDataFetching(true);

    // Stream Vendor Context Object
    const unsubVendor = onSnapshot(doc(db, "vendors", vendorId), (docSnap) => {
      if (docSnap.exists()) {
        setVendorData(docSnap.data());
      } else {
        toast({
          title: "Access Denied",
          description: "No vendor profile associated with this account.",
          variant: "destructive"
        });
        signOut(auth).then(() => navigate("/vendor-auth"));
      }
      setIsDataFetching(false);
    }, (error) => {
      console.error("Error streaming vendor data:", error);
      toast({
        title: "Permission Denied",
        description: "You do not have access to this dashboard.",
        variant: "destructive"
      });
      signOut(auth).then(() => navigate("/vendor-auth"));
      setIsDataFetching(false);
    });

    // Stream Live Menu Catalog
    const menuQuery = query(collection(db, "menuItems"), where("vendor_id", "==", vendorId));
    const unsubMenu = onSnapshot(menuQuery, (snap) => {
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Error streaming menu items:", error);
    });

    // Stream Operational Real-time Inbound Tickets
    const ordersQuery = query(
      collection(db, "orders"),
      where("vendor_ids", "array-contains", vendorId)
    );
    const unsubOrders = onSnapshot(ordersQuery, (snap) => {
      const fetchedOrders: any[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      fetchedOrders.sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setOrders(fetchedOrders);
    }, (error) => {
      console.error("Error streaming orders:", error);
    });

    return () => {
      unsubVendor();
      unsubMenu();
      unsubOrders();
    };
  }, [vendorId]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "Successfully ended vendor session." });
      navigate("/vendor-auth");
    } catch (err) {
      toast({ title: "Logout Failed", description: "Could not safely terminate session.", variant: "destructive" });
    }
  };

  const handleGlobalStatusToggle = async () => {
    if (!vendorId || togglingStatus) return;
    setTogglingStatus(true);
    const currentStatus = vendorData?.is_open ?? vendorData?.listing_data?.is_open ?? false;
    try {
      await updateDoc(doc(db, "vendors", vendorId), {
        "is_open": !currentStatus,
        "listing_data.is_open": !currentStatus
      });
      toast({ title: !currentStatus ? "Storefront Online" : "Storefront Offline", description: !currentStatus ? "Accepting live checkout streams." : "Feeds locked safely." });
    } catch (err) {
      toast({ title: "Status sync faulted", variant: "destructive" });
    } finally {
      setTogglingStatus(false);
    }
  };

  if (authLoading || (isDataFetching && !vendorData)) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col items-center justify-center gap-2" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 text-[#00bfff] animate-spin" />
        <span className="text-zinc-500 text-xs tracking-wider">Mounting operational framework...</span>
      </div>
    );
  }

  const isStoreOpen = vendorData?.is_open ?? vendorData?.listing_data?.is_open ?? false;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col lg:flex-row selection:bg-[#00bfff]/20 font-sans antialiased">

      {/* Sidebar Control Module */}
      <aside className="w-full lg:w-64 bg-white/[0.01] border-b lg:border-b-0 lg:border-r border-white/[0.05] p-5 flex flex-col gap-5 shrink-0">
        <div>
          <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            Sosika <span className="text-[#00bfff] font-medium text-xs bg-[#00bfff]/10 px-2 py-0.5 rounded-full">Console</span>
          </h1>
          <p className="text-[11px] text-zinc-500 mt-1 truncate">{vendorData?.name || vendorData?.listing_data?.name || "Operational Spot"}</p>
        </div>

        {/* Dynamic Global Store Channel Control - Moved from configuration sub-tab to central navigation panel */}
        <button
          onClick={handleGlobalStatusToggle}
          disabled={togglingStatus}
          aria-label={isStoreOpen ? "Close marketplace store visibility" : "Open marketplace store visibility"}
          className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition-all ${isStoreOpen
            ? "bg-[#00bfff]/5 border-[#00bfff]/20 text-[#00bfff] hover:bg-[#00bfff]/10"
            : "bg-zinc-800/20 border-white/[0.05] text-zinc-400 hover:bg-zinc-800/40"
            }`}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider">Channel Engine</p>
            <p className="text-xs text-white/80 font-medium">{isStoreOpen ? "Accepting Incoming Orders" : "Store Closed / Offline"}</p>
          </div>
          {togglingStatus ? (
            <Loader2 size={16} className="animate-spin text-zinc-500" />
          ) : isStoreOpen ? (
            <Eye size={16} className="animate-pulse" />
          ) : (
            <EyeOff size={16} />
          )}
        </button>

        {/* System Administration Verification Badges */}
        <div className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${vendorData?.auth_info?.is_approved
          ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400"
          : "bg-amber-500/5 border-amber-500/10 text-amber-400"
          }`}>
          {vendorData?.auth_info?.is_approved ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider">System Approval</p>
            <p className="text-xs text-zinc-400 truncate">{vendorData?.auth_info?.is_approved ? "Live on Marketplace" : "Pending Verification"}</p>
          </div>
        </div>

        {/* Responsive Horizontal / Vertical Navigation Switcher */}
        <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-none" aria-label="Main Navigation">
          {[
            { id: "orders", label: "Live Orders", icon: ShoppingBag, count: orders.length },
            { id: "menu", label: "Menu Catalogue", icon: Utensils, count: menuItems.length },
            { id: "profile", label: "Store Settings", icon: Store, count: null }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${isActive
                  ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/10"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
              >
                <Icon size={16} />
                <span className="mr-auto">{tab.label}</span>
                {tab.count !== null && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${isActive ? "bg-black/20 text-black" : "bg-white/5 text-zinc-400"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all shrink-0 whitespace-nowrap lg:mt-auto border border-red-500/15 bg-red-500/5 cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Framework Content Workspace Container */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl overflow-y-auto w-full">
        {audioBlockedNotification && (
          <div className="mb-6 p-4 bg-[#00bfff]/5 border border-[#00bfff]/20 rounded-2xl flex items-center justify-between text-xs text-[#00bfff] animate-pulse">
            <span className="flex items-center gap-2">
              <AlertCircle size={14} />
              Real-Time Order Chimes: Tap anywhere on the dashboard to enable audio alerts for new orders.
            </span>
          </div>
        )}
        {activeTab === "orders" && <LiveOrdersView orders={orders} vendorId={vendorId!} vendorData={vendorData} />}
        {activeTab === "menu" && <MenuCatalogueView menuItems={menuItems} vendorId={vendorId!} />}
        {activeTab === "profile" && <StoreSettingsView vendorData={vendorData} vendorId={vendorId!} />}
      </main>
    </div>
  );
}

/* ==========================================================================
   1. INBOUND TICKETS AND WORKFLOW DISPATCH VIEW
   ========================================================================== */
function BusinessInsights({ vendorData }: { vendorData: any }) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const hasAnalytics = vendorData?.subscription?.tier === "premium" || vendorData?.subscription?.features_enabled?.analytics === true;

  return (
    <div className="border border-white/[0.05] rounded-2xl bg-white/[0.01] p-6 relative overflow-hidden mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#00bfff]/10 text-[#00bfff]">
              <TrendingUp size={16} />
            </span>
            Advanced Business Insights
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Real-time demand analytics, student ordering peaks, and customer loyalty tracking.</p>
        </div>
        {hasAnalytics && (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-[#00bfff]/10 text-[#00bfff] rounded-md border border-[#00bfff]/20">
            Premium Active
          </span>
        )}
      </div>

      {/* Main Insights Content Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-300 ${!hasAnalytics ? "select-none pointer-events-none filter blur-[2px]" : ""}`}>

        {/* Metric 1: Popular Items */}
        <div className="bg-white/[0.02] border border-white/[0.03] rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Most Popular Items</p>
          <div className="space-y-2">
            {[
              { name: "Swahili Pilau", orders: 142, pct: "85%" },
              { name: "Cheese Burger Combo", orders: 98, pct: "60%" },
              { name: "Spiced Masala Chips", orders: 74, pct: "45%" }
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300 font-medium">{item.name}</span>
                  <span className="text-zinc-400 font-mono">{item.orders} orders</span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#00bfff] to-[#00a8e6] rounded-full" style={{ width: item.pct }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric 2: Peak Hours */}
        <div className="bg-white/[0.02] border border-white/[0.03] rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Peak Ordering Hours</p>
          <div className="flex items-end justify-between h-24 pt-2">
            {[
              { hr: "12 PM", val: "h-[80%]" },
              { hr: "1 PM", val: "h-[100%]" },
              { hr: "2 PM", val: "h-[60%]" },
              { hr: "6 PM", val: "h-[45%]" },
              { hr: "7 PM", val: "h-[75%]" },
              { hr: "8 PM", val: "h-[90%]" }
            ].map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-2.5 bg-white/[0.04] rounded-t-sm h-16 relative flex items-end">
                  <div className={`w-full bg-[#00bfff] rounded-t-sm ${d.val} transition-all`}></div>
                </div>
                <span className="text-[8px] text-zinc-500 font-mono">{d.hr}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metric 3: Customer Retention */}
        <div className="bg-white/[0.02] border border-white/[0.03] rounded-xl p-4 flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Customer Retention Rate</p>
          <div className="flex items-center justify-center py-2 gap-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-white/[0.04]" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-[#00bfff]" strokeDasharray="72, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute text-xs font-mono font-bold text-white">72%</div>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-emerald-400">+4.2%</p>
              <p className="text-[9px] text-zinc-500">vs. last week average</p>
            </div>
          </div>
          <p className="text-[9px] text-zinc-500 text-center">72% of customers order again within 14 days.</p>
        </div>

      </div>

      {/* Free Tier Blurry Glass Overlay — Platform-Aware Upgrade CTA */}
      {!hasAnalytics && (
        <div className="absolute inset-0 bg-[#0a0a0b]/60 backdrop-blur-[6px] flex flex-col items-center justify-center p-6 text-center transition-all duration-300">
          <div className="max-w-md space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] text-[9px] font-black uppercase tracking-widest animate-pulse">
              <Lock size={10} /> Sosika Premium Console
            </div>
            <h4 className="text-sm font-bold text-white">Upgrade to Premium Analytics</h4>

            {isAndroidWrapper() ? (
              /* Android Wrapper: Direct Google Play Billing flow */
              <>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Unlock real-time demand analytics, student ordering peaks, and customer loyalty tracking.
                  Tap below to subscribe via Google Play.
                </p>
                <button
                  onClick={() => {
                    // Trigger native Google Play Billing flow via Android interface bridge
                    if ((window as any).AndroidInterface?.launchSubscription) {
                      (window as any).AndroidInterface.launchSubscription("sosika_vendor_premium:premium_monthly");
                    } else {
                      setShowUpgradeModal(true);
                    }
                  }}
                  className="bg-gradient-to-r from-[#00bfff] to-[#00a8e6] text-black font-bold text-xs px-5 py-2.5 rounded-xl hover:opacity-90 transition-all active:scale-[0.98] pointer-events-auto flex items-center gap-2 mx-auto"
                >
                  <Smartphone size={14} />
                  Subscribe via Google Play
                </button>
              </>
            ) : (
              /* Desktop Web: Direct to mobile app */
              <>
                <div className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 text-left pointer-events-auto">
                  <Monitor size={18} className="text-[#00bfff] shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      <strong className="text-white">Premium Feature:</strong> To unlock deep time-filtered analytics, please open the <strong className="text-[#00bfff]">Sosika Vendor</strong> app on your Android device to manage your subscription via Google Play.
                    </p>
                    <p className="text-[10px] text-zinc-500">Subscription management is handled securely through Google Play Billing.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-[#00bfff] text-xs font-bold hover:underline transition-all pointer-events-auto"
                >
                  Learn how to activate →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Premium Upgrade Explainer Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f0f11] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-[#00bfff]/10 flex items-center justify-center text-[#00bfff] mx-auto">
              <TrendingUp size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Subscribe via Sosika Hub</h3>
              <p className="text-xs text-zinc-400 leading-relaxed text-balance">
                To activate Premium Console features, subscription management runs directly through the Google Play Store billing portal on your <strong className="text-[#00bfff]">Sosika Hub mobile app</strong>.
              </p>
            </div>
            <div className="border border-[#00bfff]/20 bg-[#00bfff]/5 p-3.5 rounded-xl text-center space-y-2">
              <span className="text-[10px] font-bold text-[#00bfff] uppercase tracking-wider block">🚨 Action Required on Mobile</span>
              <p className="text-xs text-zinc-300">
                Play Store subscriptions can <strong className="text-white">only</strong> be processed and managed inside our native Android application.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center bg-white/[0.02] border border-white/[0.05] p-4 rounded-xl gap-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Scan to Open App</p>
              {/* Clean styled QR Code Mock */}
              <div className="w-28 h-28 bg-white p-2.5 rounded-lg flex items-center justify-center relative">
                <div className="w-full h-full border-2 border-black flex flex-wrap justify-between p-0.5 bg-white">
                  <div className="w-6 h-6 border-4 border-black bg-white flex items-center justify-center"><div className="w-2 h-2 bg-black"></div></div>
                  <div className="w-6 h-6 border-4 border-black bg-white flex items-center justify-center"><div className="w-2 h-2 bg-black"></div></div>
                  <div className="w-full flex justify-between h-6 mt-1">
                    <div className="w-4 h-4 bg-black"></div>
                    <div className="w-3 h-3 bg-black"></div>
                    <div className="w-4 h-4 bg-black"></div>
                  </div>
                  <div className="w-6 h-6 border-4 border-black bg-white flex items-center justify-center"><div className="w-2 h-2 bg-black"></div></div>
                  <div className="w-6 h-6 bg-black flex flex-wrap p-0.5"><div className="w-1.5 h-1.5 bg-white"></div><div className="w-1.5 h-1.5 bg-white"></div></div>
                </div>
                <div className="absolute inset-0 m-auto w-5 h-5 bg-black text-[#00bfff] text-[8px] font-black flex items-center justify-center rounded border border-white">
                  SOS
                </div>
              </div>
              <p className="text-[9px] text-[#00bfff] font-mono mt-0.5 hover:underline cursor-pointer">sosika.app/download/vendor</p>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-xl text-center">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">How to activate on mobile:</p>
              <ol className="text-xs text-zinc-300 text-left list-decimal list-inside space-y-1.5 mt-2">
                <li>Open the <strong className="text-white">Sosika Hub</strong> app on your device</li>
                <li>Go to <strong className="text-white">Account &gt; Subscription</strong></li>
                <li>Select the Premium Plan and confirm</li>
              </ol>
            </div>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full bg-white text-black font-bold text-xs py-3 rounded-xl hover:bg-zinc-200 transition-all"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveOrdersView({ orders, vendorId, vendorData }: { orders: any[]; vendorId: string; vendorData: any }) {
  const { toast } = useToast();
  const [historyOpen, setHistoryOpen] = useState(false);

  const updateOrderStatus = async (orderId: string, status: string) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate || !orderToUpdate.vendor_ids?.includes(vendorId)) {
      toast({ title: "Access Denied", description: "You are not authorized to update this order.", variant: "destructive" });
      return;
    }
    try {
      const orderRef = doc(db, "orders", orderId);
      const updates: any = { status };
      if (status === "preparing") updates.acceptedAt = serverTimestamp();
      if (status === "declined") updates.declinedAt = serverTimestamp();
      if (status === "ready_for_pickup") updates.pickedUpAt = serverTimestamp();
      if (status === "delivered") updates.deliveredAt = serverTimestamp();

      await updateDoc(orderRef, updates);
      toast({ title: "Order Pipeline Synced", description: `Order status set to ${status}.` });
    } catch (err) {
      toast({ title: "Execution framework faulted", variant: "destructive" });
    }
  };

  // Filter orders
  const activeOrders = orders.filter(o => o.status === "pending" || o.status === "preparing");
  const pastOrders = orders.filter(o => o.status === "ready_for_pickup" || o.status === "delivered" || o.status === "declined");

  const isFree = vendorData?.subscription?.tier !== "premium";

  const [revenueTimeRange, setRevenueTimeRange] = useState<string>("7d");

  // Helper to parse order dates from various potential Firestore / JS formats
  const parseOrderDate = (order: any): Date | null => {
    const ts = order.timestamp || order.created_at || order.createdAt || order.date || order.acceptedAt;
    if (!ts) return null;
    if (ts.seconds) return new Date(ts.seconds * 1000);
    if (ts instanceof Date) return ts;
    if (typeof ts === "string" || typeof ts === "number") return new Date(ts);
    return null;
  };

  const getFilteredCompletedStats = () => {
    const now = new Date();
    const cutoffDate = new Date();

    if (revenueTimeRange === "24h") {
      cutoffDate.setHours(now.getHours() - 24);
    } else if (revenueTimeRange === "7d") {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (revenueTimeRange === "30d") {
      cutoffDate.setDate(now.getDate() - 30);
    } else if (revenueTimeRange === "90d") {
      cutoffDate.setDate(now.getDate() - 90);
    } else if (revenueTimeRange === "365d") {
      cutoffDate.setDate(now.getDate() - 365);
    }

    const completedFiltered = pastOrders.filter(order => {
      if (order.status !== "delivered" && order.status !== "ready_for_pickup") return false;

      const orderDate = parseOrderDate(order);
      if (!orderDate) return false;
      return orderDate >= cutoffDate;
    });

    const grossRevenue = completedFiltered.reduce((sum, order) => {
      const vendorItems = order.cart?.filter((item: any) => item.vendor_id === vendorId) || [];
      const vendorTotal = vendorItems.reduce((itemSum: number, item: any) => {
        return itemSum + ((item.price || 0) * (item.quantity || 1));
      }, 0);
      return sum + vendorTotal;
    }, 0);

    return {
      count: completedFiltered.length,
      revenue: grossRevenue
    };
  };

  const filteredStats = getFilteredCompletedStats();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Incoming Order Engine</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Accept, prepare, or safely decline production delivery requests.</p>
      </div>

      {/* Free User Metric Cards */}
      {isFree && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 relative overflow-hidden group hover:border-[#00bfff]/30 transition-all flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#00bfff]/5 rounded-full blur-2xl group-hover:bg-[#00bfff]/10 transition-all"></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Completed Orders</p>
              <p className="text-[9px] text-[#00bfff] font-medium uppercase tracking-wider mt-0.5">
                {revenueTimeRange === "24h" ? "Past 24 Hours" :
                  revenueTimeRange === "7d" ? "Past 7 Days" :
                    revenueTimeRange === "30d" ? "Past 30 Days" :
                      revenueTimeRange === "90d" ? "Past 90 Days" : "Past 365 Days"}
              </p>
            </div>
            <div className="flex items-baseline gap-2 mt-4 z-10">
              <p className="text-3xl font-black text-white">{filteredStats.count}</p>
              <span className="text-xs text-emerald-400 font-medium ml-1">processed</span>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1 z-10">Refreshes automatically based on selected range.</p>
          </div>

          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 relative overflow-hidden group hover:border-[#00bfff]/30 transition-all flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#00bfff]/5 rounded-full blur-2xl group-hover:bg-[#00bfff]/10 transition-all"></div>
            <div className="flex justify-between items-start z-10 w-full">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Gross Revenue</p>
                <p className="text-[9px] text-[#00bfff] font-medium uppercase tracking-wider mt-0.5">
                  {revenueTimeRange === "24h" ? "Past 24 Hours" :
                    revenueTimeRange === "7d" ? "Past 7 Days" :
                      revenueTimeRange === "30d" ? "Past 30 Days" :
                        revenueTimeRange === "90d" ? "Past 90 Days" : "Past 365 Days"}
                </p>
              </div>
              <select
                value={revenueTimeRange}
                onChange={(e) => setRevenueTimeRange(e.target.value)}
                className="bg-[#0f0f11] border border-white/[0.08] text-zinc-400 hover:text-white rounded-lg text-[10px] font-bold py-1 px-2.5 outline-none cursor-pointer focus:border-[#00bfff]/40 transition-all"
              >
                <option value="24h">24 Hours</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="90d">90 Days</option>
                <option value="365d">365 Days</option>
              </select>
            </div>
            <div className="flex items-baseline gap-2 mt-4 z-10">
              <p className="text-3xl font-black text-[#00bfff] font-mono">{filteredStats.revenue.toLocaleString()}</p>
              <span className="text-[10px] text-zinc-400 font-bold ml-1">TZS</span>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1 z-10">Calculated client-side from completed tickets.</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00bfff] animate-pulse"></span>
          Active Tickets ({activeOrders.length})
        </h3>

        <div className="grid gap-4">
          {activeOrders.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-white/[0.05] rounded-2xl text-zinc-500 text-sm">
              No active production tickets found in database stream pipelines.
            </div>
          ) : (
            activeOrders.map((order) => {
              const myItems = order.cart?.filter((item: any) => item.vendor_id === vendorId) || [];
              const hasExtendedInfo = vendorData?.subscription?.tier === "premium" || vendorData?.subscription?.features_enabled?.extended_customer_info === true;

              return (
                <div key={order.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5 flex flex-col gap-4">
                  {/* Order Header */}
                  <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                    <div className="space-y-2 w-full md:w-auto">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-zinc-400">{order.orderId || order.id?.substring(0, 8)}</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${order.status === "pending" ? "bg-amber-500/10 text-amber-400 animate-pulse" :
                          order.status === "preparing" ? "bg-blue-500/10 text-blue-400 animate-pulse" :
                            order.status === "declined" ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                          }`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="space-y-1 bg-white/[0.01] p-3 rounded-lg border border-white/[0.02]">
                        {myItems.map((item: any, i: number) => (
                          <p key={i} className="text-xs text-zinc-300">
                            <span className="text-[#00bfff] font-bold font-mono mr-1">{item.quantity}x</span> {item.name}
                          </p>
                        ))}
                      </div>

                      <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 pt-1">
                        <Clock size={12} /> Mode: <span className="text-zinc-300 font-medium">{order.deliveryOption || "Standard Delivery"}</span>
                      </p>
                    </div>

                    <div className="flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end gap-3 w-full md:w-auto border-t md:border-t-0 border-white/[0.05] pt-3 md:pt-0 shrink-0">
                      <p className="text-sm font-bold text-white font-mono">{order.totalAmount?.toLocaleString()} TZS</p>
                      <div className="flex gap-2 w-full md:w-auto">
                        {order.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateOrderStatus(order.id, "preparing")}
                              className="flex-1 md:flex-initial bg-white text-black font-bold text-xs px-3.5 py-2 rounded-lg hover:bg-zinc-200 transition-all active:scale-[0.98]"
                            >
                              Accept Ticket
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.id, "declined")}
                              className="p-2 text-zinc-400 hover:text-red-400 bg-white/[0.02] border border-white/[0.05] rounded-lg transition-all"
                              aria-label="Decline transaction request"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {order.status === "preparing" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "ready_for_pickup")}
                            className="w-full md:w-auto bg-gradient-to-r from-[#00bfff] to-[#00a8e6] text-black font-bold text-xs px-4 py-2 rounded-lg transition-all active:scale-[0.98]"
                          >
                            Ready for Dispatch
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Customer Contact & Location Info — Gated by extended_customer_info */}
                  <div className="border-t border-white/[0.03] pt-3 space-y-2">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-zinc-500" />
                        {hasExtendedInfo ? (
                          <span className="text-xs text-zinc-300 font-mono font-medium">{order.phone || order.customer_phone || "N/A"}</span>
                        ) : (
                          <span className="text-xs text-zinc-500 font-mono">{maskPhoneNumber(order.phone || order.customer_phone || "")}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-zinc-500" />
                        {hasExtendedInfo ? (
                          order.locationCoords && order.locationCoords !== "N/A" ? (
                            <a
                              href={`https://www.google.com/maps?q=${order.locationCoords}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#00bfff] font-medium hover:underline transition-all"
                            >
                              {order.displayLocation || "Open in Maps"}
                            </a>
                          ) : (
                            <span className="text-xs text-zinc-400">{order.displayLocation || "N/A"}</span>
                          )
                        ) : (
                          <span className="text-xs text-zinc-500">🔒 Premium Feature</span>
                        )}
                      </div>
                    </div>
                    {!hasExtendedInfo && (
                      <p className="text-[10px] text-zinc-600 leading-relaxed">
                        {isAndroidWrapper()
                          ? "Upgrade to Premium to reveal full customer contact info and delivery coordinates."
                          : "Open the Sosika Vendor app on Android to upgrade and reveal full buyer details."
                        }
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Collapsible Order History Subsection */}
      <div className="border border-white/[0.05] rounded-2xl bg-white/[0.01] overflow-hidden">
        <button
          type="button"
          onClick={() => setHistoryOpen(!historyOpen)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-all"
        >
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock size={16} className="text-[#00bfff]" /> Order History
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">View previously processed, dispatched, or declined orders ({pastOrders.length}).</p>
          </div>
          <span className="text-xs text-zinc-400 font-bold bg-white/5 px-2.5 py-1 rounded-lg">
            {historyOpen ? "Hide" : "Show"}
          </span>
        </button>

        {historyOpen && (
          <div className="p-5 border-t border-white/[0.05] space-y-3">
            {pastOrders.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">No past orders in history.</p>
            ) : (
              pastOrders.map((order) => {
                const myItems = order.cart?.filter((item: any) => item.vendor_id === vendorId) || [];
                return (
                  <div key={order.id} className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-4 flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-zinc-400">{order.orderId || order.id?.substring(0, 8)}</span>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${order.status === "delivered" ? "bg-emerald-500/10 text-emerald-400" :
                          order.status === "ready_for_pickup" ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"
                          }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="pl-1">
                        {myItems.map((item: any, i: number) => (
                          <p key={i} className="text-[11px] text-zinc-400">
                            {item.quantity}x {item.name}
                          </p>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs font-mono font-bold text-zinc-300">{order.totalAmount?.toLocaleString()} TZS</p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Business Insights Block */}
      <BusinessInsights vendorData={vendorData} />
    </div>
  );
}

/* ==========================================================================
   2. MENU CATALOGUE CRUD ARCHITECTURE (WITH CLOUDINARY INTEGRATION)
   ========================================================================== */
function MenuCatalogueView({ menuItems, vendorId }: { menuItems: any[]; vendorId: string }) {
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "", price: "", category: "", description: "", is_available: true, image_url: ""
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ name: "", price: "", category: "Mains", description: "", is_available: true, image_url: "/" });
    setShowForm(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name, price: item.price.toString(),
      category: item.category, description: item.description || "",
      is_available: item.is_available ?? true, image_url: item.image_url || "/"
    });
    setShowForm(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadToCloudinary(file);
      setFormData(prev => ({ ...prev, image_url: url }));
      toast({ title: "Asset Processed", description: "Image linked to catalog item buffer." });
    } catch (err) {
      toast({ title: "Asset link fault", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingImage) return;

    const payload = {
      name: formData.name,
      price: Number(formData.price),
      category: formData.category,
      description: formData.description,
      is_available: formData.is_available,
      vendor_id: vendorId,
      image_url: formData.image_url || "/"
    };

    try {
      if (editingItem) {
        if (editingItem.vendor_id !== vendorId) {
          toast({ title: "Access Denied", description: "You are not authorized to update this item.", variant: "destructive" });
          return;
        }
        await updateDoc(doc(db, "menuItems", editingItem.id), payload);
        toast({ title: "Catalog updated", description: "Reference adjusted securely." });
      } else {
        await addDoc(collection(db, "menuItems"), { ...payload, created_at: serverTimestamp() });
        toast({ title: "Catalog insertion completed", description: "Menu entry is now live globally." });
      }
      setShowForm(false);
    } catch (err) {
      toast({ title: "Transaction process failure", variant: "destructive" });
    }
  };

  const handleDeleteItem = async (id: string) => {
    const itemToDelete = menuItems.find(item => item.id === id);
    if (!itemToDelete || itemToDelete.vendor_id !== vendorId) {
      toast({ title: "Access Denied", description: "You are not authorized to delete this item.", variant: "destructive" });
      return;
    }
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    try {
      await deleteDoc(doc(db, "menuItems", id));
      toast({ title: "Asset purged", description: "Removed entry reference safely." });
    } catch (err) {
      toast({ title: "Purge routine faulted", variant: "destructive" });
    }
  };

  const handleToggleAvailability = async (id: string, currentVal: boolean) => {
    const itemToToggle = menuItems.find(item => item.id === id);
    if (!itemToToggle || itemToToggle.vendor_id !== vendorId) {
      toast({ title: "Access Denied", description: "You are not authorized to update this item.", variant: "destructive" });
      return;
    }
    setTogglingId(id);
    try {
      await updateDoc(doc(db, "menuItems", id), {
        is_available: !currentVal
      });
      toast({
        title: !currentVal ? "Item Available" : "Item Unavailable",
        description: "Availability updated successfully."
      });
    } catch (err) {
      toast({ title: "Failed to update availability", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Menu Catalogue</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Configure availability schemas and pricing metrics.</p>
        </div>
        {!showForm && (
          <button onClick={handleOpenCreate} className="bg-[#00bfff] text-black font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 hover:bg-[#00a8e6] transition-all active:scale-[0.98]">
            <Plus size={14} /> Add Menu Item
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSaveItem} className="bg-white/[0.01] border border-white/[0.05] p-5 rounded-xl space-y-4 max-w-md">
          <h3 className="text-sm font-bold text-white">{editingItem ? "Edit Catalogue Reference" : "Create New Catalogue Entry"}</h3>

          {/* Asynchronous Image Loader Block */}
          <div className="space-y-2">
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block">Item Cover Image</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-white/[0.08] overflow-hidden flex items-center justify-center shrink-0">
                {formData.image_url && formData.image_url !== "/" ? (
                  <img src={formData.image_url} alt="Buffer Preview" className="w-full h-full object-cover" />
                ) : (
                  <Utensils size={18} className="text-zinc-600" />
                )}
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="item-img-upload" />
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-300 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all disabled:opacity-40"
              >
                {uploadingImage ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Upload Image
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <input type="text" required placeholder="Item Name (e.g. Swahili Pilau)" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl py-3 px-4 text-xs outline-none focus:border-[#00bfff]/40" />
          </div>

          <div className="space-y-1">
            <input type="number" required placeholder="Price in TZS" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl py-3 px-4 text-xs outline-none focus:border-[#00bfff]/40" />
          </div>

          <div className="space-y-1">
            <input type="text" required placeholder="Category (e.g. Burgers, Drinks, Swahili)" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl py-3 px-4 text-xs outline-none focus:border-[#00bfff]/40" />
          </div>

          <div className="space-y-1">
            <textarea placeholder="Ingredients and details..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full h-20 bg-white/[0.02] border border-white/[0.08] rounded-xl py-2.5 px-4 text-xs outline-none focus:border-[#00bfff]/40 resize-none" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="avail" checked={formData.is_available} onChange={e => setFormData({ ...formData, is_available: e.target.checked })} className="rounded h-4 w-4 accent-[#00bfff]" />
            <label htmlFor="avail" className="text-xs text-zinc-400 select-none">Available immediately for checkout processing</label>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={uploadingImage} className="flex-1 bg-white text-black font-bold py-3 rounded-xl text-xs hover:bg-zinc-200 transition-all disabled:opacity-50">Save Reference</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 bg-white/[0.04] rounded-xl text-xs text-zinc-400 hover:text-white transition-all">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="grid gap-3">
          {menuItems.map((item) => {
            const isAvailable = item.is_available !== false;
            return (
              <div key={item.id} className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-white/[0.05] flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {item.image_url && item.image_url !== "/" ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Utensils size={14} className="text-zinc-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                      <span className="text-[9px] bg-white/[0.04] text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">{item.category}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate max-w-xs sm:max-w-md mt-0.5">{item.description || "No metadata description configured."}</p>
                    <p className="text-xs font-bold text-[#00bfff] font-mono mt-0.5">{item.price?.toLocaleString()} TZS</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Inline Quick-Stock Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(item.id, isAvailable)}
                    disabled={togglingId === item.id}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${isAvailable
                      ? "bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 hover:bg-emerald-500/15"
                      : "bg-zinc-800/40 text-zinc-500 border border-white/[0.05] hover:bg-zinc-800/70"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`}></span>
                    {isAvailable ? "In Stock" : "Out of Stock"}
                  </button>

                  <div className="flex gap-1">
                    <button onClick={() => handleOpenEdit(item)} className="p-2 text-zinc-400 hover:text-white bg-white/[0.02] rounded-lg border border-white/[0.05] transition-all" aria-label="Edit item">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-zinc-500 hover:text-red-400 bg-white/[0.02] rounded-lg border border-white/[0.05] transition-all" aria-label="Delete item">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   3. STORE SETTINGS SUB-VIEW (DUAL SCHEMA NORMALIZATION WRITER)
   ========================================================================== */
function StoreSettingsView({ vendorData, vendorId }: { vendorData: any; vendorId: string }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Buffer States synced safely with legacy and onboarding maps
  const [spotName, setSpotName] = useState(vendorData?.name || vendorData?.listing_data?.name || "");
  const [shortDesc, setShortDesc] = useState(vendorData?.short_description || "");
  const [fullDesc, setFullDesc] = useState(vendorData?.full_description || "");
  const [openingHours, setOpeningHours] = useState(vendorData?.opening_hours || vendorData?.listing_data?.opening_hours || "");
  const [coverUrl, setCoverUrl] = useState(vendorData?.cover_image_url || "/");

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadToCloudinary(file);
      setCoverUrl(url);
      toast({ title: "Cover Image Rendered", description: "New URL linked into setup form arrays successfully." });
    } catch (err) {
      toast({ title: "Asset loading failed", variant: "destructive" });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      // DUAL SCHEMA ALIGNMENT: Updates fields at root level and listing_data nested maps simultaneously
      // to support both live client-side matching loops and dashboard interfaces.
      await updateDoc(doc(db, "vendors", vendorId), {
        "name": spotName,
        "short_description": shortDesc,
        "full_description": fullDesc,
        "opening_hours": openingHours,
        "cover_image_url": coverUrl,

        // Synced Nested Target Structures
        "listing_data.name": spotName,
        "listing_data.short_description": shortDesc,
        "listing_data.full_description": fullDesc,
        "listing_data.opening_hours": openingHours,
        "listing_data.cover_image_url": coverUrl,
      });
      toast({ title: "Configuration Updated", description: "Operational profile adjusted correctly." });
    } catch (err) {
      toast({ title: "Adjustment Faulted", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md animate-in fade-in duration-200" aria-label="Store Settings Interface">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Store Settings</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Modify storefront branding assets and metadata details dynamically.</p>
      </div>

      <form onSubmit={handleUpdateStore} className="space-y-4">

        {/* Dynamic Cover Asset Selector */}
        <div className="space-y-2">
          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block">Brand Banner / Cover Image</label>
          <div className="relative h-28 w-full bg-zinc-800 border border-white/[0.06] rounded-xl overflow-hidden flex items-center justify-center group">
            {coverUrl && coverUrl !== "/" ? (
              <img src={coverUrl} alt="Store Banner Preview" className="w-full h-full object-cover group-hover:opacity-70 transition-opacity" />
            ) : (
              <Store size={24} className="text-zinc-600" />
            )}
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleCoverUpload} className="hidden" />
            <button
              type="button"
              disabled={uploadingCover}
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 m-auto w-fit h-fit bg-black/60 text-white border border-white/10 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
            >
              {uploadingCover ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              Change Cover Asset
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Spot Listing Name</label>
          <input
            type="text"
            required
            value={spotName}
            onChange={e => setSpotName(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl py-3 px-4 text-xs outline-none focus:border-[#00bfff]/40 transition-all text-white font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Opening Schedule</label>
          <input
            type="text"
            required
            placeholder="e.g., Daily: 09:00 AM - 10:00 PM"
            value={openingHours}
            onChange={e => setOpeningHours(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl py-3 px-4 text-xs outline-none focus:border-[#00bfff]/40 transition-all text-white font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Short Feed Card Subtitle</label>
          <input
            type="text"
            value={shortDesc}
            onChange={e => setShortDesc(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl py-3 px-4 text-xs outline-none focus:border-[#00bfff]/40 transition-all text-white font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Full Showcase Overview Description</label>
          <textarea
            value={fullDesc}
            onChange={e => setFullDesc(e.target.value)}
            className="w-full h-24 bg-white/[0.02] border border-white/[0.08] rounded-xl py-2.5 px-4 text-xs outline-none focus:border-[#00bfff]/40 transition-all text-white font-medium resize-none"
          />
        </div>

        <button type="submit" disabled={updating || uploadingCover} className="w-full bg-white text-black font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all disabled:opacity-40 active:scale-[0.99]">
          {updating ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Commit Settings Changes</>}
        </button>
      </form>
    </div>
  );
}