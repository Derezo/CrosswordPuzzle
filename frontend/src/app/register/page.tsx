'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      await register({ email, password, firstName, lastName });
      router.push('/puzzle');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Cosmic background with floating elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-purple-900/20 to-blue-900/20"></div>
        <div className="absolute top-32 right-20 w-40 h-40 bg-green-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 left-16 w-56 h-56 bg-purple-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-28 h-28 bg-blue-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full">
          {/* Header Section */}
          <div className="cosmic-card p-8 mb-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="text-8xl cosmic-float">🚀</div>
            </div>
            <h1 className="text-4xl font-bold aurora-text mb-4">
              Join the Galaxy
            </h1>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Begin Your Cosmic Journey!
            </h2>
            <p className="text-purple-200">
              Create your account and become a stellar puzzle explorer ⭐
            </p>
          </div>

          {/* Registration Form */}
          <div className="cosmic-card p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-purple-200 mb-2">
                      <span className="flex items-center gap-2">
                        <span>👤</span>
                        <span>First Name</span>
                      </span>
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      className="cosmic-input"
                      placeholder="Your first name..."
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-purple-200 mb-2">
                      <span className="flex items-center gap-2">
                        <span>👤</span>
                        <span>Last Name</span>
                      </span>
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      className="cosmic-input"
                      placeholder="Your last name..."
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Email Field */}
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
                
                {/* Password Field */}
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
                    autoComplete="new-password"
                    required
                    className="cosmic-input"
                    placeholder="Create a strong password (min 8 chars)..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="cosmic-card border-red-500/50 bg-gradient-to-br from-red-500/20 to-pink-500/20 p-4">
                  <div className="flex items-center gap-2 text-red-300">
                    <span className="text-xl">⚠️</span>
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full aurora-button text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Initiating cosmic registration...</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>✨</span>
                    <span>Create Galactic Account</span>
                  </span>
                )}
              </button>

              <div className="text-center pt-4">
                <p className="text-purple-200 text-sm">
                  Already exploring the cosmos?{' '}
                  <Link 
                    href="/login" 
                    className="font-semibold nebula-text inline-block transition-all duration-200"
                  >
                    ← Return to Mission Control
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