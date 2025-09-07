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
    { href: '/puzzle', label: "Today's Puzzle", icon: '🧩' },
    { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { href: '/achievements', label: 'Achievements', icon: '⭐' },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 text-white shadow-lg border-b border-white border-opacity-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/puzzle" className="flex items-center gap-2">
              <span className="text-2xl">🌌</span>
              <span className="font-bold text-xl bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                Galactic Crossword
              </span>
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 border',
                    {
                      'bg-white bg-opacity-30 text-white shadow-lg border-white border-opacity-40 font-semibold': pathname === item.href,
                      'text-gray-100 hover:bg-white hover:bg-opacity-20 hover:text-white hover:border-white hover:border-opacity-30 border-transparent': pathname !== item.href,
                    }
                  )}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-gray-100">Welcome,</span>{' '}
                  <span className="font-medium text-white">{user.firstName}</span>
                </div>
                <div className="flex items-center gap-1 bg-white bg-opacity-20 rounded-full px-3 py-1">
                  <span className="text-yellow-400">⭐</span>
                  <span className="font-bold">{user.points}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-100 hover:text-white hover:bg-white hover:bg-opacity-10 px-3 py-1 rounded-md text-sm transition-all duration-200 border border-transparent hover:border-white hover:border-opacity-30"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 border',
                  {
                    'bg-white bg-opacity-30 text-white border-white border-opacity-40 font-semibold': pathname === item.href,
                    'text-gray-100 hover:bg-white hover:bg-opacity-20 hover:text-white hover:border-white hover:border-opacity-30 border-transparent': pathname !== item.href,
                  }
                )}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};