import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import axios from "axios";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid or missing token");
      return;
    }

    setLoading(true);

    try {
      await axios.post('https://sosika-backend.onrender.com/api/auth/reset-password', {
        token,
        newPassword,
      });
      setMessage("Password reset successful! You can now log in.");
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to reset password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full p-8 bg-[#ededed] shadow-lg rounded-xl border border-gray-100">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-blue-100 rounded-full mb-4">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Reset Password</h2>
          <p className="text-gray-500 text-sm mt-2 text-center">
            Create a new secure password for your account
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                className="w-full px-4 py-2 text-black rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="w-full px-4 py-2 text-black rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm">
              <p className="text-gray-500">Your password should:</p>
              <ul className="ml-4 mt-1 text-xs text-gray-500 space-y-1">
                <li className="flex items-center">
                  <span className={`w-4 h-4 rounded-full mr-2 ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  Be at least 8 characters long
                </li>
                <li className="flex items-center">
                  <span className={`w-4 h-4 rounded-full mr-2 ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  Include at least one uppercase letter
                </li>
                <li className="flex items-center">
                  <span className={`w-4 h-4 rounded-full mr-2 ${/[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  Include at least one number
                </li>
              </ul>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-white font-medium transition-all ${
              loading 
                ? "bg-blue-400 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Reset Password"
            )}
          </button>

          {message && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-green-700 text-sm">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <p>{message}</p>
            </div>
          )}
          
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </form>
        
        <div className="mt-6 text-center">
          <a href="#" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Back to login
          </a>
        </div>
      </div>
    </div>
  );
}