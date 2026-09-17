import { useEffect, useState } from "react";
import { onIdTokenChanged, signOut, type User } from "firebase/auth";
import { auth } from "../../firebase";
import { Loader2 } from "lucide-react";
import AdminLogin from "./AdminLogin";

interface AdminAuthGuardProps {
  children: (props: { logout: () => Promise<void> }) => React.ReactNode;
}

/**
 * Gates admin-only UI behind a real Firebase session carrying the `admin`
 * custom claim (set out-of-band via a firebase-admin script — never in
 * client code). Replaces the old client-side username/password compare,
 * which could never produce a `request.auth` for Firestore/Functions rules
 * to check against.
 */
export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // onIdTokenChanged (not onAuthStateChanged) so a claim added after sign-in
    // is picked up on the next token refresh without requiring a re-login.
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const tokenResult = await currentUser.getIdTokenResult();
          setIsAdmin(tokenResult.claims.admin === true);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col items-center justify-center gap-3 font-sans">
        <Loader2 className="w-8 h-8 text-[#00bfff] animate-spin" />
        <span className="text-xs text-zinc-500 tracking-wider">Verifying admin session...</span>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminLogin />;
  }

  return <>{children({ logout })}</>;
}
