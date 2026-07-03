import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "../../firebase";
import {
  collection, doc, updateDoc, onSnapshot,
  query, where, addDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";
import {
  Store, Utensils, ShoppingBag, Clock, CheckCircle2,
  XCircle, AlertCircle, Plus, Edit3, Trash2, Loader2, Save, Upload, Eye, EyeOff,
  TrendingUp, Lock, Smartphone, Monitor, MapPin, Phone, LogOut,
  Sun, Moon, Menu, ChevronLeft, ChevronRight, X, MessageSquare,
  LifeBuoy, Mail, Send, History, Sparkles, LocateFixed, Search
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { usePlayBilling } from "./usePlayBilling";
import { uploadToCloudinary } from "../../services/cloudinary";
import { GoogleMap, Autocomplete } from "@react-google-maps/api";
import { useMapLoader } from "../../services/map-provider";

type TabType = "orders" | "menu" | "profile" | "support";

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

interface TourStep {
  targetId: string;
  tab: TabType;
  title: string;
  description: string;
}

const tourSteps: TourStep[] = [
  {
    targetId: "walkthrough-welcome",
    tab: "orders",
    title: "Welcome to your Partner Console!",
    description: "This console helps you manage orders, customize your menu, and grow your student kitchen. Let's do a quick 1-minute tour."
  },
  {
    targetId: "walkthrough-channel-engine",
    tab: "orders",
    title: "Channel Engine Status Toggle",
    description: "Toggle this online to start receiving orders on the student app, or offline when your kitchen is closed."
  },
  {
    targetId: "walkthrough-orders-list",
    tab: "orders",
    title: "Live Order Pipeline",
    description: "Active orders and incoming requests land here in real-time. Review detail panels, accept, or dispatch orders here."
  },
  {
    targetId: "walkthrough-nav-menu",
    tab: "menu",
    title: "Menu Catalog Manager",
    description: "Switch to this tab to add dishes, adjust pricing, and toggle in-stock/out-of-stock items dynamically."
  },
  {
    targetId: "walkthrough-nav-profile",
    tab: "profile",
    title: "Store Settings & Map Customization",
    description: "Head here to customize your kitchen banner, hours, short details, and pinpoint your exact location on the map."
  },
  {
    targetId: "walkthrough-nav-support",
    tab: "support",
    title: "Merchant Care Hotline",
    description: "Stuck or facing billing issues? Reach out directly via WhatsApp, Call, or Email, or submit a support ticket here."
  }
];

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

  // In-App Walkthrough Engine States
  const [tourActive, setTourActive] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties | null>(null);

  const startWalkthrough = () => {
    if (window.innerWidth < 1024) return;
    setActiveTab("orders");
    setCurrentTourStep(0);
    setTourActive(true);
  };

  const handleNextTourStep = () => {
    const nextIdx = currentTourStep + 1;
    if (nextIdx < tourSteps.length) {
      const nextStep = tourSteps[nextIdx];
      if (nextStep.tab !== activeTab) {
        setActiveTab(nextStep.tab);
      }
      setCurrentTourStep(nextIdx);
    } else {
      setTourActive(false);
      setMobileSidebarOpen(false);
      localStorage.setItem(`sosika_walkthrough_completed_${vendorId}`, "true");
      toast({
        title: "Walkthrough Completed",
        description: "You're fully trained! You can relaunch this tour anytime by tapping 'Quick Tour' in the top bar.",
      });
    }
  };

  const handlePrevTourStep = () => {
    if (currentTourStep > 0) {
      const prevIdx = currentTourStep - 1;
      const prevStep = tourSteps[prevIdx];
      if (prevStep.tab !== activeTab) {
        setActiveTab(prevStep.tab);
      }
      setCurrentTourStep(prevIdx);
    }
  };

  const handleSkipTour = () => {
    setTourActive(false);
    setMobileSidebarOpen(false);
    localStorage.setItem(`sosika_walkthrough_completed_${vendorId}`, "true");
    toast({
      title: "Walkthrough Skipped",
      description: "You can rerun the guide anytime by clicking 'Quick Tour' at the top of your console."
    });
  };

  // Visited Tabs tracker for localized welcomes
  const [visitedTabs, setVisitedTabs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`sosika_visited_tabs_${vendorId}`);
      return saved ? JSON.parse(saved) : ["orders"];
    } catch {
      return ["orders"];
    }
  });

  // Track first time visiting a tab
  useEffect(() => {
    if (!vendorId) return;
    if (!visitedTabs.includes(activeTab)) {
      const updated = [...visitedTabs, activeTab];
      setVisitedTabs(updated);
      localStorage.setItem(`sosika_visited_tabs_${vendorId}`, JSON.stringify(updated));
      
      if (!tourActive) {
        const tabTitle = activeTab === 'profile' ? 'Store Settings' : activeTab === 'support' ? 'Help & Support' : activeTab === 'menu' ? 'Menu Catalogue' : 'Live Orders';
        toast({
          title: `Welcome to ${tabTitle}!`,
          description: window.innerWidth >= 1024
            ? `First time exploring this view. Click 'Quick Tour' above if you want a guided walkthrough.`
            : `First time exploring this view. Manage your ${tabTitle.toLowerCase()} settings here.`,
          action: window.innerWidth >= 1024 ? (
            <button
              onClick={startWalkthrough}
              className="px-2.5 py-1 text-[10px] font-bold bg-[#00bfff] hover:bg-[#00a8e6] text-black rounded-md shadow-xs cursor-pointer"
            >
              Start Tour
            </button>
          ) : undefined
        });
      }
    }
  }, [activeTab, vendorId, tourActive, visitedTabs]);

  // Synchronize sidebar open/closed state with tour step targeting
  useEffect(() => {
    if (!tourActive) return;
    
    const step = tourSteps[currentTourStep];
    const isSidebarTarget = [
      "walkthrough-welcome",
      "walkthrough-nav-menu",
      "walkthrough-nav-profile",
      "walkthrough-nav-support"
    ].includes(step.targetId);

    // Ensure desktop sidebar expands so target elements are fully rendered and visible
    if (isSidebarTarget) {
      setSidebarExpanded(true);
    }

    // Automatically slide open or close mobile sidebar drawer depending on target area
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen(isSidebarTarget);
    }
  }, [currentTourStep, tourActive]);

  // Spotlight Bounding Rectangle Positioner
  useEffect(() => {
    if (!tourActive) {
      setHighlightStyle(null);
      return;
    }

    // Delay slightly (350ms) to allow sidebar open/close CSS transitions to complete
    const timer = setTimeout(() => {
      const step = tourSteps[currentTourStep];
      if (step.targetId === "walkthrough-welcome") {
        // Welcome card is centered without element highlight
        setHighlightStyle({
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "360px",
          height: "220px",
          borderRadius: "1rem",
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.7)",
          border: "2px dashed #00bfff",
          pointerEvents: "none",
          zIndex: 101
        });
        return;
      }

      const element = document.getElementById(step.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightStyle({
          position: "fixed",
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          borderRadius: "0.75rem",
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65), 0 0 15px 4px #00bfff",
          border: "2px solid #00bfff",
          pointerEvents: "none",
          zIndex: 101,
          transition: "all 0.25s ease-in-out"
        });
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setHighlightStyle(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [currentTourStep, tourActive, activeTab]);

  // Auto-start walkthrough for newly onboarded merchants on first load
  useEffect(() => {
    if (!vendorId) return;
    if (window.innerWidth < 1024) return;
    const completed = localStorage.getItem(`sosika_walkthrough_completed_${vendorId}`);
    if (!completed) {
      const timer = setTimeout(() => {
        setTourActive(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [vendorId]);

  // Responsive, Collapsible & Theme states
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [posMode, setPosMode] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vendor-theme");
      if (saved === "light" || saved === "dark") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    localStorage.setItem("vendor-theme", theme);
  }, [theme]);

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
      <div className="min-h-screen bg-zinc-50 dark:bg-[#08080a] text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center gap-2" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 text-[#00bfff] animate-spin" />
        <span className="text-zinc-500 dark:text-zinc-400 text-xs tracking-wider">Mounting operational framework...</span>
      </div>
    );
  }

  const isStoreOpen = vendorData?.is_open ?? vendorData?.listing_data?.is_open ?? false;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#08080a] text-zinc-900 dark:text-zinc-100 flex flex-col lg:flex-row selection:bg-[#00bfff]/20 font-sans antialiased transition-colors duration-200">

      {/* Mobile Sticky Header Bar */}
      <header className="lg:hidden flex items-center justify-between px-4 h-16 bg-white dark:bg-[#0c0c0e] border-b border-zinc-200 dark:border-zinc-800/80 sticky top-0 z-30 shadow-xs transition-colors duration-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 -ml-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all"
          >
            <Menu size={20} />
          </button>
          <span className="font-black text-sm tracking-tight">
            Sosika <span className="text-[#00bfff]">Console</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick theme toggle */}
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {/* Quick POS mode toggle (only on orders page) */}
          {activeTab === "orders" && (
            <button
              onClick={() => setPosMode(!posMode)}
              aria-label="Toggle POS mode"
              className={`p-2 rounded-lg transition-all ${posMode
                ? "bg-[#00bfff] text-black"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                }`}
            >
              <Monitor size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Mobile Drawer Overlay / Scrim Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Control Module */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 lg:sticky lg:top-0 lg:h-screen
          flex flex-col gap-5 p-5 shrink-0 transition-all duration-300
          bg-white dark:bg-[#0c0c0e] border-r border-zinc-200 dark:border-zinc-800/80
          ${mobileSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"}
          ${sidebarExpanded ? "lg:w-64 lg:p-5" : "lg:w-20 lg:px-0 lg:py-5"}
        `}
      >
        {/* Collapse Toggle for Desktop */}
        <button
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          aria-label={sidebarExpanded ? "Collapse sidebar menu" : "Expand sidebar menu"}
          className="hidden lg:flex absolute top-6 -right-3.5 z-20 w-7 h-7 bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800/80 rounded-full items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 shadow-sm cursor-pointer transition-colors duration-200"
        >
          {sidebarExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Sidebar Header / Logo */}
        <div className="flex items-center justify-between pb-2">
          {sidebarExpanded || mobileSidebarOpen ? (
            <div>
              <h1 id="walkthrough-welcome" className="text-lg font-black tracking-tight flex items-center gap-2">
                Sosika <span className="text-[#00bfff] font-medium text-xs bg-[#00bfff]/10 px-2 py-0.5 rounded-full">Console</span>
              </h1>
              <p className="text-xs text-zinc-500 mt-1 truncate max-w-[180px]">
                {vendorData?.name || vendorData?.listing_data?.name || "Operational Spot"}
              </p>
            </div>
          ) : (
            <div className="mx-auto">
              <span className="font-black text-xl text-[#00bfff]">S</span>
            </div>
          )}

          {/* Close button for mobile sidebar */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close menu"
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Global Store Status Toggle (Channel Engine) */}
        {sidebarExpanded || mobileSidebarOpen ? (
          <button
            id="walkthrough-channel-engine"
            onClick={handleGlobalStatusToggle}
            disabled={togglingStatus}
            aria-label={isStoreOpen ? "Close storefront visibility" : "Open storefront visibility"}
            className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition-all ${isStoreOpen
              ? "bg-[#00bfff]/5 border-[#00bfff]/20 text-[#00bfff] hover:bg-[#00bfff]/10"
              : "bg-zinc-100 dark:bg-zinc-800/20 border-zinc-200 dark:border-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40"
              }`}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Channel Engine</p>
              <p className="text-xs font-semibold text-zinc-900 dark:text-white/80 truncate">
                {isStoreOpen ? "Accepting Orders" : "Closed / Offline"}
              </p>
            </div>
            {togglingStatus ? (
              <Loader2 size={16} className="animate-spin text-zinc-500" />
            ) : isStoreOpen ? (
              <Eye size={16} className="animate-pulse" />
            ) : (
              <EyeOff size={16} />
            )}
          </button>
        ) : (
          <button
            id="walkthrough-channel-engine"
            onClick={handleGlobalStatusToggle}
            disabled={togglingStatus}
            title={isStoreOpen ? "Storefront Online - Click to Go Offline" : "Storefront Offline - Click to Go Online"}
            aria-label={isStoreOpen ? "Go offline" : "Go online"}
            className={`w-12 h-12 mx-auto rounded-xl border flex items-center justify-center transition-all relative ${isStoreOpen
              ? "bg-[#00bfff]/5 border-[#00bfff]/20 text-[#00bfff] hover:bg-[#00bfff]/10"
              : "bg-zinc-100 dark:bg-zinc-800/20 border-zinc-200 dark:border-zinc-800/50 text-zinc-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40"
              }`}
          >
            {togglingStatus ? (
              <Loader2 size={16} className="animate-spin text-zinc-500" />
            ) : isStoreOpen ? (
              <>
                <Eye size={16} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0c0c0e]"></span>
              </>
            ) : (
              <>
                <EyeOff size={16} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full border-2 border-white dark:border-[#0c0c0e]"></span>
              </>
            )}
          </button>
        )}

        {/* System Administration Verification Badges */}
        {sidebarExpanded || mobileSidebarOpen ? (
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${vendorData?.auth_info?.is_approved
            ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-amber-500/5 border-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}>
            {vendorData?.auth_info?.is_approved ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">System Approval</p>
              <p className="text-xs font-semibold truncate">
                {vendorData?.auth_info?.is_approved ? "Live on Marketplace" : "Pending Verification"}
              </p>
            </div>
          </div>
        ) : (
          <div
            title={vendorData?.auth_info?.is_approved ? "System Approved" : "Pending Approval"}
            className={`w-12 h-12 mx-auto rounded-xl border flex items-center justify-center transition-all ${vendorData?.auth_info?.is_approved
              ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/5 border-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
          >
            {vendorData?.auth_info?.is_approved ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          </div>
        )}

        {/* Navigation Switcher */}
        {sidebarExpanded || mobileSidebarOpen ? (
          <nav className="flex flex-col gap-1 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" aria-label="Main Navigation">
            {[
              { id: "orders", label: "Live Orders", icon: ShoppingBag, count: orders.length },
              { id: "menu", label: "Menu Catalogue", icon: Utensils, count: menuItems.length },
              { id: "profile", label: "Store Settings", icon: Store, count: null },
              { id: "support", label: "Help & Support", icon: LifeBuoy, count: null }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`walkthrough-nav-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id as TabType);
                    setMobileSidebarOpen(false);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${isActive
                    ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/10"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.02]"
                    }`}
                >
                  <Icon size={16} />
                  <span className="mr-auto">{tab.label}</span>
                  {tab.count !== null && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${isActive
                      ? "bg-black/20 text-black"
                      : "bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400"
                      }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        ) : (
          <nav className="flex flex-col gap-2 items-center flex-1 overflow-y-auto py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" aria-label="Main Navigation">
            {[
              { id: "orders", label: "Live Orders", icon: ShoppingBag, count: orders.length },
              { id: "menu", label: "Menu Catalogue", icon: Utensils, count: menuItems.length },
              { id: "profile", label: "Store Settings", icon: Store, count: null },
              { id: "support", label: "Help & Support", icon: LifeBuoy, count: null }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`walkthrough-nav-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  aria-current={isActive ? "page" : undefined}
                  title={tab.label}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all relative ${isActive
                    ? "bg-[#00bfff] text-black shadow-lg shadow-[#00bfff]/10"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.02]"
                    }`}
                >
                  <Icon size={18} />
                  {tab.count !== null && tab.count > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-black ${isActive ? "bg-black text-[#00bfff]" : "bg-red-500 text-white"
                      }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Sidebar Footer Operations */}
        <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800/85">
          {/* Theme switcher */}
          {sidebarExpanded || mobileSidebarOpen ? (
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.02] transition-all whitespace-nowrap"
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
            </button>
          ) : (
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title={theme === "light" ? "Dark Mode" : "Light Mode"}
              className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.02] transition-all"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          )}

          {/* POS mode button */}
          {activeTab === "orders" && (
            (sidebarExpanded || mobileSidebarOpen) ? (
              <button
                onClick={() => setPosMode(!posMode)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${posMode
                  ? "bg-[#00bfff]/20 text-[#00bfff] border border-[#00bfff]/30"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.02]"
                  }`}
              >
                <Monitor size={16} />
                <span>{posMode ? "Standard View" : "POS View"}</span>
              </button>
            ) : (
              <button
                onClick={() => setPosMode(!posMode)}
                title={posMode ? "Standard View" : "POS View"}
                className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-all ${posMode
                  ? "bg-[#00bfff]/20 text-[#00bfff] border border-[#00bfff]/30"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.02]"
                  }`}
              >
                <Monitor size={18} />
              </button>
            )
          )}

          {/* Logout Button */}
          {sidebarExpanded || mobileSidebarOpen ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-all shrink-0 whitespace-nowrap border border-red-500/15 bg-red-500/5 cursor-pointer"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-all border border-red-500/15 bg-red-500/5 cursor-pointer"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Framework Content Workspace Container */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl overflow-y-auto w-full">
        {/* Workspace Title & Quick Tour Controller */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-150 dark:border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Console Workspace</p>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white mt-1.5 capitalize">
                {activeTab === 'profile' ? 'Store settings' : activeTab === 'support' ? 'Help & support' : activeTab === 'menu' ? 'Menu catalogue' : 'Live orders'}
              </h2>
            </div>
          </div>
          
          <button
            type="button"
            onClick={startWalkthrough}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#00bfff]/10 hover:bg-[#00bfff]/20 text-[#00bfff] hover:text-[#00bfff] transition-all border border-[#00bfff]/25 cursor-pointer active:scale-[0.98]"
          >
            <Sparkles size={12} className="animate-pulse text-[#00bfff]" />
            Quick Tour
          </button>
        </div>

        {audioBlockedNotification && (
          <div className="mb-6 p-4 bg-[#00bfff]/5 border border-[#00bfff]/20 rounded-2xl flex items-center justify-between text-xs text-[#00bfff] animate-pulse">
            <span className="flex items-center gap-2">
              <AlertCircle size={14} />
              Real-Time Order Chimes: Tap anywhere on the dashboard to enable audio alerts for new orders.
            </span>
          </div>
        )}
        {activeTab === "orders" && (
          <LiveOrdersView
            orders={orders}
            vendorId={vendorId!}
            vendorData={vendorData}
            posMode={posMode}
            setPosMode={setPosMode}
          />
        )}
        {activeTab === "menu" && <MenuCatalogueView menuItems={menuItems} vendorId={vendorId!} />}
        {activeTab === "profile" && <StoreSettingsView vendorData={vendorData} vendorId={vendorId!} />}
        {activeTab === "support" && <HelpSupportView vendorData={vendorData} vendorId={vendorId!} />}
      </main>

      {/* ── Walkthrough Spotlight Scrim & Overlay ─────────────────────── */}
      {tourActive && (
        <div className="fixed inset-0 z-[100] bg-transparent cursor-default pointer-events-auto" onClick={e => e.stopPropagation()} />
      )}

      {tourActive && highlightStyle && (
        <div style={highlightStyle} className="pointer-events-none" />
      )}

      {/* Walkthrough Tour Instructions Panel */}
      {tourActive && (
        <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 lg:right-8 lg:w-96 z-[102] bg-zinc-950 dark:bg-[#0c0c0e] border border-zinc-800 dark:border-white/[0.08] rounded-2xl p-5 shadow-2xl text-white space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center text-[9px] uppercase tracking-widest font-black text-zinc-500">
            <span className="flex items-center gap-1"><Sparkles size={10} className="text-[#00bfff]" /> Interactive Guide</span>
            <span>Step {currentTourStep + 1} of {tourSteps.length}</span>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              {tourSteps[currentTourStep].title}
            </h4>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed">
              {tourSteps[currentTourStep].description}
            </p>
          </div>

          <div className="h-1 bg-zinc-850 dark:bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#00bfff] transition-all duration-300"
              style={{ width: `${((currentTourStep + 1) / tourSteps.length) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button 
              type="button"
              onClick={handleSkipTour}
              className="text-xs text-zinc-500 hover:text-zinc-350 font-bold transition-all cursor-pointer bg-transparent border-none p-0"
            >
              Skip Tour
            </button>

            <div className="flex gap-2">
              {currentTourStep > 0 && (
                <button
                  type="button"
                  onClick={handlePrevTourStep}
                  className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Back
                </button>
              )}

              <button
                type="button"
                onClick={handleNextTourStep}
                className="px-4 py-1.5 bg-[#00bfff] hover:bg-[#00a8e6] text-black rounded-lg text-xs font-black transition-all active:scale-[0.98] cursor-pointer"
              >
                {currentTourStep === tourSteps.length - 1 ? "Finish Tour" : "Next Step"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   1. INBOUND TICKETS AND WORKFLOW DISPATCH VIEW
   ========================================================================== */
function BusinessInsights({ vendorData }: { vendorData: any }) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { isPlayBillingAvailable, handlePurchase, purchasing, error: billingError } = usePlayBilling();
  const { toast } = useToast();
  const hasAnalytics = vendorData?.subscription?.tier === "premium" || vendorData?.subscription?.features_enabled?.analytics === true;

  const onSubscribeClick = async () => {
    if (isPlayBillingAvailable) {
      // Digital Goods API path (TWA / Android WebView)
      const success = await handlePurchase();
      if (success) {
        toast({ title: "Subscription Activated!", description: "Premium features are now unlocked. Your dashboard will update momentarily." });
      } else if (billingError) {
        toast({ title: "Subscription Failed", description: billingError, variant: "destructive" });
      }
    } else {
      // Desktop fallback — show modal with instructions
      setShowUpgradeModal(true);
    }
  };

  return (
    <div className="border border-zinc-200 dark:border-white/[0.05] rounded-2xl bg-white dark:bg-white/[0.01] p-6 relative overflow-hidden mt-8 shadow-xs dark:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#00bfff]/10 text-[#00bfff]">
              <TrendingUp size={16} />
            </span>
            Advanced Business Insights
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Real-time demand analytics, student ordering peaks, and customer loyalty tracking.</p>
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
        <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-150 dark:border-white/[0.03] rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Most Popular Items</p>
          <div className="space-y-2">
            {[
              { name: "Swahili Pilau", orders: 142, pct: "85%" },
              { name: "Cheese Burger Combo", orders: 98, pct: "60%" },
              { name: "Spiced Masala Chips", orders: 74, pct: "45%" }
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">{item.name}</span>
                  <span className="text-zinc-500 dark:text-zinc-400 font-mono">{item.orders} orders</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-200 dark:bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#00bfff] to-[#00a8e6] rounded-full" style={{ width: item.pct }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric 2: Peak Hours */}
        <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-150 dark:border-white/[0.03] rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Peak Ordering Hours</p>
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
                <div className="w-2.5 bg-zinc-200 dark:bg-white/[0.04] rounded-t-sm h-16 relative flex items-end">
                  <div className={`w-full bg-[#00bfff] rounded-t-sm ${d.val} transition-all`}></div>
                </div>
                <span className="text-[8px] text-zinc-500 dark:text-zinc-400 font-mono">{d.hr}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metric 3: Customer Retention */}
        <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-150 dark:border-white/[0.03] rounded-xl p-4 flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Customer Retention Rate</p>
          <div className="flex items-center justify-center py-2 gap-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-zinc-200 dark:text-white/[0.04]" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-[#00bfff]" strokeDasharray="72, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute text-xs font-mono font-bold text-zinc-950 dark:text-white">72%</div>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+4.2%</p>
              <p className="text-[9px] text-zinc-500">vs. last week average</p>
            </div>
          </div>
          <p className="text-[9px] text-zinc-500 text-center">72% of customers order again within 14 days.</p>
        </div>

      </div>

      {/* Free Tier Blurry Glass Overlay — Platform-Aware Upgrade CTA */}
      {!hasAnalytics && (
        <div className="absolute inset-0 bg-white/70 dark:bg-[#08080a]/60 backdrop-blur-[6px] flex flex-col items-center justify-center p-6 text-center transition-all duration-300">
          <div className="max-w-md space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] text-[9px] font-black uppercase tracking-widest animate-pulse">
              <Lock size={10} /> Sosika Premium Console
            </div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Upgrade to Premium Analytics</h4>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Unlock real-time demand analytics, student ordering peaks, and customer loyalty tracking.
              {isPlayBillingAvailable
                ? " Tap below to subscribe via Google Play."
                : " Open the Sosika Vendor app on your Android device to manage your subscription."}
            </p>

            <button
              onClick={onSubscribeClick}
              disabled={purchasing}
              className="bg-gradient-to-r from-[#00bfff] to-[#00a8e6] text-black font-bold text-xs px-5 py-2.5 rounded-xl hover:opacity-90 transition-all active:scale-[0.98] pointer-events-auto flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {purchasing ? (
                <><Loader2 size={14} className="animate-spin" /> Processing...</>
              ) : isPlayBillingAvailable ? (
                <><Smartphone size={14} /> Subscribe via Google Play</>
              ) : (
                <><Monitor size={14} /> How to Subscribe</>
              )}
            </button>

            {!isPlayBillingAvailable && (
              <div className="flex items-start gap-3 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.04] rounded-xl p-4 text-left pointer-events-auto">
                <Monitor size={18} className="text-[#00bfff] shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    <strong className="text-zinc-900 dark:text-white">Desktop detected:</strong> Subscription management is handled securely through Google Play Billing on the <strong className="text-[#00bfff]">Sosika Vendor</strong> Android app.
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Already subscribed? Your dashboard will update automatically via real-time sync.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Premium Upgrade Explainer Modal (Desktop fallback) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f0f11] border border-zinc-200 dark:border-white/[0.08] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative text-zinc-900 dark:text-white">
            <div className="w-12 h-12 rounded-full bg-[#00bfff]/10 flex items-center justify-center text-[#00bfff] mx-auto">
              <TrendingUp size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold">Subscribe via Sosika Hub</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed text-balance">
                To activate Premium Console features, subscription management runs directly through the Google Play Store billing portal on your <strong className="text-[#00bfff]">Sosika Hub mobile app</strong>.
              </p>
            </div>
            <div className="border border-[#00bfff]/20 bg-[#00bfff]/5 p-3.5 rounded-xl text-center space-y-2">
              <span className="text-[10px] font-bold text-[#00bfff] uppercase tracking-wider block">🚨 Action Required on Mobile</span>
              <p className="text-xs text-zinc-700 dark:text-zinc-300">
                Play Store subscriptions can <strong className="text-zinc-900 dark:text-white">only</strong> be processed and managed inside our native Android application.
              </p>
            </div>

            <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-250 dark:border-white/[0.04] p-3.5 rounded-xl text-center">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">How to activate on mobile:</p>
              <ol className="text-xs text-zinc-700 dark:text-zinc-300 text-left list-decimal list-inside space-y-1.5 mt-2">
                <li>Open the <strong className="text-zinc-900 dark:text-white">Sosika Hub</strong> app on your device</li>
                <li>Go to <strong className="text-zinc-900 dark:text-white">Account &gt; Subscription</strong></li>
                <li>Select the Premium Plan and confirm</li>
              </ol>
            </div>

            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-250 dark:border-white/[0.04] p-3 rounded-xl text-left">
              <Lock size={14} className="text-zinc-400 shrink-0" />
              <div>
                <p className="text-[10px] text-zinc-500">Already subscribed? Manage or cancel:</p>
                <a
                  href="https://play.google.com/store/account/subscriptions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#00bfff] font-bold hover:underline"
                >
                  Open Google Play Subscriptions →
                </a>
              </div>
            </div>

            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full bg-zinc-950 dark:bg-white text-white dark:text-black font-bold text-xs py-3 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveOrdersView({
  orders,
  vendorId,
  vendorData,
  posMode,
  setPosMode
}: {
  orders: any[];
  vendorId: string;
  vendorData: any;
  posMode: boolean;
  setPosMode: (val: boolean) => void;
}) {
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

  /* ==========================================
     POS VIEW MODE RENDERING BLOCK
     ========================================== */
  if (posMode) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* POS Sub-Header Control */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-900 text-white p-5 rounded-2xl shadow-lg">
          <div>
            <h2 className="text-lg font-black tracking-tight text-[#00bfff]">POS TERMINAL ACTIVE</h2>
            <p className="text-xs text-zinc-400">Optimized for fast-paced checkout queues and wide-screen registers.</p>
          </div>
          <button
            onClick={() => setPosMode(false)}
            className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer text-center"
          >
            Exit POS Terminal
          </button>
        </div>

        {/* Real-time active orders touch grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00bfff] animate-pulse"></span>
            Live Queue ({activeOrders.length} Tickets)
          </h3>

          <div id="walkthrough-orders-list">
            {activeOrders.length === 0 ? (
              <div className="p-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 dark:text-zinc-400 text-sm">
                No active production tickets found in database stream pipelines.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeOrders.map((order) => {
                const myItems = order.cart?.filter((item: any) => item.vendor_id === vendorId) || [];
                const hasExtendedInfo = vendorData?.subscription?.tier === "premium" || vendorData?.subscription?.features_enabled?.extended_customer_info === true;
                const orderDate = parseOrderDate(order);
                const timeStr = orderDate ? orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A";

                return (
                  <div key={order.id} className="bg-white dark:bg-[#0c0c0e] border-2 border-zinc-250 dark:border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 shadow-sm dark:shadow-none min-h-[290px]">
                    {/* Header */}
                    <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                      <div>
                        <span className="text-xs font-mono font-black text-zinc-400 dark:text-zinc-500">TICKET:</span>
                        <span className="text-sm font-mono font-black text-zinc-900 dark:text-white ml-1">{order.orderId || order.id?.substring(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <Clock size={13} /> {timeStr}
                        </span>
                        <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${order.status === "pending" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse" :
                          order.status === "preparing" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse" :
                            order.status === "declined" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Cart list */}
                    <div className="flex-1 space-y-2.5 py-2">
                      {myItems.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-zinc-50 dark:border-zinc-800/20">
                          <span className="text-zinc-800 dark:text-zinc-200 font-bold">
                            <span className="text-[#00bfff] font-mono font-black mr-2 text-base">{item.quantity}x</span>
                            {item.name}
                          </span>
                          <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
                            {((item.price || 0) * (item.quantity || 1)).toLocaleString()} TZS
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Delivery & Customer Info */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/10 p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-800/30 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                        <Phone size={14} className="text-zinc-400 shrink-0" />
                        {hasExtendedInfo ? (
                          <span className="font-mono font-bold">{order.phone || order.customer_phone || "N/A"}</span>
                        ) : (
                          <span className="font-mono text-zinc-400">{maskPhoneNumber(order.phone || order.customer_phone || "")}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                        <MapPin size={14} className="text-zinc-400 shrink-0" />
                        {hasExtendedInfo ? (
                          order.locationCoords && order.locationCoords !== "N/A" ? (
                            <a
                              href={`https://www.google.com/maps?q=${order.locationCoords}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#00bfff] font-bold hover:underline transition-all truncate"
                            >
                              {order.displayLocation || "Open in Maps"}
                            </a>
                          ) : (
                            <span className="truncate">{order.displayLocation || "N/A"}</span>
                          )
                        ) : (
                          <span className="text-zinc-450 dark:text-zinc-500 font-medium">🔒 Premium Feature</span>
                        )}
                      </div>
                    </div>

                    {/* Total & Action Buttons */}
                    <div className="border-t border-zinc-100 dark:border-zinc-800/50 pt-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Value</span>
                        <span className="text-base font-black text-zinc-950 dark:text-white font-mono">{order.totalAmount?.toLocaleString()} TZS</span>
                      </div>

                      <div className="flex gap-2">
                        {order.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateOrderStatus(order.id, "preparing")}
                              className="flex-1 bg-[#00bfff] text-black font-black text-sm h-14 rounded-xl hover:bg-[#00a8e6] transition-all active:scale-[0.97] cursor-pointer"
                            >
                              Accept Ticket
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.id, "declined")}
                              className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500/20 transition-all active:scale-[0.97] cursor-pointer"
                              aria-label="Decline transaction request"
                            >
                              <XCircle size={22} />
                            </button>
                          </>
                        )}
                        {order.status === "preparing" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "ready_for_pickup")}
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm h-14 rounded-xl hover:opacity-90 transition-all active:scale-[0.97] cursor-pointer"
                          >
                            Ready for Dispatch
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================
     STANDARD VIEW RENDERING BLOCK
     ========================================== */
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Incoming Order Engine</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Accept, prepare, or safely decline production delivery requests.</p>
        </div>
        {/* Toggle to POS terminal button inside main area for tablet users */}
        <button
          onClick={() => setPosMode(true)}
          className="hidden sm:flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700/50 text-zinc-700 dark:text-zinc-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
        >
          <Monitor size={14} /> Toggle POS View
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-[#00bfff]/30 transition-all flex flex-col justify-between shadow-xs dark:shadow-none">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00bfff]/5 rounded-full blur-2xl group-hover:bg-[#00bfff]/10 transition-all"></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Completed Orders</p>
            <p className="text-[10px] text-[#00bfff] font-bold uppercase tracking-wider mt-0.5">
              {revenueTimeRange === "24h" ? "Past 24 Hours" :
                revenueTimeRange === "7d" ? "Past 7 Days" :
                  revenueTimeRange === "30d" ? "Past 30 Days" :
                    revenueTimeRange === "90d" ? "Past 90 Days" : "Past 365 Days"}
            </p>
          </div>
          <div className="flex items-baseline gap-2 mt-4 z-10">
            <p className="text-3xl font-black text-zinc-900 dark:text-white">{filteredStats.count}</p>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium ml-1">processed</span>
          </div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 z-10">Refreshes automatically based on selected range.</p>
        </div>

        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-[#00bfff]/30 transition-all flex flex-col justify-between shadow-xs dark:shadow-none">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00bfff]/5 rounded-full blur-2xl group-hover:bg-[#00bfff]/10 transition-all"></div>
          <div className="flex justify-between items-start z-10 w-full">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Gross Revenue</p>
              <p className="text-[10px] text-[#00bfff] font-bold uppercase tracking-wider mt-0.5">
                {revenueTimeRange === "24h" ? "Past 24 Hours" :
                  revenueTimeRange === "7d" ? "Past 7 Days" :
                    revenueTimeRange === "30d" ? "Past 30 Days" :
                      revenueTimeRange === "90d" ? "Past 90 Days" : "Past 365 Days"}
              </p>
            </div>
            <select
              value={revenueTimeRange}
              onChange={(e) => setRevenueTimeRange(e.target.value)}
              className="bg-white dark:bg-[#0f0f11] border border-zinc-200 dark:border-white/[0.08] text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg text-xs font-bold py-1.5 px-2.5 outline-none cursor-pointer focus:border-[#00bfff]/40 transition-all shadow-xs"
            >
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
              <option value="90d">90 Days</option>
              <option value="365d">365 Days</option>
            </select>
          </div>
          <div className="flex items-baseline gap-2 mt-4 z-10">
            <p className="text-3xl font-black text-[#008bbb] dark:text-[#00bfff] font-mono">{filteredStats.revenue.toLocaleString()}</p>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-450 font-bold ml-1">TZS</span>
          </div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 z-10">Calculated client-side from completed tickets.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00bfff] animate-pulse"></span>
          Active Tickets ({activeOrders.length})
        </h3>

        <div id="walkthrough-orders-list" className="grid gap-4">
          {activeOrders.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-zinc-200 dark:border-white/[0.05] rounded-2xl text-zinc-500 text-sm bg-white dark:bg-white/[0.01]">
              No active production tickets found in database stream pipelines.
            </div>
          ) : (
            activeOrders.map((order) => {
              const myItems = order.cart?.filter((item: any) => item.vendor_id === vendorId) || [];
              const hasExtendedInfo = vendorData?.subscription?.tier === "premium" || vendorData?.subscription?.features_enabled?.extended_customer_info === true;

              return (
                <div key={order.id} className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col gap-4 shadow-xs dark:shadow-none">
                  {/* Order Header */}
                  <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                    <div className="space-y-2 w-full md:w-auto">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">{order.orderId || order.id?.substring(0, 8)}</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${order.status === "pending" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse" :
                          order.status === "preparing" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse" :
                            order.status === "declined" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          }`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="space-y-1 bg-zinc-50 dark:bg-white/[0.01] p-3 rounded-lg border border-zinc-150 dark:border-white/[0.02]">
                        {myItems.map((item: any, i: number) => (
                          <p key={i} className="text-xs text-zinc-700 dark:text-zinc-300">
                            <span className="text-[#008bbb] dark:text-[#00bfff] font-bold font-mono mr-1">{item.quantity}x</span> {item.name}
                          </p>
                        ))}
                      </div>

                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 pt-1">
                        <Clock size={12} /> Mode: <span className="text-zinc-700 dark:text-zinc-300 font-medium">{order.deliveryOption || "Standard Delivery"}</span>
                      </p>
                    </div>

                    <div className="flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end gap-3 w-full md:w-auto border-t md:border-t-0 border-zinc-100 dark:border-white/[0.05] pt-3 md:pt-0 shrink-0">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white font-mono">{order.totalAmount?.toLocaleString()} TZS</p>
                      <div className="flex gap-2 w-full md:w-auto">
                        {order.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateOrderStatus(order.id, "preparing")}
                              className="flex-1 md:flex-initial bg-zinc-950 dark:bg-white text-white dark:text-black font-bold text-xs px-3.5 py-2.5 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-[0.98] cursor-pointer"
                            >
                              Accept Ticket
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.id, "declined")}
                              className="p-2 text-zinc-500 hover:text-red-650 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.05] rounded-lg transition-all cursor-pointer"
                              aria-label="Decline transaction request"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {order.status === "preparing" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "ready_for_pickup")}
                            className="w-full md:w-auto bg-[#00bfff] text-black font-bold text-xs px-4 py-2.5 rounded-lg transition-all active:scale-[0.98] cursor-pointer"
                          >
                            Ready for Dispatch
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Customer Contact & Location Info — Gated by extended_customer_info */}
                  <div className="border-t border-zinc-100 dark:border-white/[0.03] pt-3 space-y-2">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-zinc-400" />
                        {hasExtendedInfo ? (
                          <span className="text-xs text-zinc-700 dark:text-zinc-300 font-mono font-medium">{order.phone || order.customer_phone || "N/A"}</span>
                        ) : (
                          <span className="text-xs text-zinc-500 font-mono">{maskPhoneNumber(order.phone || order.customer_phone || "")}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-zinc-400" />
                        {hasExtendedInfo ? (
                          order.locationCoords && order.locationCoords !== "N/A" ? (
                            <a
                              href={`https://www.google.com/maps?q=${order.locationCoords}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#008bbb] dark:text-[#00bfff] font-medium hover:underline transition-all"
                            >
                              {order.displayLocation || "Open in Maps"}
                            </a>
                          ) : (
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">{order.displayLocation || "N/A"}</span>
                          )
                        ) : (
                          <span className="text-xs text-zinc-500">🔒 Premium Feature</span>
                        )}
                      </div>
                    </div>
                    {!hasExtendedInfo && (
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-550 leading-relaxed">
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
      <div className="border border-zinc-200 dark:border-white/[0.05] rounded-2xl bg-white dark:bg-white/[0.01] overflow-hidden shadow-xs dark:shadow-none">
        <button
          type="button"
          onClick={() => setHistoryOpen(!historyOpen)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-all"
        >
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Clock size={16} className="text-[#00bfff]" /> Order History
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">View previously processed, dispatched, or declined orders ({pastOrders.length}).</p>
          </div>
          <span className="text-xs text-zinc-650 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">
            {historyOpen ? "Hide" : "Show"}
          </span>
        </button>

        {historyOpen && (
          <div className="p-5 border-t border-zinc-200 dark:border-white/[0.05] space-y-3 bg-zinc-50/30 dark:bg-transparent">
            {pastOrders.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">No past orders in history.</p>
            ) : (
              pastOrders.map((order) => {
                const myItems = order.cart?.filter((item: any) => item.vendor_id === vendorId) || [];
                return (
                  <div key={order.id} className="bg-white dark:bg-white/[0.01] border border-zinc-150 dark:border-white/[0.03] rounded-xl p-4 flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center shadow-xs dark:shadow-none">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">{order.orderId || order.id?.substring(0, 8)}</span>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${order.status === "delivered" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                          order.status === "ready_for_pickup" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="pl-1">
                        {myItems.map((item: any, i: number) => (
                          <p key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400">
                            {item.quantity}x {item.name}
                          </p>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">{order.totalAmount?.toLocaleString()} TZS</p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Business Insights Block */}
      {!posMode && <BusinessInsights vendorData={vendorData} />}
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Menu Catalogue</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Configure availability schemas and pricing metrics.</p>
        </div>
        {!showForm && (
          <button onClick={handleOpenCreate} className="w-full sm:w-auto bg-[#00bfff] text-black font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#00a8e6] transition-all active:scale-[0.98] cursor-pointer">
            <Plus size={14} /> Add Menu Item
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSaveItem} className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-white/[0.05] p-5 rounded-xl space-y-4 max-w-md shadow-xs dark:shadow-none">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{editingItem ? "Edit Catalogue Reference" : "Create New Catalogue Entry"}</h3>

          {/* Asynchronous Image Loader Block */}
          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-widest block">Item Cover Image</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-850 border border-zinc-250 dark:border-white/[0.08] overflow-hidden flex items-center justify-center shrink-0">
                {formData.image_url && formData.image_url !== "/" ? (
                  <img src={formData.image_url} alt="Buffer Preview" className="w-full h-full object-cover" />
                ) : (
                  <Utensils size={18} className="text-zinc-400" />
                )}
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="item-img-upload" />
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="bg-zinc-100 dark:bg-white/[0.03] hover:bg-zinc-200 dark:hover:bg-white/[0.06] border border-zinc-250 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all disabled:opacity-40"
              >
                {uploadingImage ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Upload Image
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <input type="text" required placeholder="Item Name (e.g. Swahili Pilau)" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-zinc-55 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.08] rounded-xl py-3 px-4 text-xs text-zinc-900 dark:text-white outline-none focus:border-[#00bfff]/40 transition-colors" />
          </div>

          <div className="space-y-1">
            <input type="number" required placeholder="Price in TZS" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-zinc-55 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.08] rounded-xl py-3 px-4 text-xs text-zinc-900 dark:text-white outline-none focus:border-[#00bfff]/40 transition-colors" />
          </div>

          <div className="space-y-1">
            <input type="text" required placeholder="Category (e.g. Burgers, Drinks, Swahili)" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-zinc-55 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.08] rounded-xl py-3 px-4 text-xs text-zinc-900 dark:text-white outline-none focus:border-[#00bfff]/40 transition-colors" />
          </div>

          <div className="space-y-1">
            <textarea placeholder="Ingredients and details..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full h-20 bg-zinc-55 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.08] rounded-xl py-2.5 px-4 text-xs text-zinc-900 dark:text-white outline-none focus:border-[#00bfff]/40 resize-none transition-colors" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="avail" checked={formData.is_available} onChange={e => setFormData({ ...formData, is_available: e.target.checked })} className="rounded h-4 w-4 accent-[#00bfff]" />
            <label htmlFor="avail" className="text-xs text-zinc-500 dark:text-zinc-400 select-none">Available immediately for checkout processing</label>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={uploadingImage} className="flex-1 bg-zinc-950 dark:bg-white text-white dark:text-black font-bold py-3 rounded-xl text-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50 cursor-pointer">Save Reference</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 bg-zinc-100 dark:bg-white/[0.04] rounded-xl text-xs text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="grid gap-3">
          {menuItems.map((item) => {
            const isAvailable = item.is_available !== false;
            return (
              <div key={item.id} className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-white/[0.04] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs dark:shadow-none">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.05] flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {item.image_url && item.image_url !== "/" ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Utensils size={14} className="text-zinc-450" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">{item.name}</h4>
                      <span className="text-[9px] bg-zinc-100 dark:bg-white/[0.04] text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">{item.category}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-450 truncate max-w-xs sm:max-w-md mt-0.5">{item.description || "No metadata description configured."}</p>
                    <p className="text-xs font-bold text-[#008bbb] dark:text-[#00bfff] font-mono mt-0.5">{item.price?.toLocaleString()} TZS</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/40 pt-3 sm:pt-0">
                  {/* Inline Quick-Stock Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(item.id, isAvailable)}
                    disabled={togglingId === item.id}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${isAvailable
                      ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 hover:bg-emerald-500/15"
                      : "bg-zinc-100 dark:bg-zinc-800/40 text-zinc-550 border border-zinc-200 dark:border-white/[0.05] hover:bg-zinc-200/50 dark:hover:bg-zinc-800/70"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse" : "bg-zinc-400 dark:bg-zinc-650"}`}></span>
                    {isAvailable ? "In Stock" : "Out of Stock"}
                  </button>

                  <div className="flex gap-1">
                    <button onClick={() => handleOpenEdit(item)} className="p-2 text-zinc-500 hover:text-zinc-950 dark:hover:text-white bg-zinc-50 dark:bg-white/[0.02] rounded-lg border border-zinc-200 dark:border-white/[0.05] transition-all cursor-pointer" aria-label="Edit item">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-zinc-550 hover:text-red-500 bg-zinc-50 dark:bg-white/[0.02] rounded-lg border border-zinc-200 dark:border-white/[0.05] transition-all cursor-pointer" aria-label="Delete item">
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

  // Map Loader state
  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useMapLoader();

  // Buffer States synced safely with legacy and onboarding maps
  const [spotName, setSpotName] = useState(vendorData?.name || vendorData?.listing_data?.name || "");
  const [shortDesc, setShortDesc] = useState(vendorData?.short_description || "");
  const [fullDesc, setFullDesc] = useState(vendorData?.full_description || "");
  const [openingHours, setOpeningHours] = useState(vendorData?.opening_hours || vendorData?.listing_data?.opening_hours || "");
  const [coverUrl, setCoverUrl] = useState(vendorData?.cover_image_url || "/");

  // Geotargeting Coordinates States
  const [selectedGeo, setSelectedGeo] = useState<{ lat: number; lng: number } | null>(() => {
    if (vendorData?.geolocation?.lat && vendorData?.geolocation?.lng) {
      return { lat: vendorData.geolocation.lat, lng: vendorData.geolocation.lng };
    }
    if (vendorData?.listing_data?.geolocation?.lat && vendorData?.listing_data?.geolocation?.lng) {
      return { lat: vendorData.listing_data.geolocation.lat, lng: vendorData.listing_data.geolocation.lng };
    }
    return null;
  });
  const [geoAddress, setGeoAddress] = useState(vendorData?.address || vendorData?.listing_data?.address || "");
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Initialize marker when map loads
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    geocoderRef.current = new google.maps.Geocoder();

    if (selectedGeo) {
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        position: selectedGeo,
        map: map,
      });
      map.panTo(selectedGeo);
      map.setZoom(15);
    }
  }, [selectedGeo]);

  const updateMapSelection = useCallback((pos: { lat: number; lng: number }, address: string) => {
    setSelectedGeo(pos);
    setGeoAddress(address);

    if (mapRef.current) {
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        position: pos,
        map: mapRef.current,
      });
      mapRef.current.panTo(pos);
      mapRef.current.setZoom(15);
    }
  }, []);

  const reverseGeocode = useCallback(async (pos: { lat: number; lng: number }) => {
    if (!geocoderRef.current) return "Selected Location";
    try {
      const response = await geocoderRef.current.geocode({ location: pos });
      return response.results[0]?.formatted_address || "Custom Location";
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return "Selected Location";
    }
  }, []);

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    const address = await reverseGeocode(pos);
    updateMapSelection(pos, address);
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const pos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        updateMapSelection(pos, place.formatted_address || "Search Result");
      }
    }
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const address = await reverseGeocode(pos);
        updateMapSelection(pos, address);
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation failed:", error);
        toast({
          title: "Geolocation failed",
          description: "Could not get your location. Please check browser permissions.",
          variant: "destructive",
        });
        setIsLocating(false);
      }
    );
  };

  // Cleanup map marker on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.map = null;
      }
    };
  }, []);

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
        "geolocation": selectedGeo ? { lat: selectedGeo.lat, lng: selectedGeo.lng } : null,
        "address": geoAddress,

        // Synced Nested Target Structures
        "listing_data.name": spotName,
        "listing_data.short_description": shortDesc,
        "listing_data.full_description": fullDesc,
        "listing_data.opening_hours": openingHours,
        "listing_data.cover_image_url": coverUrl,
        "listing_data.geolocation": selectedGeo ? { lat: selectedGeo.lat, lng: selectedGeo.lng } : null,
        "listing_data.address": geoAddress,
      });
      toast({ title: "Configuration Updated", description: "Operational profile adjusted correctly." });
    } catch (err) {
      toast({ title: "Adjustment Faulted", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const mapContainerStyle = { width: "100%", height: "260px", borderRadius: "1rem" };

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-200" aria-label="Store Settings Interface">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Store Settings</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Modify storefront branding assets, metadata details, and geocoordinates dynamically.</p>
      </div>

      <form onSubmit={handleUpdateStore} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Column 1: Storefront Identity & Branding */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#00bfff] uppercase tracking-wider flex items-center gap-1.5">
              <Store size={14} /> Brand Identity
            </h3>

            {/* Dynamic Cover Asset Selector */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest block">Brand Banner / Cover Image</label>
              <div className="relative h-32 w-full bg-zinc-150 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.06] rounded-xl overflow-hidden flex items-center justify-center group shadow-xs">
                {coverUrl && coverUrl !== "/" ? (
                  <img src={coverUrl} alt="Store Banner Preview" className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                ) : (
                  <Store size={24} className="text-zinc-400 animate-pulse" />
                )}
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleCoverUpload} className="hidden" />
                <button
                  type="button"
                  disabled={uploadingCover}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 m-auto w-fit h-fit bg-black/60 text-white border border-white/10 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer shadow-md"
                >
                  {uploadingCover ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  Change Cover Asset
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">Spot Listing Name</label>
              <input
                type="text"
                required
                value={spotName}
                onChange={e => setSpotName(e.target.value)}
                className="w-full bg-zinc-55 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.08] rounded-xl py-3 px-4 text-xs outline-none focus:border-[#00bfff]/40 transition-colors text-zinc-900 dark:text-white font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">Opening Schedule</label>
              <input
                type="text"
                required
                placeholder="e.g., Daily: 09:00 AM - 10:00 PM"
                value={openingHours}
                onChange={e => setOpeningHours(e.target.value)}
                className="w-full bg-zinc-55 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.08] rounded-xl py-3 px-4 text-xs outline-none focus:border-[#00bfff]/40 transition-colors text-zinc-900 dark:text-white font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">Short Feed Card Subtitle</label>
              <input
                type="text"
                value={shortDesc}
                onChange={e => setShortDesc(e.target.value)}
                className="w-full bg-zinc-55 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.08] rounded-xl py-3 px-4 text-xs outline-none focus:border-[#00bfff]/40 transition-colors text-zinc-900 dark:text-white font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">Full Showcase Overview Description</label>
              <textarea
                value={fullDesc}
                onChange={e => setFullDesc(e.target.value)}
                className="w-full h-24 bg-zinc-55 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.08] rounded-xl py-2.5 px-4 text-xs outline-none focus:border-[#00bfff]/40 transition-colors text-zinc-900 dark:text-white font-medium resize-none"
              />
            </div>
          </div>

          {/* Column 2: Physical Location & Mapping */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#00bfff] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={14} /> Physical Location & Map
            </h3>

            {/* Address Search */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest block">Search Restaurant Location</label>
              {mapLoadError ? (
                <div className="text-xs text-red-500">Maps error, search disabled.</div>
              ) : !isMapLoaded ? (
                <div className="h-10 bg-zinc-100 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.08] rounded-xl animate-pulse flex items-center px-4 text-zinc-450 text-[10px] uppercase font-bold">Mounting Autocomplete Search...</div>
              ) : (
                <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
                  <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-650 dark:text-zinc-500 w-3.5 h-3.5 group-focus-within:text-[#00bfff] transition-colors" />
                    <input
                      type="text"
                      placeholder="Search for physical address or landmarks"
                      value={geoAddress}
                      onChange={e => setGeoAddress(e.target.value)}
                      className="w-full bg-zinc-55 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-xs outline-none focus:border-[#00bfff]/40 transition-colors text-zinc-900 dark:text-white font-medium placeholder-zinc-550 dark:placeholder-zinc-600"
                    />
                  </div>
                </Autocomplete>
              )}
            </div>

            {/* Geolocate Button */}
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 bg-zinc-100 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.06] rounded-xl py-3 px-4 hover:bg-zinc-200 dark:hover:bg-white/[0.05] disabled:opacity-40 transition-all text-zinc-700 dark:text-zinc-300 shadow-2xs font-semibold text-xs cursor-pointer"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00bfff]" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5 text-[#00bfff]" />
              )}
              Use My Current GPS Position
            </button>

            {/* Google Map Box */}
            <div className="relative border border-zinc-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-xs">
              {mapLoadError ? (
                <div className="h-[260px] bg-red-500/5 flex items-center justify-center text-center p-4">
                  <p className="text-xs font-semibold text-red-500">Maps API failed to load correctly. Check network or key.</p>
                </div>
              ) : !isMapLoaded ? (
                <div className="h-[260px] bg-zinc-50 dark:bg-white/[0.01] flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00bfff]" />
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Mounting Map Engine...</p>
                </div>
              ) : (
                <>
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    zoom={14}
                    center={selectedGeo || { lat: -6.79, lng: 39.27 }}
                    onLoad={onMapLoad}
                    onClick={handleMapClick}
                    options={{
                      mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID,
                      disableDefaultUI: true,
                      zoomControl: true,
                      gestureHandling: 'cooperative'
                    }}
                  />
                  {!selectedGeo && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/40">
                      <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/[0.08] text-[10px] text-white/80 font-bold uppercase tracking-wide">
                        Click on the Map Grid to Set Coordinates
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Coordinates Stats Display */}
            {selectedGeo && (
              <div className="bg-zinc-50 dark:bg-white/[0.01] border border-zinc-150 dark:border-white/[0.04] p-3.5 rounded-xl flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-450 shadow-2xs">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> LAT: {selectedGeo.lat.toFixed(5)}</span>
                <span>LNG: {selectedGeo.lng.toFixed(5)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Global Save Button */}
        <button 
          type="submit" 
          disabled={updating || uploadingCover} 
          className="w-full bg-zinc-950 dark:bg-white text-white dark:text-black font-extrabold py-4 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-40 active:scale-[0.99] cursor-pointer shadow-md shadow-zinc-900/10 dark:shadow-none"
        >
          {updating ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Commit Settings Changes</>}
        </button>
      </form>

      {/* ── Subscription Management ────────────────────────────────── */}
      <div className="border-t border-zinc-200 dark:border-white/[0.05] pt-6 mt-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Lock size={14} className="text-zinc-450" />
            Subscription Settings
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage your merchant account billing tier and premium feature access.</p>
        </div>

        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 space-y-4 shadow-2xs dark:shadow-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="bg-zinc-50 dark:bg-white/[0.01] border border-zinc-200 dark:border-white/[0.04] p-4 rounded-xl flex items-center justify-between shadow-2xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Subscription Tier</p>
                <p className="text-xs font-bold text-zinc-900 dark:text-white mt-1">{vendorData?.subscription?.tier === "premium" ? "Premium Partner" : "Free Plan Account"}</p>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded border ${vendorData?.subscription?.tier === "premium"
                ? "bg-[#00bfff]/10 text-[#00bfff] border-[#00bfff]/20"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.05]"
                }`}>
                {vendorData?.subscription?.tier === "premium" ? "Premium" : "Free"}
              </span>
            </div>

            <div className="bg-zinc-50 dark:bg-white/[0.01] border border-zinc-200 dark:border-white/[0.04] p-4 rounded-xl flex items-center justify-between shadow-2xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">SMS Notification Gate</p>
                <p className="text-xs font-bold text-zinc-900 dark:text-white mt-1">Automatic order text alerts</p>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded border ${(vendorData?.subscription?.tier === "premium" || vendorData?.subscription?.features_enabled?.sms_notifications)
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-white/[0.05]"
                }`}>
                {(vendorData?.subscription?.tier === "premium" || vendorData?.subscription?.features_enabled?.sms_notifications) ? "Active" : "Locked"}
              </span>
            </div>
          </div>

          {vendorData?.subscription?.tier === "premium" && vendorData?.subscription?.expires_at && (
            <div className="flex items-center justify-between text-xs px-1 border-t border-zinc-100 dark:border-zinc-800/40 pt-3">
              <span className="text-zinc-500">Subscription Renews / Expires:</span>
              <span className="font-mono font-bold text-zinc-950 dark:text-white">
                {new Date(vendorData.subscription.expires_at).toLocaleDateString()}
              </span>
            </div>
          )}

          <div className="border-t border-zinc-150 dark:border-white/[0.03] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <a
                href="https://play.google.com/store/account/subscriptions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#008bbb] dark:text-[#00bfff] font-bold hover:underline transition-all flex items-center gap-1.5"
              >
                <Smartphone size={13} />
                Manage Plan on Google Play Console →
              </a>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-550">Cancel, upgrade, or verify payment instruments directly via Google Play Services.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   4. HELP & SUPPORT VIEW
   ========================================================================== */
function HelpSupportView({ vendorData, vendorId }: { vendorData: any; vendorId: string }) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("orders");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const { toast } = useToast();

  // Stream vendor's support tickets in real-time
  useEffect(() => {
    if (!vendorId) return;

    const ticketsQuery = query(
      collection(db, "supportTickets"),
      where("vendorId", "==", vendorId)
    );

    const unsubscribe = onSnapshot(ticketsQuery, (snap) => {
      const fetchedTickets = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort client-side by timestamp descending (newest first)
      fetchedTickets.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setTickets(fetchedTickets);
      setLoadingTickets(false);
    }, (error) => {
      console.error("Error streaming support tickets:", error);
      setLoadingTickets(false);
    });

    return () => unsubscribe();
  }, [vendorId]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all fields before submitting.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const ticketData = {
        vendorId,
        vendorName: vendorData?.name || vendorData?.listing_data?.name || "Partner Vendor",
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        responses: []
      };

      await addDoc(collection(db, "supportTickets"), ticketData);

      toast({
        title: "Ticket Filed Successfully",
        description: "A support agent will review your issue shortly."
      });

      // Reset form
      setSubject("");
      setDescription("");
      setPriority("medium");
    } catch (err) {
      console.error("Failed filing support ticket:", err);
      toast({
        title: "Submission Error",
        description: "Could not deliver support request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">

      {/* Dynamic Welcoming Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-zinc-900 to-zinc-950 dark:from-zinc-950 dark:to-black border border-zinc-200 dark:border-white/[0.05] p-6 sm:p-8 text-zinc-900 dark:text-white shadow-xs">
        {/* Subtle Decorative Ambient Light Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#00bfff]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#00bfff]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00bfff]/15 text-[#00bfff] text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={10} className="animate-pulse" />
              Partner Care Desk
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">We've got your back.</h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Facing order glitches, billing mismatch, or menu hiccups? Submit a ticket below or talk to us directly. Our vendor relations team is online.
            </p>
          </div>
          <div className="shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-[#00bfff] shadow-inner">
            <LifeBuoy size={32} className="animate-spin duration-3000" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left Hand side: Ticket Filing Form */}
        <div className="lg:col-span-2 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs dark:shadow-none space-y-5">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Send size={14} className="text-[#00bfff]" />
              File a Support Request
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Please provide specific details to help us debug faster.</p>
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label htmlFor="subject" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Issue Subject
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Printer not receipting, Payout not reconciled"
                required
                className="w-full text-xs bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-zinc-800/60 rounded-xl px-3.5 py-3 text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 focus:outline-hidden focus:border-[#00bfff] focus:ring-1 focus:ring-[#00bfff] transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-zinc-800/60 rounded-xl px-3.5 py-3 text-zinc-950 dark:text-white focus:outline-hidden focus:border-[#00bfff] focus:ring-1 focus:ring-[#00bfff] transition-all cursor-pointer"
                >
                  <option value="orders" className="dark:bg-[#0c0c0e]">Order Management</option>
                  <option value="billing" className="dark:bg-[#0c0c0e]">Payouts & Billing</option>
                  <option value="menu" className="dark:bg-[#0c0c0e]">Menu & Availability</option>
                  <option value="technical" className="dark:bg-[#0c0c0e]">App Bugs & Tech</option>
                  <option value="other" className="dark:bg-[#0c0c0e]">Other / Inquiry</option>
                </select>
              </div>

              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400 mb-1.5">
                  Priority
                </span>
                <div className="flex gap-2" role="radiogroup" aria-label="Priority level">
                  {["low", "medium", "high"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setPriority(level)}
                      aria-checked={priority === level}
                      role="radio"
                      className={`flex-1 py-3 text-xs font-bold rounded-xl border capitalize transition-all cursor-pointer ${priority === level
                          ? level === "high"
                            ? "bg-red-500/10 text-red-500 border-red-500/30 ring-1 ring-red-500/30"
                            : level === "medium"
                              ? "bg-amber-500/10 text-amber-550 dark:text-amber-400 border-amber-500/30 ring-1 ring-amber-500/30"
                              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 ring-1 ring-emerald-500/30"
                          : "bg-zinc-50 dark:bg-white/[0.01] border-zinc-200 dark:border-zinc-800/60 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Explain the Issue
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Give us details (e.g. Order ID, specific screen, step-by-step description to reproduce)."
                required
                className="w-full text-xs bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-zinc-800/60 rounded-xl px-3.5 py-3 text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 focus:outline-hidden focus:border-[#00bfff] focus:ring-1 focus:ring-[#00bfff] transition-all resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#00bfff] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#00bfff]/10 hover:shadow-lg hover:shadow-[#00bfff]/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Submitting Request...
                </>
              ) : (
                <>
                  <Send size={14} /> Submit Support Ticket
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Hand side: Quick Escalations Contacts */}
        <div className="space-y-6">

          {/* Quick Direct Contacts */}
          <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs dark:shadow-none space-y-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Direct Assistance</h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Response time is usually under 5 minutes.</p>
            </div>

            <div className="space-y-3">
              {/* WhatsApp Card */}
              <a
                href="https://wa.me/255760903468"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] text-emerald-600 dark:text-emerald-400 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageSquare size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black">WhatsApp Merchant Support</p>
                  <p className="text-[10px] text-emerald-500/70">Chat live with agent</p>
                </div>
              </a>

              {/* Call Card */}
              <a
                href="tel:+255760903468"
                className="flex items-center gap-3 p-3.5 rounded-xl border border-[#00bfff]/15 bg-[#00bfff]/[0.03] hover:bg-[#00bfff]/[0.06] text-[#00bfff] transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-[#00bfff]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Phone size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black">Direct Support Hotline</p>
                  <p className="text-[10px] text-[#00bfff]/70">Call instantly</p>
                </div>
              </a>

              {/* Email Card */}
              <a
                href="mailto:sosika.app@gmail.com"
                className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/10 hover:bg-zinc-100 dark:hover:bg-zinc-850/30 text-zinc-600 dark:text-zinc-400 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-zinc-200/50 dark:bg-zinc-850 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Mail size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black">General Email Support</p>
                  <p className="text-[10px] text-zinc-500">sosika.app@gmail.com</p>
                </div>
              </a>
            </div>
          </div>

          {/* Quick FAQ / Guidelines Card */}
          <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs dark:shadow-none">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-1.5">
              <LifeBuoy size={13} className="text-zinc-500" />
              Quick Troubleshooting
            </h4>
            <ul className="space-y-2 text-[10px] text-zinc-500 dark:text-zinc-400 list-disc list-inside">
              <li>Keep the channel engine toggled <strong className="text-emerald-500">Online</strong> to receive orders.</li>
              <li>New order chime repeats every 3 seconds until ticket is accepted.</li>
              <li>Premium subscription grants real-time customer phone number visibility.</li>
              <li>Clear browser cache or log out and back in if order streams freeze.</li>
            </ul>
          </div>

        </div>

      </div>

      {/* Bottom Section: Ticket History */}
      <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs dark:shadow-none">
        <div className="flex items-center gap-2 mb-4">
          <History size={16} className="text-zinc-400" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Ticket History</h3>
        </div>

        {loadingTickets ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#00bfff] animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-xl">
            <p className="text-xs text-zinc-400 dark:text-zinc-550">No support tickets filed yet.</p>
            <p className="text-[10px] text-zinc-500 mt-1">If you submit a ticket, it will appear here in real-time.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {tickets.map((ticket) => {
              const isExpanded = expandedTicketId === ticket.id;
              const dateString = ticket.createdAt
                ? new Date(ticket.createdAt.seconds * 1000).toLocaleString()
                : "Just now";

              return (
                <div key={ticket.id} className="py-4 first:pt-0 last:pb-0">
                  <div
                    onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-[#00bfff] transition-colors">
                          {ticket.subject}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${ticket.status === "resolved"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}>
                          {ticket.status}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-mono capitalize">
                          {ticket.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-550 dark:text-zinc-400 line-clamp-1">
                        {ticket.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                        {dateString}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-600 text-xs hidden sm:inline">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-4 bg-zinc-50 dark:bg-white/[0.01] border border-zinc-150 dark:border-zinc-800/40 rounded-xl space-y-4 text-xs animate-in slide-in-from-top-1 duration-200">

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Description</p>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                          {ticket.description}
                        </p>
                      </div>

                      {ticket.responses && ticket.responses.length > 0 ? (
                        <div className="space-y-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/40">
                          <p className="text-[10px] font-bold uppercase text-[#00bfff]">Correspondence</p>
                          {ticket.responses.map((resp: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-xl border ${resp.sender === "admin"
                                  ? "bg-[#00bfff]/5 border-[#00bfff]/20 text-zinc-900 dark:text-zinc-100"
                                  : "bg-zinc-100 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800/40 text-zinc-700 dark:text-zinc-300"
                                }`}
                            >
                              <div className="flex justify-between items-center mb-1 text-[9px] font-bold">
                                <span className={resp.sender === "admin" ? "text-[#00bfff]" : "text-zinc-500"}>
                                  {resp.sender === "admin" ? "Sosika support desk" : "You (Merchant)"}
                                </span>
                                <span className="text-zinc-400">
                                  {resp.timestamp ? new Date(resp.timestamp.seconds * 1000).toLocaleString() : ""}
                                </span>
                              </div>
                              <p className="leading-relaxed">{resp.message}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800/40 text-[10px] text-zinc-450 dark:text-zinc-500 italic">
                          No replies from support agent yet. Check back soon.
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}