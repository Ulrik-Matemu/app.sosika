import { useEffect, useState } from "react";

import { Navigate, Outlet } from "react-router-dom";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../firebase";
import { Loader2 } from "lucide-react";

export default function VendorAuthGuard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col items-center justify-center gap-3 font-sans">
        <Loader2 className="w-8 h-8 text-[#00bfff] animate-spin" />
        <span className="text-xs text-zinc-500 tracking-wider">Verifying vendor session...</span>
      </div>
    );
  }

  // Redirect to sign in if not logged in or email is not verified
  if (!user || !user.emailVerified) {
    return <Navigate to="/vendor-auth" replace />;
  }

  // Render the protected children/routes
  return <Outlet />;
}
