import React, { useState } from "react";
import { auth, db } from "../../firebase";
import { signInWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { useToast } from "../../hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";

export default function VendorAuthPortal() {
  const [identifier, setIdentifier] = useState(""); // Holds email, phone, or owner name
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState<any>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  // Helper: Resolves custom identifiers down to an email address using database indexing
  const resolveEmailFromIdentifier = async (input: string): Promise<string> => {
    const cleanInput = input.trim();
    
    // 1. Direct Pass: If it looks like an email, use it immediately
    if (cleanInput.includes("@")) {
      return cleanInput;
    }

    // 2. Query Map Strategy: Check if it's a phone number or owner name
    const vendorsRef = collection(db, "vendors");
    let q = query(vendorsRef, where("auth_info.phone_number", "==", cleanInput), limit(1));
    let querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // Fallback: Try checking via Owner Name case-sensitive lookup
      q = query(vendorsRef, where("auth_info.owner_name", "==", cleanInput), limit(1));
      querySnapshot = await getDocs(q);
    }

    if (!querySnapshot.empty) {
      const vendorData = querySnapshot.docs[0].data();
      return vendorData.auth_info.email;
    }

    throw new Error("No vendor account discovered with those credentials.");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step A: Resolve our flexible identifier field down to an authentic email address
      const targetEmail = await resolveEmailFromIdentifier(identifier);

      // Step B: Authenticate against Firebase Identity Service
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
      const user = userCredential.user;

      // Step C: Check authorization verification state
      if (!user.emailVerified) {
        setUnverifiedUser(user);
        throw new Error("Email verification required before accessing dashboard.");
      }

      toast({ title: "Welcome Back", description: "Successfully authenticated session." });
      navigate("/vendor-dashboard");
    } catch (err: any) {
      toast({ 
        title: "Authentication Halted", 
        description: err.message || "Invalid credentials provided.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerVerificationResend = async () => {
    if (!unverifiedUser) return;
    try {
      await sendEmailVerification(unverifiedUser);
      setVerificationSent(true);
      toast({ title: "Verification Forwarded", description: "Check your spam or primary inbox folder." });
    } catch (err: any) {
      toast({ title: "Action Throttled", description: "Please wait a moment before requesting another link.", variant: "destructive" });
    }
  };

  // Gracefully clear session state if stuck on verification wall
  const handleAbortSession = async () => {
    await signOut(auth);
    setUnverifiedUser(null);
    setVerificationSent(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl shadow-xl space-y-6">
        
        {/* Verification Wall Sub-view */}
        {unverifiedUser ? (
          <div className="text-center space-y-4 py-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-2">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-lg font-bold">Verify your Email</h2>
            <p className="text-sm text-zinc-400 leading-relaxed px-2">
              We sent a verification link to <span className="text-white font-medium">{unverifiedUser.email}</span>. You must activate this link to unleash your dashboard control.
            </p>

            <div className="space-y-2 pt-2">
              <button 
                onClick={triggerVerificationResend} 
                disabled={verificationSent}
                className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-bold py-3 rounded-xl text-xs disabled:opacity-40 transition-all"
              >
                {verificationSent ? "Link Sent! Check Inbox" : "Resend Verification Link"}
              </button>
              <button 
                onClick={handleAbortSession} 
                className="w-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-zinc-300 font-medium py-3 rounded-xl text-xs transition-all"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          /* Normal Authentication Form view */
          <>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Sosika Hub</h1>
              <p className="text-xs text-zinc-500 mt-1">Access your operational restaurant engine panel.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" />
                <input 
                  type="text" 
                  required 
                  placeholder="Email, Phone number, or Owner Name" 
                  value={identifier} 
                  onChange={e => setIdentifier(e.target.value)} 
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[#00bfff]/40 focus:bg-white/[0.05] transition-all placeholder-zinc-600" 
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" />
                <input 
                  type="password" 
                  required 
                  placeholder="Password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[#00bfff]/40 focus:bg-white/[0.05] transition-all placeholder-zinc-600" 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Enter Engine Room</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}