import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  ConfirmationResult,
  GoogleAuthProvider,
  RecaptchaVerifier,
  User,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as fbSignOut,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { customerAuth, db } from "../firebase";
import { toE164 } from "../lib/phone";

/**
 * Optional customer identity.
 *
 * Signing in is never required: orders, the cart, the wallet and free-delivery
 * passes are all keyed on a phone number kept in localStorage, and every guest
 * path keeps working untouched. What an account adds is continuity — the same
 * phone, preferences and profile across devices.
 */

export interface UserPrefs {
  theme?: string;
  surface?: string;
  notifications?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName?: string | null;
  photoURL?: string | null;
  email?: string | null;
  /** E.164. Google sign-in doesn't supply one, so it can be absent. */
  phone?: string | null;
  prefs?: UserPrefs;
  updatedAt?: unknown;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  /** True until the first auth state callback — don't flash a signed-out UI. */
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<User | null>;
  sendOTP: (phone: string) => Promise<boolean>;
  confirmOTP: (code: string) => Promise<User | null>;
  otpPending: boolean;
  cancelOTP: () => void;
  savePrefs: (prefs: UserPrefs) => Promise<void>;
  saveProfile: (patch: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const RECAPTCHA_ID = "recaptcha-container";

/** Firebase's auth/* codes are not sentences anyone should have to read. */
const friendlyError = (code: string): string => {
  switch (code) {
    case "auth/invalid-phone-number":
      return "That doesn't look like a valid phone number.";
    case "auth/invalid-verification-code":
      return "That code isn't right. Check it and try again.";
    case "auth/code-expired":
      return "That code has expired. Request a new one.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a few minutes.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/invalid-app-credential":
      return "Phone sign-in isn't available right now. Try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
};

function ensureRecaptchaContainer(): HTMLElement {
  let el = document.getElementById(RECAPTCHA_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = RECAPTCHA_ID;
    el.style.display = "none";
    document.body.appendChild(el);
  }
  return el;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(customerAuth, (next) => {
      setUser(next);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Keep the profile doc live so a change made on another device lands here.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setProfile(
          snap.exists()
            ? ({ uid: user.uid, ...snap.data() } as UserProfile)
            : { uid: user.uid, displayName: user.displayName, email: user.email, phone: user.phoneNumber }
        );
      },
      // A read failure must not break the app for someone who only wanted food.
      (err) => console.warn("[AuthContext] profile listener:", err)
    );
    return unsub;
  }, [user]);

  /** Create or refresh the profile doc after a sign-in. */
  const syncProfile = useCallback(async (next: User) => {
    const ref = doc(db, "users", next.uid);
    try {
      const snap = await getDoc(ref);
      await setDoc(
        ref,
        {
          uid: next.uid,
          displayName: next.displayName ?? snap.data()?.displayName ?? null,
          photoURL: next.photoURL ?? snap.data()?.photoURL ?? null,
          email: next.email ?? snap.data()?.email ?? null,
          phone: next.phoneNumber ?? snap.data()?.phone ?? null,
          ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("[AuthContext] profile sync:", err);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(customerAuth, provider);
      await syncProfile(result.user);
      return result.user;
    } catch (err) {
      const message = friendlyError((err as { code?: string }).code ?? "");
      if (message) setError(message);
      return null;
    }
  }, [syncProfile]);

  const sendOTP = useCallback(async (phone: string) => {
    setError(null);
    try {
      ensureRecaptchaContainer();
      const verifier = new RecaptchaVerifier(customerAuth, RECAPTCHA_ID, { size: "invisible" });
      await verifier.render();
      const result = await signInWithPhoneNumber(customerAuth, toE164(phone), verifier);
      setConfirmation(result);
      return true;
    } catch (err) {
      setError(friendlyError((err as { code?: string }).code ?? ""));
      return false;
    }
  }, []);

  const confirmOTP = useCallback(
    async (code: string) => {
      setError(null);
      if (!confirmation) {
        setError("Request a code first.");
        return null;
      }
      try {
        const result = await confirmation.confirm(code);
        setConfirmation(null);
        await syncProfile(result.user);
        return result.user;
      } catch (err) {
        setError(friendlyError((err as { code?: string }).code ?? ""));
        return null;
      }
    },
    [confirmation, syncProfile]
  );

  const cancelOTP = useCallback(() => {
    setConfirmation(null);
    setError(null);
  }, []);

  const writeProfile = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!user) return;
      try {
        // `uid` goes on every write: the security rule requires the merged
        // document to carry it, and a prefs-first write could otherwise be the
        // one that creates the doc.
        await setDoc(
          doc(db, "users", user.uid),
          { uid: user.uid, ...patch, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch (err) {
        console.warn("[AuthContext] profile write:", err);
      }
    },
    [user]
  );

  const savePrefs = useCallback(
    (prefs: UserPrefs) => writeProfile({ prefs: { ...profile?.prefs, ...prefs } }),
    [writeProfile, profile]
  );

  const saveProfile = useCallback(
    (patch: Partial<UserProfile>) => writeProfile(patch as Record<string, unknown>),
    [writeProfile]
  );

  const signOut = useCallback(async () => {
    setConfirmation(null);
    await fbSignOut(customerAuth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      error,
      signInWithGoogle,
      sendOTP,
      confirmOTP,
      otpPending: confirmation !== null,
      cancelOTP,
      savePrefs,
      saveProfile,
      signOut,
    }),
    [
      user,
      profile,
      loading,
      error,
      signInWithGoogle,
      sendOTP,
      confirmOTP,
      confirmation,
      cancelOTP,
      savePrefs,
      saveProfile,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
