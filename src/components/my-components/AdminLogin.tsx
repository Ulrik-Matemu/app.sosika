import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { getFriendlyErrorMessage } from '../../utils/firebase-errors';
import { Loader2 } from 'lucide-react';

/**
 * Admin sign-in. This no longer grants access by itself — it only starts a
 * Firebase session. AdminAuthGuard checks that session's `admin` custom
 * claim before rendering anything, and Firestore/Functions independently
 * enforce the same claim server-side.
 */
const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // AdminAuthGuard's onIdTokenChanged listener picks up the new session
      // and re-checks the admin claim; nothing else to do here.
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white">
      <div className="bg-zinc-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-[#00bfff] mb-6 text-center">Admin Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-zinc-400">Email</label>
            <input
              type="email"
              id="admin-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="mt-1 block w-full bg-zinc-700 border-zinc-600 rounded-md shadow-sm p-2 text-white focus:ring-[#00bfff] focus:border-[#00bfff]"
              required
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-zinc-400">Password</label>
            <input
              type="password"
              id="admin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 block w-full bg-zinc-700 border-zinc-600 rounded-md shadow-sm p-2 text-white focus:ring-[#00bfff] focus:border-[#00bfff]"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#00bfff] text-black font-bold py-2 rounded-md hover:bg-[#0099cc] focus:outline-none focus:ring-2 focus:ring-[#00bfff] focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
