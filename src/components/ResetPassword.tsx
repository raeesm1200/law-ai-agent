import React, { useState } from "react";
import { apiClient } from '../lib/api';

const ResetPassword: React.FC = () => {
  // Use window.location so this component works without react-router's Router context
  const query = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const token = query.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("Invalid or missing token.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.resetPassword(token, newPassword);
  setSuccess(true);
  // Redirect to login after short delay (use full navigation so component works without react-router)
  setTimeout(() => { window.location.href = '/login'; }, 2500);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
      <div className="bg-slate-800 rounded-lg shadow-lg p-8 w-full max-w-md mt-12">
        <h2 className="text-2xl font-bold mb-6 text-sky-400 text-center">Reset Password</h2>
        {success ? (
          <div className="text-center text-green-400">
            Password reset successful! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="new-password" className="block mb-2 text-sm font-medium">New Password</label>
              <input
                id="new-password"
                type="password"
                className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block mb-2 text-sm font-medium">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <button
              type="submit"
              className="w-full py-2 px-4 bg-sky-400 text-slate-900 font-semibold rounded hover:bg-sky-300 transition"
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
