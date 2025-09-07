'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import clsx from 'clsx';

export const Navigation: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { href: '/puzzle', label: "Today's Puzzle", icon: '🧩', gradient: 'from-purple-500 to-blue-500' },
    { href: '/leaderboard', label: 'Leaderboard', icon: '🏆', gradient: 'from-yellow-500 to-orange-500' },
    { href: '/achievements', label: 'Achievements', icon: '⭐', gradient: 'from-green-500 to-blue-500' },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="cosmic-card border-0 border-b border-purple-500/30 backdrop-blur-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/puzzle" className="flex items-center gap-3 group transition-all duration-300">
              <div className="text-3xl cosmic-float transition-transform duration-300">🌌</div>
              <div className="flex flex-col">
                <span className="font-bold text-2xl nebula-text transition-transform duration-300">
                  Galactic Crossword
                </span>
                <span className="text-xs text-purple-300 -mt-1 opacity-80">
                  Journey through the cosmos
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 relative group overflow-hidden',
                    {
                      'text-white font-semibold': pathname === item.href,
                      'text-gray-300 hover:text-white': pathname !== item.href,
                    }
                  )}
                  style={{
                    background: pathname === item.href 
                      ? `linear-gradient(135deg, var(--cosmic-purple), var(--galaxy-blue))`
                      : 'transparent'
                  }}
                >
                  {/* Hover effect background */}
                  <div 
                    className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl`}
                  />
                  
                  {/* Active glow effect */}
                  {pathname === item.href && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 animate-pulse rounded-xl" />
                  )}
                  
                  <span className="relative flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-3">
                {/* User greeting - hidden on small screens */}
                <div className="hidden lg:block text-sm">
                  <span className="text-purple-200">Welcome back,</span>{' '}
                  <span className="font-semibold text-white">{user.firstName}</span>
                </div>
                
                {/* Points display */}
                <div className="flex items-center gap-2 cosmic-card px-4 py-2 border-yellow-500/30">
                  <div className="text-2xl">⭐</div>
                  <div className="flex flex-col">
                    <span className="font-bold text-yellow-400 text-lg">{user.points}</span>
                    <span className="text-xs text-purple-200 -mt-1">cosmic points</span>
                  </div>
                </div>
                
                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  className="stellar-button text-sm px-4 py-2"
                >
                  <span className="flex items-center gap-2">
                    <span>🚀</span>
                    <span className="hidden sm:inline">Logout</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-purple-500/20">
          <div className="px-4 pt-4 pb-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'block px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 relative overflow-hidden',
                  {
                    'text-white font-semibold': pathname === item.href,
                    'text-gray-300 hover:text-white': pathname !== item.href,
                  }
                )}
                style={{
                  background: pathname === item.href 
                    ? `linear-gradient(135deg, var(--cosmic-purple), var(--galaxy-blue))`
                    : 'rgba(124, 58, 237, 0.1)'
                }}
              >
                <span className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};