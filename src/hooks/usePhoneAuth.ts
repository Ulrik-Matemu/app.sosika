import { useState, useEffect } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User,
  onAuthStateChanged
} from "firebase/auth";
import { auth } from "../firebase";

export function usePhoneAuth() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const sendOTP = async (phoneNumber: string, containerId = "recaptcha-container"): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      // Ensure container element exists in DOM
      let containerEl = document.getElementById(containerId);
      if (!containerEl) {
        containerEl = document.createElement("div");
        containerEl.id = containerId;
        document.body.appendChild(containerEl);
      }

      // Clear existing verifier if any
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {
          console.warn("Failed to clear previous recaptcha verifier:", e);
        }
        (window as any).recaptchaVerifier = null;
      }

      // Create invisible reCAPTCHA verifier
      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: "invisible",
        callback: () => {
          // reCAPTCHA solved
        },
        "expired-callback": () => {
          setError("reCAPTCHA expired. Please try sending OTP again.");
        }
      });

      (window as any).recaptchaVerifier = verifier;

      // Render the reCAPTCHA widget explicitly
      await verifier.render();

      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(result);
      return true;
    } catch (err: any) {
      console.error("[usePhoneAuth] Send OTP error:", err);
      let msg = err?.message || "Failed to send SMS code. Please verify phone number format.";
      if (err?.code === "auth/invalid-app-credential") {
        msg = "Firebase Auth error (auth/invalid-app-credential). Ensure localhost is in Firebase Authorized Domains, reCAPTCHA is enabled in Firebase Console > Auth Settings, or use a Firebase Test Phone Number.";
      } else if (err?.code === "auth/invalid-phone-number") {
        msg = "Invalid phone number format. Please enter a valid number (e.g. +255 712 345 678).";
      } else if (err?.code === "auth/too-many-requests") {
        msg = "Too many requests. Please wait a few minutes before trying again.";
      }
      setError(msg);
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch {}
        (window as any).recaptchaVerifier = null;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const confirmOTP = async (code: string): Promise<User | null> => {
    if (!confirmationResult) {
      setError("No active SMS verification session. Please request a code first.");
      return null;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await confirmationResult.confirm(code);
      setUser(result.user);
      return result.user;
    } catch (err: any) {
      console.error("[usePhoneAuth] Confirm OTP error:", err);
      let msg = "Invalid verification code. Please check the code and try again.";
      if (err?.code === "auth/invalid-verification-code") {
        msg = "Incorrect 6-digit verification code.";
      } else if (err?.code === "auth/code-expired") {
        msg = "Verification code has expired. Please request a new code.";
      }
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setConfirmationResult(null);
    } catch (err) {
      console.error("[usePhoneAuth] Sign out error:", err);
    }
  };

  return {
    user,
    sendOTP,
    confirmOTP,
    confirmationResult,
    loading,
    error,
    signOut: signOutUser,
  };
}
