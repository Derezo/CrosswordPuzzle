'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showJiggle, setShowJiggle] = useState(false);
  
  // Add page lifecycle debugging
  React.useEffect(() => {
    console.log('🔄 Login page mounted');
    
    // Check for persisted error from before page reload
    const persistedError = sessionStorage.getItem('login-error');
    if (persistedError) {
      console.log('🔄 Restoring error after page reload:', persistedError);
      setTimeout(() => showToastError(persistedError), 100);
      sessionStorage.removeItem('login-error');
    }
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('🚨 Page is about to unload/refresh!');
    };
    
    const handleUnload = () => {
      console.log('🚨 Page unloaded!');
    };
    
    const handlePopstate = () => {
      console.log('🚨 Navigation detected (back/forward)');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('popstate', handlePopstate);
    
    return () => {
      console.log('🔄 Login page unmounting');
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      window.removeEventListener('popstate', handlePopstate);
    };
  }, []);

  // Bulletproof error display using DOM manipulation
  const showToastError = (message: string) => {
    console.log('🍞 Showing toast error:', message);
    console.log('🌐 Current URL:', window.location.href);
    console.log('📍 Page readyState:', document.readyState);
    
    // Remove any existing toast
    const existing = document.getElementById('login-error-toast');
    if (existing) {
      existing.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'login-error-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      max-width: 500px;
      padding: 16px 20px;
      background: linear-gradient(to bottom right, rgba(239, 68, 68, 0.2), rgba(236, 72, 153, 0.2));
      border: 1px solid rgba(239, 68, 68, 0.5);
      border-radius: 12px;
      backdrop-filter: blur(12px);
      color: rgb(254, 202, 202);
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      animation: jiggle 0.6s ease-in-out, slideIn 0.3s ease-out;
    `;
    
    toast.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <span style="font-size: 24px; animation: bounce 1s infinite;">🚨</span>
        <div style="flex: 1;">
          <h4 style="margin: 0 0 8px 0; font-weight: 600; color: rgb(254, 226, 226);">Houston, We Have a Problem!</h4>
          <p style="margin: 0; font-size: 14px; line-height: 1.4;">${message}</p>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                  style="margin-top: 12px; background: none; border: none; color: rgb(252, 165, 165); 
                         cursor: pointer; font-size: 12px; text-decoration: underline;">
            ✕ Dismiss
          </button>
        </div>
      </div>
    `;
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes jiggle {
        0% { transform: translateX(-50%) translateX(0); }
        10% { transform: translateX(-50%) translateX(-8px); }
        20% { transform: translateX(-50%) translateX(8px); }
        30% { transform: translateX(-50%) translateX(-6px); }
        40% { transform: translateX(-50%) translateX(6px); }
        50% { transform: translateX(-50%) translateX(-4px); }
        60% { transform: translateX(-50%) translateX(4px); }
        70% { transform: translateX(-50%) translateX(-2px); }
        80% { transform: translateX(-50%) translateX(2px); }
        90% { transform: translateX(-50%) translateX(-1px); }
        100% { transform: translateX(-50%) translateX(0); }
      }
      @keyframes slideIn {
        from { transform: translateX(-50%) translateY(-100px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      if (document.getElementById('login-error-toast')) {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  };
  const { login } = useAuth();
  const router = useRouter();

  // Function to get user-friendly error message
  const getFriendlyErrorMessage = (originalError: string) => {
    const lowerError = originalError.toLowerCase();
    
    if (lowerError.includes('invalid credentials') || lowerError.includes('invalid email or password')) {
      return 'Oops! The email or password you entered doesn\'t match our records. Please double-check and try again. 🔍';
    }
    if (lowerError.includes('user not found') || lowerError.includes('email not found')) {
      return 'We couldn\'t find an account with that email address. Would you like to create a new account instead? 🚀';
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
    
    // Fallback for any other errors
    return `Something went wrong: ${originalError}. Please try again or contact support if the problem persists. 💫`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📝 Form submit triggered - prevented default and propagation');
    setLoading(true);
    setShowJiggle(false);

    try {
      console.log('🚀 Starting login attempt');
      console.log('🌐 URL before login:', window.location.href);
      await login(email, password);
      console.log('✅ Login successful, navigating to puzzle');
      console.log('🌐 URL after login:', window.location.href);
      router.push('/puzzle');
    } catch (err: any) {
      const friendlyMessage = getFriendlyErrorMessage(err.message || 'Login failed');
      console.log('🚨 Login failed, showing error');
      console.log('🌐 URL during error:', window.location.href);
      console.log('📄 Document visibility:', document.visibilityState);
      
      // Persist error to survive page reload
      console.log('💾 Persisting error to sessionStorage');
      sessionStorage.setItem('login-error', friendlyMessage);
      
      // Add a small delay to ensure toast is created after any potential page changes
      setTimeout(() => {
        console.log('🍞 Creating toast after delay');
        showToastError(friendlyMessage);
      }, 100);
      
      // Reset jiggle animation after it completes
      setTimeout(() => {
        setShowJiggle(false);
      }, 600);
    } finally {
      console.log('🏁 Login attempt finished');
      console.log('🌐 Final URL:', window.location.href);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      // Don't clear error immediately to allow user to read it
                    }}
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      // Don't clear error immediately to allow user to read it
                    }}
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