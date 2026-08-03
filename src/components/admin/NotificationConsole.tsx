import React, { useState, useEffect } from "react";
import { db, functions, httpsCallable } from "../../firebase";
import { collection, query, orderBy, limit, onSnapshot, getDocs } from "firebase/firestore";
import {
  Bell,
  Send,
  Users,
  User,
  Radio,
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Link,
  ImageIcon,
} from "lucide-react";

interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  targetType: "all" | "user" | "topic";
  targetValue?: string;
  sentAt?: any;
  successCount?: number;
  failureCount?: number;
}

export default function NotificationConsole() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [icon, setIcon] = useState("");
  const [url, setUrl] = useState("");
  const [targetType, setTargetType] = useState<"all" | "user" | "topic">("all");
  const [targetValue, setTargetValue] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch subscribers count & notification history
  useEffect(() => {
    // 1. Fetch total subscribers from fcm_tokens
    const fetchSubscribers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "fcm_tokens"));
        setSubscriberCount(snapshot.size);
      } catch (err) {
        console.error("Error fetching FCM subscriber count:", err);
      }
    };

    fetchSubscribers();

    // 2. Real-time notification history subscription
    const historyQuery = query(
      collection(db, "notifications"),
      orderBy("sentAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      historyQuery,
      (snapshot) => {
        const items: NotificationHistoryItem[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as NotificationHistoryItem[];
        setHistory(items);
        setLoadingHistory(false);
      },
      (error) => {
        console.error("Error subscribing to notification history:", error);
        setLoadingHistory(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setStatusMessage({ type: "error", text: "Title and body are required." });
      return;
    }

    if ((targetType === "user" || targetType === "topic") && !targetValue.trim()) {
      setStatusMessage({ type: "error", text: `Please specify a ${targetType === "user" ? "User ID" : "Topic name"}.` });
      return;
    }

    setSending(true);
    setStatusMessage(null);

    try {
      const sendNotificationCallable = httpsCallable(functions, "sendNotification");
      const result: any = await sendNotificationCallable({
        title,
        body,
        icon: icon.trim() || undefined,
        url: url.trim() || undefined,
        targetType,
        targetValue: targetValue.trim() || undefined,
      });

      if (result.data?.success) {
        setStatusMessage({
          type: "success",
          text: `Notification sent successfully! (Delivered: ${result.data.successCount ?? 1}, Failed: ${result.data.failureCount ?? 0})`,
        });
        // Reset form
        setTitle("");
        setBody("");
        setIcon("");
        setUrl("");
        setTargetValue("");
      } else {
        setStatusMessage({ type: "error", text: result.data?.message || "Failed to send notification." });
      }
    } catch (err: any) {
      console.error("Error sending notification via Cloud Function:", err);
      setStatusMessage({
        type: "error",
        text: err?.message || "Error calling sendNotification Cloud Function. Please ensure Cloud Functions are deployed.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#00bfff]/10 border border-[#00bfff]/20 text-[#00bfff] flex items-center justify-center font-bold shrink-0">
              <Bell size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Firebase Push Messaging</h2>
              <p className="text-xs text-zinc-400">Compose and dispatch real-time broadcast or targeted notifications to Sosika users.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-zinc-900/80 border border-white/10 px-4 py-2.5 rounded-2xl shrink-0">
            <Users size={18} className="text-[#00bfff]" />
            <div>
              <span className="text-xs text-zinc-400 block font-medium">Registered Devices</span>
              <span className="text-base font-bold text-white">
                {subscriberCount !== null ? subscriberCount.toLocaleString() : "Loading..."}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Compose Notification Form */}
        <div className="lg:col-span-7 bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles size={18} className="text-[#00bfff]" />
            <h3 className="text-lg font-bold text-white">Compose Notification</h3>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-4">
            {/* Target Selector */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Audience Target</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType("all")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    targetType === "all"
                      ? "bg-[#00bfff]/20 border-[#00bfff] text-[#00bfff]"
                      : "bg-zinc-900/50 border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Users size={14} />
                  <span>All Users</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType("user")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    targetType === "user"
                      ? "bg-[#00bfff]/20 border-[#00bfff] text-[#00bfff]"
                      : "bg-zinc-900/50 border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  <User size={14} />
                  <span>Single User</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType("topic")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    targetType === "topic"
                      ? "bg-[#00bfff]/20 border-[#00bfff] text-[#00bfff]"
                      : "bg-zinc-900/50 border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Radio size={14} />
                  <span>Topic</span>
                </button>
              </div>
            </div>

            {/* Target Value Input (Conditional) */}
            {targetType !== "all" && (
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  {targetType === "user" ? "Target User ID" : "Topic Name"}
                </label>
                <input
                  type="text"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={targetType === "user" ? "e.g., usr_9824a7bc" : "e.g., promotions or order-updates"}
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00bfff]"
                  required
                />
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Notification Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 🔥 Weekend Biryani Special!"
                className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00bfff]"
                required
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Message Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Get 20% off on all items from selected vendors near your campus..."
                rows={3}
                className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00bfff] resize-none"
                required
              />
            </div>

            {/* Optional Fields: Icon & Deep Link URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ImageIcon size={12} />
                  <span>Icon URL (Optional)</span>
                </label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="https://.../icon.png"
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00bfff]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Link size={12} />
                  <span>Target URL (Optional)</span>
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. /biryani or /orders"
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00bfff]"
                />
              </div>
            </div>

            {/* Feedback Message */}
            {statusMessage && (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold ${
                  statusMessage.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}
              >
                {statusMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-[#00bfff] text-black font-bold py-3 px-6 rounded-xl hover:bg-[#0099cc] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00bfff]/20 disabled:opacity-50 cursor-pointer"
            >
              {sending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Dispatching Notification...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Send Notification</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* History Log Panel */}
        <div className="lg:col-span-5 bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <History size={18} className="text-[#00bfff]" />
            <h3 className="text-lg font-bold text-white">Sent History</h3>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3 pr-1">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12 text-zinc-500 gap-2">
                <Loader2 size={18} className="animate-spin text-[#00bfff]" />
                <span className="text-xs font-medium">Loading notification logs...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                No notifications sent yet.
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 space-y-2 hover:border-white/10 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                    <span className="text-[10px] font-mono uppercase bg-white/5 border border-white/10 text-zinc-400 px-2 py-0.5 rounded-full shrink-0">
                      {item.targetType === "all"
                        ? "All Users"
                        : item.targetType === "user"
                        ? `User: ${item.targetValue?.slice(0, 8)}...`
                        : `Topic: ${item.targetValue}`}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2">{item.body}</p>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-white/5">
                    <span>
                      {item.sentAt?.toDate
                        ? item.sentAt.toDate().toLocaleString()
                        : "Just now"}
                    </span>
                    {item.successCount !== undefined && (
                      <span className="text-emerald-400 font-mono">
                        ✓ Delivered: {item.successCount}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
