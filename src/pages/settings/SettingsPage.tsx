import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  LogOut,
  Moon,
  Phone,
  ShieldCheck,
  Smartphone,
  Sun,
} from "lucide-react";

import Navbar from "../../components/my-components/navbar";
import TopUpWalletModal from "../../components/my-components/TopUpWalletModal";
import { useAuth } from "../../context/AuthContext";
import { useTheme, ThemeMode, SurfaceStyle } from "../../context/ThemeContext";
import { useOrders } from "../../context/OrdersContext";
import { useWallet } from "../../context/WalletContext";
import { useCartContext } from "../../context/cartContext";
import { useLocationStorage } from "../../hooks/useLocationStorage";
import { usePWAInstallPrompt } from "../../hooks/usePWAInstallPrompt";
import {
  initializeNotifications,
  notificationPermission,
} from "../../services/push-notifications";
import { isValidTZPhone } from "../../lib/phone";

const APP_VERSION = "v2.0";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3">
    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-content-faint">
      {title}
    </div>
    {children}
  </section>
);

const Row = ({
  label,
  value,
  onClick,
  to,
}: {
  label: string;
  value?: React.ReactNode;
  onClick?: () => void;
  to?: string;
}) => {
  const body = (
    <>
      <span className="text-sm font-semibold text-content">{label}</span>
      <span className="flex items-center gap-1.5 font-mono text-xs text-content-muted">
        {value}
        {(onClick || to) && <ChevronRight className="w-3.5 h-3.5" />}
      </span>
    </>
  );
  const className =
    "w-full flex items-center justify-between py-4 border-b border-edge-1 text-left min-h-[44px]";
  if (to) return <Link to={to} className={className}>{body}</Link>;
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  return <div className={className}>{body}</div>;
};

/** A labelled choice row — used for both appearance settings. */
function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex flex-col items-center justify-center gap-2 rounded-[18px] border py-4 min-h-[76px] transition-colors ${
              active
                ? "border-sosika-cyan/40 bg-sosika-cyan/[0.09] text-content"
                : "border-edge-2 bg-surface-1 text-content-tertiary"
            }`}
          >
            {option.icon}
            <span className={`text-xs ${active ? "font-bold" : "font-semibold"}`}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const Toggle = ({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`w-full flex items-center justify-between gap-4 py-4 text-left min-h-[44px] ${
      disabled ? "opacity-50 cursor-not-allowed" : ""
    }`}
  >
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-content">{label}</span>
      {hint && <span className="block text-xs text-content-muted mt-0.5">{hint}</span>}
    </span>
    <span
      className={`w-[46px] h-[26px] rounded-full p-[3px] flex-none transition-colors ${
        checked ? "bg-sosika-cyan" : "bg-content-faint"
      }`}
    >
      <span
        className={`block w-5 h-5 rounded-full bg-ground transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </span>
  </button>
);

