import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  writeBatch,
  doc,
  getDoc,
  updateDoc,
  query
} from "firebase/firestore";
import { Camera, RefreshCw, ExternalLink, ShieldCheck } from "lucide-react";

export default function PhotoModerationConsole() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "food_photo_submissions"));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSubmissions(list);
    } catch (err) {
      console.error("Error fetching photo submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleApprove = async (sub: any, setAsOfficialImage: boolean) => {
    setProcessingId(sub.id);
    try {
      const batch = writeBatch(db);

      // 1. Update submission status
      const subRef = doc(db, "food_photo_submissions", sub.id);
      batch.update(subRef, { status: "approved", approvedAt: new Date() });

      // 2. Credit customer wallet
      const targetPhone = sub.phone;
      const walletRef = doc(db, "wallets", targetPhone);
      const walletSnap = await getDoc(walletRef);
      const currentBal = walletSnap.exists() ? walletSnap.data().balance || 0 : 0;
      const rewardAmt = sub.rewardAmount || 1000;

      batch.set(
        walletRef,
        { phone: targetPhone, balance: currentBal + rewardAmt, updatedAt: new Date() },
        { merge: true }
      );

      // 3. Log transaction
      const txRef = doc(collection(db, "wallet_transactions"));
      batch.set(txRef, {
        id: txRef.id,
        phone: targetPhone,
        amount: rewardAmt,
        type: "photo_reward",
        description: `Reward for food photo upload (${sub.menuItemName})`,
        referenceId: sub.id,
        timestamp: new Date(),
      });

      // 4. Optionally update menu item official photo
      if (setAsOfficialImage && sub.menuItemId) {
        const itemRef = doc(db, "menuItems", sub.menuItemId);
        batch.update(itemRef, { image_url: sub.imageUrl, is_available: true });
      }

      await batch.commit();
      alert(`Approved! TZS ${rewardAmt.toLocaleString()} credited to ${targetPhone}.`);
      fetchSubmissions();
    } catch (err) {
      console.error("Approval error:", err);
      alert("Failed to approve photo submission.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (subId: string) => {
    setProcessingId(subId);
    try {
      await updateDoc(doc(db, "food_photo_submissions", subId), { status: "rejected" });
      fetchSubmissions();
    } catch (err) {
      console.error("Rejection error:", err);
      alert("Failed to reject submission.");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingSubmissions = submissions.filter((s) => s.status === "pending");
  const pastSubmissions = submissions.filter((s) => s.status !== "pending");

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.08] rounded-3xl p-5">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Camera size={20} className="text-[#00bfff]" />
            <span>Food Photo Rewards Moderation</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Approve customer meal photos to credit TZS 1,000 Sosika Cash and update official menu images
          </p>
        </div>

        <button
          onClick={fetchSubmissions}
          className="flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs px-3.5 py-2 rounded-xl text-zinc-300 transition-all cursor-pointer font-bold"
        >
          <RefreshCw size={14} />
          <span>Refresh Submissions</span>
        </button>
      </div>

      {/* Pending Submissions Grid */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400 space-y-3">
          <RefreshCw size={24} className="animate-spin text-[#00bfff] mx-auto" />
          <p className="text-xs font-mono">Loading pending photo submissions...</p>
        </div>
      ) : pendingSubmissions.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] p-12 rounded-3xl text-center space-y-2">
          <ShieldCheck size={32} className="text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">All Clear!</h3>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            No pending food photo submissions waiting for moderation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <span>Pending Submissions</span>
            <span className="bg-[#00bfff]/20 text-[#00bfff] text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
              {pendingSubmissions.length}
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.12] rounded-3xl p-5 space-y-4 transition-all"
              >
                <div className="flex gap-4">
                  <a href={sub.imageUrl} target="_blank" rel="noreferrer" className="shrink-0 relative group">
                    <img
                      src={sub.imageUrl}
                      alt={sub.menuItemName}
                      className="w-24 h-24 object-cover rounded-2xl border border-white/[0.1] group-hover:opacity-80 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-2xl transition-opacity">
                      <ExternalLink size={16} className="text-white" />
                    </div>
                  </a>

                  <div className="space-y-1 text-xs min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Reward: TZS 1,000
                    </span>
                    <h4 className="font-extrabold text-sm text-white truncate">{sub.menuItemName}</h4>
                    <p className="text-zinc-400">
                      Vendor: <strong className="text-zinc-200">{sub.vendorName}</strong>
                    </p>
                    <p className="text-zinc-400">
                      Customer Phone: <span className="font-mono text-[#00bfff] font-bold">{sub.phone}</span>
                    </p>
                    <p className="text-zinc-500 font-mono text-[10px]">Order #{sub.orderId?.slice(-6)}</p>
                  </div>
                </div>

                {/* Moderation Actions */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => handleApprove(sub, true)}
                    disabled={processingId === sub.id}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/15 disabled:opacity-40"
                  >
                    Approve + Set Photo (+1,000)
                  </button>

                  <button
                    onClick={() => handleApprove(sub, false)}
                    disabled={processingId === sub.id}
                    className="flex-1 bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00bfff]/15 disabled:opacity-40"
                  >
                    Approve Only (+1,000)
                  </button>

                  <button
                    onClick={() => handleReject(sub.id)}
                    disabled={processingId === sub.id}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold px-3 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Moderated History */}
      {pastSubmissions.length > 0 && (
        <div className="pt-6 border-t border-white/[0.06] space-y-3">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Past Moderation History ({pastSubmissions.length})
          </h3>

          <div className="space-y-2">
            {pastSubmissions.slice(0, 10).map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] p-3 rounded-2xl text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={sub.imageUrl}
                    alt={sub.menuItemName}
                    className="w-10 h-10 rounded-xl object-cover border border-white/[0.08]"
                  />
                  <div>
                    <span className="font-extrabold text-white block">{sub.menuItemName}</span>
                    <span className="text-zinc-500 text-[11px]">
                      {sub.phone} • {sub.vendorName}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                    sub.status === "approved"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}
                >
                  {sub.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
