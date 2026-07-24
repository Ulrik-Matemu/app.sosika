import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  Gift,
  Search,
  RefreshCw,
  Power,
  UserCheck
} from "lucide-react";

export default function FreeDeliveryManager() {
  // Global Toggle State
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [updatingGlobal, setUpdatingGlobal] = useState(false);

  // Per-User Lookup State
  const [searchPhone, setSearchPhone] = useState("");
  const [userPassData, setUserPassData] = useState<any | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(false);

  // 1. Fetch Global Settings
  const fetchGlobalSettings = async () => {
    setLoadingGlobal(true);
    try {
      const globalSnap = await getDoc(doc(db, "system_settings", "global"));
      if (globalSnap.exists()) {
        const data = globalSnap.data();
        setGlobalEnabled(data.freeDeliveryEnabled !== false);
      } else {
        setGlobalEnabled(true);
      }
    } catch (err) {
      console.error("Error fetching global settings:", err);
    } finally {
      setLoadingGlobal(false);
    }
  };

  useEffect(() => {
    fetchGlobalSettings();
  }, []);

  // 2. Toggle Global Free Delivery
  const handleToggleGlobal = async () => {
    setUpdatingGlobal(true);
    const nextState = !globalEnabled;
    try {
      await setDoc(
        doc(db, "system_settings", "global"),
        { freeDeliveryEnabled: nextState, updatedAt: new Date() },
        { merge: true }
      );
      setGlobalEnabled(nextState);
    } catch (err) {
      console.error("Error updating global free delivery setting:", err);
      alert("Failed to update global free delivery setting.");
    } finally {
      setUpdatingGlobal(false);
    }
  };

  // 3. Normalize Phone
  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "").trim();
    if (!digits) return "";
    if (digits.startsWith("0")) return `255${digits.substring(1)}`;
    if (digits.startsWith("255")) return digits;
    return `255${digits}`;
  };

  // 4. Search User Free Delivery Pass
  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone) return;

    const formatted = normalizePhone(searchPhone);
    setLoadingUser(true);

    try {
      const passSnap = await getDoc(doc(db, "freeDeliveryPass", formatted));
      if (passSnap.exists()) {
        setUserPassData({ phone: formatted, ...passSnap.data() });
      } else {
        setUserPassData({
          phone: formatted,
          enabled: true,
          usesLeft: 3,
          isDefault: true,
        });
      }
    } catch (err) {
      console.error("User pass lookup error:", err);
    } finally {
      setLoadingUser(false);
    }
  };

  // 5. Toggle User Free Delivery Pass
  const handleToggleUserPass = async (newEnabledState: boolean) => {
    if (!userPassData) return;
    setUpdatingUser(true);

    try {
      const passRef = doc(db, "freeDeliveryPass", userPassData.phone);
      await setDoc(
        passRef,
        {
          enabled: newEnabledState,
          usesLeft: newEnabledState ? (typeof userPassData.usesLeft === "number" ? userPassData.usesLeft : 3) : 0,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setUserPassData((prev: any) => ({ ...prev, enabled: newEnabledState }));
    } catch (err) {
      console.error("User pass update error:", err);
      alert("Failed to update user pass.");
    } finally {
      setUpdatingUser(false);
    }
  };

  // 6. Reset User Uses to 3
  const handleResetUserUses = async () => {
    if (!userPassData) return;
    setUpdatingUser(true);

    try {
      const passRef = doc(db, "freeDeliveryPass", userPassData.phone);
      await setDoc(
        passRef,
        {
          enabled: true,
          usesLeft: 3,
          lastResetTimestamp: Date.now(),
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setUserPassData((prev: any) => ({
        ...prev,
        enabled: true,
        usesLeft: 3,
        lastResetTimestamp: Date.now(),
      }));
      alert(`Free delivery pass for ${userPassData.phone} reset to 3 uses!`);
    } catch (err) {
      console.error("User pass reset error:", err);
      alert("Failed to reset user pass.");
    } finally {
      setUpdatingUser(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Global Master Switch */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Gift size={20} className="text-emerald-400" />
              <h3 className="text-base font-extrabold text-white">Global Free Delivery Feature Control</h3>
              <span
                className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                  globalEnabled
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                }`}
              >
                {globalEnabled ? "Active Platform-Wide" : "Disabled Platform-Wide"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">
              Turn the 3 Free Deliveries per 2-week promotion ON or OFF for all users across the entire platform.
            </p>
          </div>

          <button
            onClick={handleToggleGlobal}
            disabled={loadingGlobal || updatingGlobal}
            className={`px-5 py-3 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50 shrink-0 ${
              globalEnabled
                ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 shadow-red-500/10"
                : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
            }`}
          >
            <Power size={16} />
            <span>{globalEnabled ? "Turn OFF for Everyone" : "Turn ON for Everyone"}</span>
          </button>
        </div>
      </div>

      {/* Per-User Pass Control Panel */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <UserCheck size={18} className="text-[#00bfff]" />
              <span>Customer Specific Free Delivery Pass Override</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Enable, disable, or reset free delivery passes for specific customer phone numbers
            </p>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchUser} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="tel"
                placeholder="Search Phone (e.g. 0760...)"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#00bfff] font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loadingUser || !searchPhone}
              className="bg-[#00bfff] hover:bg-[#00a8e6] text-black font-extrabold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingUser ? "Searching..." : "Lookup Pass"}
            </button>
          </form>
        </div>

        {/* User Pass Details & Controls */}
        {userPassData && (
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Target Account
                </span>
                <span className="font-mono font-extrabold text-sm text-[#00bfff]">
                  +{userPassData.phone}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block">Status</span>
                  <span
                    className={`font-bold ${
                      userPassData.enabled !== false ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {userPassData.enabled !== false ? "Pass Enabled" : "Pass Disabled"}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block">Uses Left</span>
                  <span className="font-mono font-black text-amber-400 text-sm">
                    {userPassData.usesLeft ?? 3} / 3
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3 text-xs">
              {userPassData.enabled !== false ? (
                <button
                  onClick={() => handleToggleUserPass(false)}
                  disabled={updatingUser}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  Disable Free Delivery for This User
                </button>
              ) : (
                <button
                  onClick={() => handleToggleUserPass(true)}
                  disabled={updatingUser}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  Enable Free Delivery for This User
                </button>
              )}

              <button
                onClick={handleResetUserUses}
                disabled={updatingUser}
                className="py-2.5 px-4 rounded-xl font-extrabold bg-[#00bfff] hover:bg-[#00a8e6] text-black transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>Reset to 3 Uses</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