/**
 * Settings — profile, appearance, notifications and account.
 *
 * This replaces the Account tab that used to live inside /orders, so there is
 * one place for everything system-level rather than settings buried two levels
 * into an unrelated screen.
 */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { mode, surface, setMode, setSurface } = useTheme();
  const {
    user,
    profile,
    error: authError,
    signInWithGoogle,
    sendOTP,
    confirmOTP,
    otpPending,
    cancelOTP,
    savePrefs,
    signOut,
  } = useAuth();
  const { userPhone, setUserPhone, disconnectPhone } = useOrders();
  const { balance } = useWallet();
  const { freeDeliveryUsesLeft } = useCartContext();
  const { locations } = useLocationStorage();
  const { deferredPrompt, promptInstall } = usePWAInstallPrompt();

  const [phoneInput, setPhoneInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [permission, setPermission] = useState(notificationPermission());

  useEffect(() => {
    setPermission(notificationPermission());
  }, []);

  const notificationsOn = permission === "granted";

  const handleNotifications = async (next: boolean) => {
    if (!next) {
      // Browsers give no API to revoke permission; be honest about that.
      setLocalError(
        "Turn notifications off from your browser's site settings — the page can't revoke permission itself."
      );
      return;
    }
    setLocalError(null);
    setBusy(true);
    await initializeNotifications(user?.uid ?? userPhone ?? "guest_user", true);
    setPermission(notificationPermission());
    setBusy(false);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!isValidTZPhone(phoneInput)) {
      setLocalError("Enter a valid number, e.g. 0712 345 678.");
      return;
    }
    setBusy(true);
    await sendOTP(phoneInput);
    setBusy(false);
    // Identity deliberately does NOT change here — only a verified code can
    // repoint which phone owns this device's orders and wallet.
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (otpInput.trim().length < 6) {
      setLocalError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    const authed = await confirmOTP(otpInput.trim());
    setBusy(false);
    if (authed?.phoneNumber) {
      setUserPhone(authed.phoneNumber);
      setOtpInput("");
      setPhoneInput("");
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleDisconnect = async () => {
    await signOut();
    disconnectPhone();
  };

  const displayPhone = profile?.phone || userPhone;
  const initials =
    profile?.displayName?.trim()?.[0]?.toUpperCase() ||
    (displayPhone ? displayPhone.replace(/\D/g, "").slice(-2) : "?");

  const error = localError || authError;

  return (
    <div className="min-h-screen bg-ground text-content pb-28">
      <div className="sticky top-0 z-30 bg-chrome backdrop-blur-xl border-b border-edge-1">
        <div className="max-w-md mx-auto px-5 py-3.5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-10 h-10 flex-none flex items-center justify-center rounded-full bg-surface-3 border border-edge-3"
          >
            <ChevronLeft className="w-[19px] h-[19px] text-content-secondary" />
          </button>
          <h1 className="text-[19px] font-extrabold">Settings</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-6 flex flex-col gap-8">
        {/* ---------- Profile ---------- */}
        <Section title="Profile">
          <div className="flex items-center gap-3.5">
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt=""
                width={52}
                height={52}
                className="w-[52px] h-[52px] rounded-full object-cover flex-none"
              />
            ) : (
              <div className="w-[52px] h-[52px] rounded-full bg-sosika-cyan/[0.12] border border-sosika-cyan/30 text-accent-ink flex items-center justify-center font-bold text-[17px] flex-none">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[16px] font-bold truncate">
                {profile?.displayName || displayPhone || "Guest"}
              </div>
              <div className="text-xs text-content-muted mt-1 truncate">
                {user
                  ? profile?.email || displayPhone || "Signed in"
                  : "Not signed in — your orders live on this device only"}
              </div>
            </div>
          </div>

          {!user && (
            <div className="rounded-[18px] border border-edge-2 bg-surface-1 p-4 flex flex-col gap-3">
              <p className="text-xs text-content-muted leading-relaxed">
                Signing in is optional. It syncs your orders, wallet and rewards across devices.
              </p>

              <button
                type="button"
                onClick={signInWithGoogle}
                className="w-full h-12 rounded-2xl bg-surface-3 border border-edge-3 text-sm font-bold flex items-center justify-center gap-2"
              >
                Continue with Google
              </button>

              {!otpPending ? (
                <form onSubmit={handleSendOTP} className="flex flex-col gap-2.5">
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                    <input
                      type="tel"
                      inputMode="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="0712 345 678"
                      className="w-full h-12 rounded-2xl bg-surface-2 border border-edge-2 pl-10 pr-4 text-sm text-content placeholder-content-faint outline-none focus:border-sosika-cyan/35"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-12 rounded-2xl bg-sosika-cyan text-on-accent text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Verify by SMS
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="flex flex-col gap-2.5">
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-digit code"
                    className="w-full h-12 rounded-2xl bg-surface-2 border border-edge-2 px-4 text-center font-mono text-lg tracking-[0.3em] text-content placeholder-content-faint outline-none focus:border-sosika-cyan/35"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-12 rounded-2xl bg-sosika-cyan text-on-accent text-sm font-bold disabled:opacity-60"
                  >
                    {busy ? "Checking…" : "Confirm code"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelOTP}
                    className="text-xs font-semibold text-content-muted"
                  >
                    Use a different number
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Google gives us no phone number, but orders and the wallet are keyed on one. */}
          {user && !displayPhone && (
            <div className="rounded-[18px] border border-sosika-amber/25 bg-sosika-amber/[0.055] p-4">
              <div className="text-sm font-bold text-content">Verify your phone</div>
              <p className="text-xs text-content-muted mt-1 leading-relaxed">
                Your orders, wallet and delivery passes are tied to a phone number. Add one to sync
                them to this account.
              </p>
              <form onSubmit={handleSendOTP} className="flex gap-2 mt-3">
                <input
                  type="tel"
                  inputMode="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="0712 345 678"
                  className="flex-1 h-11 rounded-2xl bg-surface-2 border border-edge-2 px-3.5 text-sm text-content placeholder-content-faint outline-none"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="h-11 px-4 rounded-2xl bg-sosika-amber text-on-accent text-sm font-bold disabled:opacity-60"
                >
                  Send
                </button>
              </form>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </Section>

        {/* ---------- Appearance ---------- */}
        <Section title="Appearance">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-content">Theme</span>
            <Choice<ThemeMode>
              value={mode}
              onChange={(next) => {
                setMode(next);
                if (user) savePrefs({ theme: next });
              }}
              options={[
                { value: "system", label: "System", icon: <Smartphone className="w-[18px] h-[18px]" /> },
                { value: "light", label: "Light", icon: <Sun className="w-[18px] h-[18px]" /> },
                { value: "dark", label: "Dark", icon: <Moon className="w-[18px] h-[18px]" /> },
              ]}
            />
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <span className="text-sm font-semibold text-content">Surfaces</span>
            <div className="grid grid-cols-2 gap-2">
              {(["glass", "solid"] as SurfaceStyle[]).map((style) => {
                const active = surface === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      setSurface(style);
                      if (user) savePrefs({ surface: style });
                    }}
                    className={`rounded-[18px] border p-3 text-left transition-colors ${
                      active ? "border-sosika-cyan/40" : "border-edge-2"
                    }`}
                  >
                    {/* A live preview, drawn from the same tokens the app uses. */}
                    <div
                      className={`h-12 rounded-[14px] border border-edge-2 mb-2.5 ${
                        style === "glass" ? "bg-surface-1 glass" : "bg-surface-3"
                      }`}
                    />
                    <span
                      className={`text-xs capitalize ${
                        active ? "font-bold text-content" : "font-semibold text-content-tertiary"
                      }`}
                    >
                      {style}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ---------- Notifications ---------- */}
        <Section title="Notifications">
          <div className="rounded-[18px] border border-edge-2 bg-surface-1 px-4">
            <Toggle
              checked={notificationsOn}
              disabled={permission === "unsupported" || permission === "denied" || busy}
              onChange={handleNotifications}
              label="Order updates"
              hint={
                permission === "unsupported"
                  ? "This browser doesn't support push notifications."
                  : permission === "denied"
                  ? "Blocked in your browser settings."
                  : notificationsOn
                  ? "You'll hear when a kitchen accepts and when your rider is close."
                  : "Get told when your order is accepted and on its way."
              }
            />
          </div>
        </Section>

        {/* ---------- Account ---------- */}
        <Section title="Account">
          <div className="rounded-[20px] border border-sosika-amber/25 bg-sosika-amber/[0.055] p-[18px] flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-amber-ink">
                Sosika cash
              </div>
              <div className="font-mono text-[26px] font-bold text-content mt-2">
                {balance.toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="text-[13px] font-bold text-on-accent bg-sosika-amber px-4 py-3 rounded-xl"
            >
              Top up
            </button>
          </div>

          <div className="flex flex-col">
            <Row label="Transactions" to="/sosika-cash" />
            <Row
              label="Free delivery passes"
              value={<span className="text-emerald-ink">{freeDeliveryUsesLeft} OF 3 LEFT</span>}
            />
            <Row label="Saved locations" value={locations.length} onClick={() => navigate("/mood/location")} />
            <Row label="Photo rewards" to="/orders" />
            <Row label="Invite a friend" value="+1,000 EACH" />
          </div>
        </Section>

        {/* ---------- App ---------- */}
        <Section title="App">
          <div className="flex flex-col">
            {deferredPrompt && (
              <button
                type="button"
                onClick={promptInstall}
                className="w-full flex items-center justify-between py-4 border-b border-edge-1 min-h-[44px]"
              >
                <span className="text-sm font-semibold text-content">Install Sosika</span>
                <Download className="w-4 h-4 text-content-muted" />
              </button>
            )}
            <Row label="Sell on Sosika" to="/vendor-onboarding" />
            <Row label="Version" value={APP_VERSION} />
          </div>
        </Section>

        {/* ---------- Danger ---------- */}
        <Section title="Danger zone">
          <div className="flex flex-col gap-3">
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full h-12 rounded-2xl bg-surface-2 border border-edge-2 text-sm font-bold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            )}
            <button
              type="button"
              onClick={handleDisconnect}
              className="text-xs font-semibold text-content-muted hover:text-red-400 transition-colors py-2"
            >
              Disconnect phone &amp; clear device data
            </button>
          </div>
        </Section>
      </div>

      <TopUpWalletModal isOpen={topUpOpen} onClose={() => setTopUpOpen(false)} />
      <Navbar />
    </div>
  );
}
