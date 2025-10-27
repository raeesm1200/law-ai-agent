import React, { useState } from "react";
import { apiClient } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';

const ResetPassword: React.FC = () => {
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
      setTimeout(() => { window.location.href = '/login'; }, 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-theme auth-background fixed inset-0 z-40 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' as any }}>
      <div className="grid min-h-screen grid-cols-1 md:[grid-template-columns:55%_45%]">
        {/* Left hero / branding (same as login page) */}
        <aside className="hidden md:flex flex-col items-center text-center justify-center gap-6 p-20 md:p-28 bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-700 text-white auth-hero">
          <div className="inline-flex items-center justify-center bg-white/12 rounded-xl p-3 shadow-md">
            <img src="/onir-logo.png" alt="Logo" className="h-10 w-10 object-contain" />
          </div>
          <div>
            <div className="text-sm opacity-90 mb-4">Legal AI</div>
            <h2 className="text-4xl md:text-5xl font-extrabold">Legal AI Assistant</h2>
            <p className="mt-4 text-lg md:text-xl opacity-90 max-w-xl mx-auto">Fast, accurate Italian legal guidance powered by AI. Secure & private for professional use.</p>
          </div>

          <div className="mt-8 p-6 bg-white/8 rounded-lg border border-white/6 max-w-md">
            <p className="text-sm md:text-base">Try the assistant with one of our subscription plans to unlock full access.</p>
          </div>
        </aside>

        {/* Right: reset card */}
        <main className="flex items-start md:items-center justify-center p-6 sm:p-8 bg-card overflow-auto py-12 md:py-0">
          <div className="w-full max-w-md sm:max-w-lg md:max-w-xl">
            <div className="auth-outer-card w-full px-2 sm:px-0">
              <Card className="auth-card auth-inner-card">
                <CardHeader className="text-center">
                  <img src="/onir-logo.png" alt="ONIR" className="mx-auto h-10 w-10 object-contain" />
                  <CardTitle className="text-2xl font-bold mt-2">Reset Password</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Enter a new password for your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {success ? (
                    <div className="text-center text-green-400">
                      Password reset successful! Redirecting to login...
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                      <div>
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Create a password (min 8 characters)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={loading}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={loading}
                          className="mt-2"
                        />
                      </div>
                      {error && <div className="text-red-400 text-sm">{error}</div>}
                      <div className="flex items-center justify-between gap-4">
                        <a
                          href="#"
                          className="text-sm text-blue-600 hover:underline font-normal"
                          style={{ background: 'none', border: 'none', padding: 0, outline: 'none', cursor: 'pointer' }}
                          onClick={(e) => { e.preventDefault(); window.location.href = '/login'; }}
                        >
                          Back to Login
                        </a>
                        <Button type="submit" className="py-2 px-4 bg-sky-400 text-slate-900 font-semibold rounded hover:bg-sky-300 transition" disabled={loading}>
                          {loading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResetPassword;
