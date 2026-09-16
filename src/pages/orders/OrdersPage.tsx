import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import Navbar from "../../components/my-components/navbar";
import Segmented from "../../components/my-components/Segmented";
import { useOrders, OrderRecord, getPhoneVariations } from "../../context/OrdersContext";
import { useCartContext } from "../../context/cartContext";
import UploadFoodPhotoModal from "../../components/my-components/UploadFoodPhotoModal";
import {
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  Settings,
  CheckCircle2,
  Sparkles,
  Camera,
} from "lucide-react";
import { motion } from "framer-motion";

export default function OrdersPage() {
  const navigate = useNavigate();
  const { activeOrders, pastOrders, loading, userPhone, refreshOrders } = useOrders();
  const { addToCart } = useCartContext();

  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  // Photo Upload Modal State
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [submittedKeys, setSubmittedKeys] = useState<Set<string>>(new Set());
  const [targetPhotoItem, setTargetPhotoItem] = useState<{
    orderId: string;
    vendorId: string;
    vendorName: string;
    menuItemId: string;
    menuItemName: string;
  } | null>(null);

  useEffect(() => {
    if (!userPhone) return;
    const fetchSubmissions = async () => {
      try {
        const variations = getPhoneVariations(userPhone);
        if (variations.length === 0) return;

        const q = query(
          collection(db, "food_photo_submissions"),
          where("phone", "in", variations.slice(0, 10))
        );
        const snap = await getDocs(q);
        const keys = new Set<string>();
        snap.forEach((d) => {
          const data = d.data();
          if (data.orderId && data.menuItemId) {
            keys.add(`${data.orderId}_${data.menuItemId}`);
          }
        });
        setSubmittedKeys(keys);
      } catch (err) {
        console.warn("[OrdersPage] Failed to fetch photo submissions:", err);
      }
    };
    fetchSubmissions();
  }, [userPhone, photoModalOpen]);

  const openPhotoModal = (order: OrderRecord, item: any) => {
    setTargetPhotoItem({
      orderId: order.orderId,
      vendorId: (item.vendor_id || (order as any).vendor_id || "vendor_1"),
      vendorName: order.vendor_name || "Vendor",
      menuItemId: item.id || "item_1",
      menuItemName: item.name,
    });
    setPhotoModalOpen(true);
  };


  const handleReorder = (order: OrderRecord) => {
    if (order.cart && order.cart.length > 0) {
      order.cart.forEach((item) => {
        addToCart({
          id: item.id,
          name: item.name,
          price: typeof item.price === "number" ? item.price.toString() : item.price,
          quantity: item.quantity,
          vendor_id: (order as any).vendor_id || "vendor_1",
          isAvailable: true,
          category: "mains",
          description: "",
          imageUrl: ""
        });
      });
      navigate("/cart");
    }
  };

  const formatPrice = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return (isNaN(num) ? 0 : num).toLocaleString();
  };

  // Segment count filled in the active-order progress bar (canvas screen 09)
  const getProgressStage = (status: string): number => {
    switch (status) {
      case "pending":
        return 1;
      case "preparing":
        return 2;
      case "ready_for_pickup":
        return 3;
      case "delivered":
        return 4;
      default:
        return 0;
    }
  };

  const getStatusBadge = (status: string): { label: string; variant: "open" | "active" | "closed" | "neutral" } => {
    switch (status) {
      case "pending":
        return { label: "Received", variant: "neutral" };
      case "preparing":
        return { label: "Preparing", variant: "active" };
      case "ready_for_pickup":
        return { label: "Out for delivery", variant: "active" };
      case "delivered":
        return { label: "Delivered", variant: "open" };
      case "declined":
        return { label: "Declined", variant: "closed" };
      default:
        return { label: status, variant: "neutral" };
    }
  };

  return (
    <>
      <div className="min-h-screen bg-ground text-content pb-28">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-40 bg-chrome backdrop-blur-xl border-b border-edge-1">
          <div className="max-w-md mx-auto px-5 pt-6 flex items-center justify-between gap-2">
            <h1 className="text-[28px] font-bold text-content tracking-[-0.025em]">Orders</h1>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={refreshOrders}
                disabled={loading}
                className="w-9 h-9 rounded-xl bg-surface-3 border border-edge-2 text-content-secondary flex items-center justify-center disabled:opacity-50"
                title="Sync live orders"
              >
                <RefreshCw size={15} className={loading ? "animate-spin text-accent-ink" : ""} />
              </button>
              <button
                onClick={() => navigate("/settings")}
                className="w-9 h-9 rounded-xl bg-surface-3 border border-edge-2 text-content-secondary flex items-center justify-center"
                title="Settings"
                aria-label="Settings"
              >
                <Settings size={15} />
              </button>
            </div>
          </div>

          <div className="max-w-md mx-auto px-5 pt-4 pb-3">
            <Segmented
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { value: "active", label: `Active${activeOrders.length > 0 ? ` ${activeOrders.length}` : ""}` },
                { value: "history", label: "History" },
              ]}
            />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-md mx-auto px-5 pt-5 space-y-5 relative z-10">

          {/* Skeleton Loader during initial load */}
          {loading && (
            <div className="space-y-4 py-4 animate-pulse">
              <div className="h-28 bg-surface-1 border border-edge-2 rounded-2xl w-full" />
              <div className="h-28 bg-surface-1 border border-edge-2 rounded-2xl w-full" />
            </div>
          )}

          {/* TAB 1: ACTIVE ORDERS */}
          {activeTab === "active" && !loading && (
            <div className="space-y-4">
              {activeOrders.length > 0 ? (
                <div className="space-y-4">
                  {activeOrders.map((order) => {
                    const statusMeta = getStatusBadge(order.status);
                    const itemCount = order.cart?.reduce((sum, i) => sum + i.quantity, 0) || 0;

                    return (
                      <motion.div
                        key={order.orderId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate(`/track/${order.orderId}`)}
                        className="border border-sosika-cyan/28 bg-sosika-cyan/[0.055] rounded-[22px] p-5 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent-ink">
                            {statusMeta.label}
                          </span>
                          <span className="font-mono text-xs text-content-tertiary">#{order.orderId.slice(-6)}</span>
                        </div>
                        <h3 className="text-[18px] font-bold tracking-[-0.015em] text-content mt-3">
                          {order.vendor_name || "Sosika Kitchen"}
                        </h3>
                        <p className="text-[13px] text-content-tertiary mt-[5px]">
                          {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </p>

                        {/* Progress segments */}
                        <div className="flex gap-[5px] mt-4">
                          {[1, 2, 3, 4].map((seg) => (
                            <span
                              key={seg}
                              className={`flex-1 h-1 rounded-full ${
                                seg <= getProgressStage(order.status)
                                  ? "bg-sosika-cyan"
                                  : "bg-surface-3"
                              }`}
                            />
                          ))}
                        </div>

                        <div className="flex items-center justify-between mt-[18px]">
                          <span className="font-mono text-[15px] font-bold text-content">
                            {formatPrice(order.totalAmount)}
                          </span>
                          <span className="text-[13px] font-bold text-on-accent bg-sosika-cyan px-4 py-[11px] rounded-xl">
                            Track order
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-surface-1 border border-edge-2 rounded-[18px] p-8 text-center space-y-4 my-4">
                  <div className="w-16 h-16 rounded-[18px] bg-sosika-cyan/10 border border-sosika-cyan/20 text-accent-ink flex items-center justify-center mx-auto">
                    <Sparkles size={28} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-content">No active orders</h3>
                    <p className="text-xs text-content-muted max-w-xs mx-auto leading-relaxed">
                      You don't have any food being prepared in the kitchen right now.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      to="/mood/results"
                      className="inline-flex items-center gap-2 bg-sosika-cyan hover:bg-sosika-cyan text-black font-extrabold px-6 py-3.5 rounded-xl text-xs transition-all active:scale-[0.99] shadow-lg shadow-sosika-cyan/10"
                    >
                      <span>Explore Menus & Order</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ORDER HISTORY */}
          {activeTab === "history" && !loading && (
            <div className="space-y-4">
              {pastOrders.length > 0 ? (
                <div className="space-y-3">
                  {pastOrders.map((order) => {
                    const itemCount = order.cart?.reduce((s, i) => s + i.quantity, 0) || 0;
                    const itemsSummary = order.cart?.map((i) => i.name).join(", ");
                    const orderDate = order.timestamp
                      ? new Date(
                          order.timestamp?.seconds ? order.timestamp.seconds * 1000 : order.timestamp
                        ).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
                      : null;

                    return (
                      <motion.div
                        key={order.orderId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="py-4 border-b border-edge-1 last:border-b-0"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold tracking-[-0.01em] text-content truncate">
                              {order.vendor_name || "Sosika Kitchen"}
                            </h3>
                            <p className="text-xs text-content-muted mt-1 truncate">
                              {itemCount} item{itemCount !== 1 ? "s" : ""}{itemsSummary ? ` · ${itemsSummary}` : ""}
                            </p>
                            <p className="font-mono text-[11px] text-content-faint mt-[5px]">
                              {orderDate ? `${orderDate} · ` : ""}{formatPrice(order.totalAmount)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleReorder(order)}
                            className="flex-none text-xs font-semibold text-content-secondary border border-edge-3 px-[13px] py-[9px] rounded-[11px]"
                          >
                            Reorder
                          </button>
                        </div>

                        {order.cart && order.cart.length > 0 && (
                          <div className="mt-2.5 flex flex-col gap-1.5">
                            {order.cart.map((i, idx) => {
                              const itemKey = `${order.orderId}_${i.id || "item_1"}`;
                              const isSubmitted = submittedKeys.has(itemKey);

                              return (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="truncate text-content-tertiary">{i.quantity}x {i.name}</span>
                                    {isSubmitted ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-ink text-[10px] font-bold shrink-0">
                                        <CheckCircle2 size={10} />
                                        <span>Submitted</span>
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => openPhotoModal(order, i)}
                                        className="inline-flex items-center gap-1 text-amber-ink text-[10px] font-bold shrink-0"
                                        title="Upload a photo of this meal to earn Sosika Cash"
                                      >
                                        <Camera size={10} />
                                        <span>+500</span>
                                      </button>
                                    )}
                                  </div>
                                  <span className="font-mono text-content-muted text-[11px] shrink-0 ml-2">
                                    {formatPrice((typeof i.price === "number" ? i.price : parseFloat(i.price as string)) * i.quantity)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-surface-1 border border-edge-2 rounded-[18px] p-8 text-center space-y-4 my-4">
                  <div className="w-14 h-14 rounded-[18px] bg-surface-1 border border-edge-2 text-content-muted flex items-center justify-center mx-auto">
                    <ShoppingBag size={28} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-content">No order history yet</h3>
                    <p className="text-xs text-content-muted max-w-xs mx-auto leading-relaxed">
                      Completed orders will be archived here for easy re-ordering and receipts.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {targetPhotoItem && (
        <UploadFoodPhotoModal
          isOpen={photoModalOpen}
          onClose={() => setPhotoModalOpen(false)}
          orderId={targetPhotoItem.orderId}
          phone={userPhone || ""}
          vendorId={targetPhotoItem.vendorId}
          vendorName={targetPhotoItem.vendorName}
          menuItemId={targetPhotoItem.menuItemId}
          menuItemName={targetPhotoItem.menuItemName}
        />
      )}


      <Navbar />
    </>
  );
}
