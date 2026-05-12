'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoginErrorToast } from '@/components/LoginErrorToast';

// Translate raw backend / network errors into something a user can act on.
const getFriendlyErrorMessage = (originalError: string): string => {
  const lowerError = originalError.toLowerCase();

  if (
    lowerError.includes('invalid credentials') ||
    lowerError.includes('invalid email or password')
  ) {
    return "Oops! The email or password you entered doesn't match our records. Please double-check and try again. 🔍";
  }
  if (lowerError.includes('user not found') || lowerError.includes('email not found')) {
    return "We couldn't find an account with that email address. Would you like to create a new account instead? 🚀";
  }
  if (lowerError.includes('too many attempts') || lowerError.includes('rate limit')) {
    return 'Too many login attempts! Please wait a few minutes before trying again. ⏰';
  }
  if (lowerError.includes('network') || lowerError.includes('connection')) {
    return 'Connection trouble detected! Please check your internet and try again. 🌐';
  }
  if (lowerError.includes('server') || lowerError.includes('500')) {
    return 'Our servers are having a moment! Please try again in a few seconds. 🛠️';
  }

  return `Something went wrong: ${originalError}. Please try again or contact support if the problem persists. 💫`;
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const router = useRouter();

  // Restore any error persisted across a page reload (mirrors the previous
  // sessionStorage behaviour, just without manual DOM mutation).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const persistedError = sessionStorage.getItem('login-error');
    if (persistedError) {
      setError(persistedError);
      sessionStorage.removeItem('login-error');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      router.push('/puzzle');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      const friendlyMessage = getFriendlyErrorMessage(errorMessage);

      // Persist the error so it survives a hard reload (some browsers reload
      // the page on form submission errors with certain extensions).
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('login-error', friendlyMessage);
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {error && (
        <LoginErrorToast
          // Key on the message so the same error firing twice re-runs the
          // animation (and so a different error replaces the current toast).
          key={error}
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Cosmic background with floating elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20"></div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-48 h-48 bg-blue-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-green-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Header Section */}
          <div className="cosmic-card p-8 mb-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="text-8xl cosmic-float">🌌</div>
            </div>
            <h1 className="text-4xl font-bold nebula-text mb-4">
              Galactic Crossword
            </h1>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Welcome Back, Explorer!
            </h2>
            <p className="text-purple-200">
              Sign in to continue your cosmic puzzle journey through the stars ✨
            </p>
          </div>

          {/* Login Form */}
          <div className="cosmic-card p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-purple-200 mb-2">
                    <span className="flex items-center gap-2">
                      <span>📧</span>
                      <span>Email Address</span>
                    </span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="cosmic-input"
                    placeholder="Enter your galactic email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-purple-200 mb-2">
                    <span className="flex items-center gap-2">
                      <span>🔐</span>
                      <span>Password</span>
                    </span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="cosmic-input"
                    placeholder="Enter your cosmic password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>


              <button
                type="submit"
                disabled={loading}
                className="w-full nebula-button text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Launching into space...</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>🚀</span>
                    <span>Launch Mission (Sign In)</span>
                  </span>
                )}
              </button>

              <div className="text-center pt-4">
                <p className="text-purple-200 text-sm">
                  New to the galaxy?{' '}
                  <Link
                    href="/register"
                    className="font-semibold stellar-text inline-block transition-all duration-200"
                  >
                    Join the Cosmic Community →
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
