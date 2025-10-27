import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { apiClient } from '../lib/api';

interface AuthFormProps {
  onSuccess?: () => void;
}


export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('login');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleSubmit = async (isRegister: boolean) => {
    setError('');
    setIsLoading(true);

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
  // Ensure redirect to chat after successful auth
  onSuccess?.();
  window.location.href = '/';
    } catch (error: any) {
      setError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCredential = async (credentialResponse: any) => {
    const idToken = credentialResponse?.credential;
    if (!idToken) return;

    setIsLoading(true);
    setError('');
    try {
      const resp = await apiClient.googleLogin(idToken);
      localStorage.setItem('token', resp.access_token);
      // trigger parent onSuccess to refresh auth state
  onSuccess?.();
  window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-theme auth-background fixed inset-0 z-40 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' as any }}>
      <div className="grid min-h-screen grid-cols-1 md:[grid-template-columns:55%_45%]">
        {/* Left hero / branding (expanded) */}
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

        {/* Right: auth card */}
        <main className="flex items-start md:items-center justify-center p-6 sm:p-8 bg-card overflow-auto py-12 md:py-0">
          <div className="w-full max-w-md sm:max-w-lg md:max-w-xl">
            <div className="auth-outer-card w-full px-2 sm:px-0">
              <Card className="auth-card auth-inner-card">
                <CardHeader className="text-center">
                  <img src="/onir-logo.png" alt="ONIR" className="mx-auto h-10 w-10 object-contain" />
                  <CardTitle className="text-2xl font-bold mt-2">Welcome back</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Sign in or create an account to access premium legal consultation services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {showForgot ? (
                    <div className="space-y-6 mt-4">
                      <h3 className="text-xl font-semibold text-center text-sky-400">Forgot Password</h3>
                      {forgotSubmitted ? (
                        <div className="text-center text-green-400">
                          If the email exists, a reset link has been sent.
                        </div>
                      ) : (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setIsLoading(true);
                            setError("");
                            try {
                              const res = await fetch("/api/auth/request-password-reset", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ email }),
                              });
                              if (!res.ok) throw new Error("Failed to send reset email.");
                              setForgotSubmitted(true);
                            } catch (err: any) {
                              setError(err.message || "Something went wrong.");
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                          className="space-y-6"
                        >
                          <div>
                            <Label htmlFor="forgot-email">Email address</Label>
                            <Input
                              id="forgot-email"
                              type="email"
                              className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              required
                              autoFocus
                              disabled={isLoading}
                            />
                          </div>
                          {error && <div className="text-red-400 text-sm">{error}</div>}
                          <div className="flex flex-row items-center justify-between gap-4">
                            <a
                              href="#"
                              className="text-sm text-blue-600 hover:underline font-normal"
                              style={{ background: 'none', border: 'none', padding: 0, outline: 'none', cursor: 'pointer' }}
                              onClick={e => { e.preventDefault(); setShowForgot(false); setForgotSubmitted(false); setError(""); }}
                            >
                              Back to Login
                            </a>
                            <Button
                              type="submit"
                              className="py-2 px-4 bg-sky-400 text-slate-900 font-semibold rounded hover:bg-sky-300 transition"
                              disabled={isLoading}
                            >
                              {isLoading ? "Sending..." : "Send Reset Link"}
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-2 gap-2 h-11 overflow-visible">
                        <TabsTrigger value="login" className="flex items-center justify-center h-10 px-4 rounded-full bg-gradient-to-r from-[#9333ea] to-[#c084fc] text-white shadow-sm text-sm md:text-base leading-none">Sign In</TabsTrigger>
                        <TabsTrigger value="register" className="flex items-center justify-center h-10 px-4 rounded-full bg-gradient-to-r from-[#9333ea] to-[#c084fc] text-white shadow-sm text-sm md:text-base leading-none">Sign Up</TabsTrigger>
                      </TabsList>

                      <TabsContent value="login" className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                          />
                          <div className="flex justify-center mt-4 mb-2">
                            <a
                              href="#"
                              className="text-sm text-blue-600 hover:underline font-normal"
                              style={{ background: 'none', border: 'none', padding: 0, outline: 'none', cursor: 'pointer' }}
                              onClick={e => { e.preventDefault(); setShowForgot(true); setError(""); }}
                            >
                              Forgot Password?
                            </a>
                          </div>
                        </div>
                        {error && (
                          <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        )}
                        <Button
                          onClick={() => handleSubmit(false)}
                          disabled={isLoading}
                          className="w-full bg-gradient-to-r from-[#9333ea] to-[#c084fc] text-white text-sm md:text-base py-2"
                        >
                          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Sign In
                        </Button>
                        <div className="mt-3 flex justify-center">
                          <GoogleLogin onSuccess={handleGoogleCredential} onError={() => setError('Google sign-in failed')} />
                        </div>
                      </TabsContent>

                      <TabsContent value="register" className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-email">Email</Label>
                          <Input
                            id="register-email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-password">Password</Label>
                          <Input
                            id="register-password"
                            type="password"
                            placeholder="Create a password (min 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm Password</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                          />
                        </div>
                        {error && (
                          <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        )}
                        <Button
                          onClick={() => handleSubmit(true)}
                          disabled={isLoading}
                          className="w-full bg-gradient-to-r from-[#9333ea] to-[#c084fc] text-white text-sm md:text-base py-2"
                        >
                          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Create Account
                        </Button>
                      </TabsContent>
                    </Tabs>
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
