import React, { useState, useId } from "react";
import { auth } from "../../firebase";
import { 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  signOut, 
  sendPasswordResetEmail,
  type User 
} from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { useToast } from "../../hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, HelpCircle, ArrowLeft } from "lucide-react";
import { validateEmail } from "../../utils/validation";
import { getFriendlyErrorMessage } from "../../utils/firebase-errors";

type ViewState = "login" | "forgot-password" | "verification-wall";

export default function VendorAuthPortal() {
  const [identifier, setIdentifier] = useState(""); // Email, phone, or owner name
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null);
  
  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // View control: "login" | "forgot-password" | "verification-wall"
  const [view, setViewState] = useState<ViewState>("login");

  // Validation / Error States
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [forgotEmailError, setForgotEmailError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Accessibility IDs
  const identifierId = useId();
  const passwordId = useId();
  const forgotEmailId = useId();
  const identifierErrorId = useId();
  const passwordErrorId = useId();
  const forgotEmailErrorId = useId();

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
    
    // Check if phone number matches
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
    
    // Clear previous errors
    setEmailError(null);
    setPasswordError(null);

    // 1. Front-end Validation
    let hasError = false;
    if (!identifier.trim()) {
      setEmailError("Email, phone number, or owner name is required.");
      hasError = true;
    }
    if (!password) {
      setPasswordError("Password is required.");
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      hasError = true;
    }

    if (hasError) return;

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
        setViewState("verification-wall");
        throw new Error("verification-required");
      }

      toast({ title: "Welcome Back", description: "Successfully authenticated session." });
      navigate("/vendor-dashboard");
    } catch (err: any) {
      let friendlyMsg = getFriendlyErrorMessage(err);
      if (err.message === "verification-required") {
        friendlyMsg = "Email verification is required before accessing the dashboard.";
      }
      
      toast({ 
        title: "Authentication Failed", 
        description: friendlyMsg, 
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
      const friendlyMsg = getFriendlyErrorMessage(err, "Please wait a moment before requesting another link.");
      toast({ title: "Action Throttled", description: friendlyMsg, variant: "destructive" });
    }
  };

  // Gracefully clear session state if stuck on verification wall
  const handleAbortSession = async () => {
    await signOut(auth);
    setUnverifiedUser(null);
    setVerificationSent(false);
    setViewState("login");
  };

  // Handle forgot password submission
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotEmailError(null);

    const emailErr = validateEmail(forgotEmail);
    if (emailErr) {
      setForgotEmailError(emailErr);
      return;
    }

    setForgotLoading(true);

    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setForgotSuccess(true);
      toast({
        title: "Password Reset Sent",
        description: `Check your inbox at ${forgotEmail} for password reset instructions.`
      });
    } catch (err: any) {
      const friendlyMsg = getFriendlyErrorMessage(err);
      setForgotEmailError(friendlyMsg);
      toast({
        title: "Reset Request Failed",
        description: friendlyMsg,
        variant: "destructive"
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 flex items-center justify-center font-sans antialiased selection:bg-[#00bfff]/20">
      <div className="w-full max-w-md bg-white/[0.02] border border-white/[0.05] backdrop-blur-md p-8 rounded-2xl shadow-2xl space-y-6">
        
        {/* VIEW 1: Verification Wall Sub-view */}
        {view === "verification-wall" && unverifiedUser && (
          <div className="text-center space-y-4 py-4 animate-in fade-in zoom-in-95 duration-200" role="status" aria-live="polite">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-2 border border-amber-500/20">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Verify Your Email</h1>
            <p className="text-sm text-zinc-400 leading-relaxed px-2">
              We sent an activation link to <span className="text-white font-semibold">{unverifiedUser.email}</span>. Please click the link to activate your operational account and access your dashboard.
            </p>

            <div className="space-y-3 pt-4">
              <button 
                onClick={triggerVerificationResend} 
                disabled={verificationSent}
                className="w-full bg-[#00bfff] hover:bg-[#00a8e6] disabled:hover:bg-[#00bfff] text-black font-bold py-3.5 rounded-xl text-xs disabled:opacity-40 transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-[#00bfff] focus:ring-offset-2 focus:ring-offset-black outline-none"
              >
                {verificationSent ? "Activation Link Re-sent!" : "Resend Verification Link"}
              </button>
              <button 
                onClick={handleAbortSession} 
                className="w-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-zinc-300 font-semibold py-3.5 rounded-xl text-xs transition-all focus:ring-2 focus:ring-white/10 outline-none"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: Forgot Password View */}
        {view === "forgot-password" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-2">
              <button 
                onClick={() => { setViewState("login"); setForgotSuccess(false); setForgotEmail(""); setForgotEmailError(null); }}
                className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-bold transition-all focus:outline-none focus:underline"
                aria-label="Back to login"
              >
                <ArrowLeft size={14} />
                <span>Back to Login</span>
              </button>
              <h1 className="text-xl font-extrabold tracking-tight">Reset Password</h1>
              <p className="text-xs text-zinc-500">Provide your account's email address and we'll send a password recovery link.</p>
            </div>

            {forgotSuccess ? (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 text-center space-y-3 animate-in zoom-in-95 duration-200">
                <ShieldCheck className="mx-auto text-emerald-400" size={24} />
                <h3 className="text-sm font-bold text-white">Reset Link Forwarded</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  We've emailed a password recovery link to <strong className="text-white">{forgotEmail}</strong>. Please check your spam folder if it doesn't arrive within 2 minutes.
                </p>
                <button
                  type="button"
                  onClick={() => { setViewState("login"); setForgotSuccess(false); setForgotEmail(""); }}
                  className="mt-2 text-xs font-bold text-[#00bfff] hover:underline"
                >
                  Return to sign in screen
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor={forgotEmailId} className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Business Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" />
                    <input 
                      id={forgotEmailId}
                      type="email" 
                      required 
                      autoComplete="email"
                      placeholder="e.g. owner@restaurant.com" 
                      value={forgotEmail} 
                      onChange={e => setForgotEmail(e.target.value)} 
                      aria-invalid={!!forgotEmailError}
                      aria-describedby={forgotEmailError ? forgotEmailErrorId : undefined}
                      className={`w-full bg-white/[0.03] border rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:bg-white/[0.05] transition-all placeholder-zinc-700 ${forgotEmailError ? "border-red-500/50 focus:border-red-500" : "border-white/[0.08] focus:border-[#00bfff]/40"}`} 
                    />
                  </div>
                  {forgotEmailError && (
                    <p id={forgotEmailErrorId} className="text-xs text-red-400 mt-1.5 flex items-center gap-1" role="alert">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                      {forgotEmailError}
                    </p>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={forgotLoading} 
                  className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 focus:ring-2 focus:ring-[#00bfff] outline-none"
                >
                  {forgotLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Transmit Recovery Link</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* VIEW 3: Normal Authentication Form View */}
        {view === "login" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Sosika <span className="text-[#00bfff] text-xs font-bold bg-[#00bfff]/10 px-2 py-0.5 rounded-md border border-[#00bfff]/20">Vendor Hub</span>
              </h1>
              <p className="text-xs text-zinc-500 mt-1">Access your operational restaurant engine panel.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4.5">
              
              {/* Identifier (Email/Phone/Name) */}
              <div className="space-y-1">
                <label htmlFor={identifierId} className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Account Identity</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" />
                  <input 
                    id={identifierId}
                    type="text" 
                    required 
                    autoComplete="username"
                    placeholder="Email, Phone, or Owner Name" 
                    value={identifier} 
                    onChange={e => setIdentifier(e.target.value)} 
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? identifierErrorId : undefined}
                    className={`w-full bg-white/[0.03] border rounded-xl py-3.5 pl-11 pr-4 text-sm outline-none focus:bg-white/[0.05] transition-all placeholder-zinc-700 ${emailError ? "border-red-500/50 focus:border-red-500" : "border-white/[0.08] focus:border-[#00bfff]/40"}`} 
                  />
                </div>
                {emailError && (
                  <p id={identifierErrorId} className="text-xs text-red-400 mt-1.5 flex items-center gap-1" role="alert">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label htmlFor={passwordId} className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => setViewState("forgot-password")}
                    className="text-xs text-[#00bfff] font-bold hover:underline hover:text-[#00a8e6] transition-colors focus:outline-none"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4 group-focus-within:text-[#00bfff] transition-colors" />
                  <input 
                    id={passwordId}
                    type={showPassword ? "text" : "password"} 
                    required 
                    autoComplete="current-password"
                    placeholder="Enter security key" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? passwordErrorId : undefined}
                    className={`w-full bg-white/[0.03] border rounded-xl py-3.5 pl-11 pr-12 text-sm outline-none focus:bg-white/[0.05] transition-all placeholder-zinc-700 ${passwordError ? "border-red-500/50 focus:border-red-500" : "border-white/[0.08] focus:border-[#00bfff]/40"}`} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordError && (
                  <p id={passwordErrorId} className="text-xs text-red-400 mt-1.5 flex items-center gap-1" role="alert">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-[#00bfff] hover:bg-[#00a8e6] text-black font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 focus:ring-2 focus:ring-[#00bfff] outline-none active:scale-[0.99] mt-2 shadow-lg shadow-[#00bfff]/10"
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

            <div className="flex flex-col items-center justify-center gap-2 pt-4 border-t border-white/[0.05] text-xs text-zinc-500">
              <p className="flex items-center gap-1.5">
                <HelpCircle size={14} className="text-zinc-600" />
                <span>New Sosika vendor partner?</span>
              </p>
              <button 
                onClick={() => navigate("/vendor-onboarding")} 
                className="text-[#00bfff] hover:underline font-bold text-sm tracking-wide transition-all outline-none"
              >
                Onboard Restaurant Now
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}