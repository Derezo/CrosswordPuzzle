"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { puzzleAPI } from "@/lib/api";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

interface RecentPuzzle {
  puzzleDate: string;
  categoryName: string;
  wordCount: number;
}

export const Navigation: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showPuzzleDropdown, setShowPuzzleDropdown] = useState(false);
  const [recentPuzzles, setRecentPuzzles] = useState<RecentPuzzle[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while the mobile drawer is open so the page behind
  // doesn't scroll under the user's finger. Restore on close/unmount.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (mobileMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileMenuOpen]);

  // Close the drawer on route change.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    {
      href: "/theme-globe",
      label: "Theme Globe",
      icon: "🌌",
      gradient: "from-pink-500 to-purple-500",
    },
    {
      href: "/leaderboard",
      label: "Leaderboard",
      icon: "🏆",
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      href: "/achievements",
      label: "Achievements",
      icon: "⭐",
      gradient: "from-green-500 to-blue-500",
    },
  ];

  const handleLogout = () => {
    logout();
  };

  // Fetch recent puzzles when dropdown is opened
  useEffect(() => {
    if (showPuzzleDropdown) {
      puzzleAPI
        .getRecentCategoryPuzzles()
        .then((data) => setRecentPuzzles(data.recentPuzzles))
        .catch((err) => console.error("Failed to fetch recent puzzles:", err));
    }
  }, [showPuzzleDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowPuzzleDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="cosmic-card border-0 border-b border-purple-500/30 backdrop-blur-lg sticky top-0 z-50 pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/puzzle"
              className="flex items-center gap-2 group transition-all duration-300"
            >
              <div className="text-2xl cosmic-float transition-transform duration-300">
                🌌
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg nebula-text transition-transform duration-300">
                  Galactic Crossword
                </span>
                <span className="text-xs text-purple-300 -mt-1 opacity-70 hidden sm:block">
                  Journey through the cosmos
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:block">
            <div className="ml-6 flex items-baseline space-x-1">
              {/* Today&apos;s Puzzles Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowPuzzleDropdown(!showPuzzleDropdown)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 relative group overflow-hidden flex items-center gap-1.5",
                    {
                      "text-white font-semibold":
                        pathname === "/puzzle" || showPuzzleDropdown,
                      "text-gray-300 hover:text-white":
                        pathname !== "/puzzle" && !showPuzzleDropdown,
                    },
                  )}
                  style={{
                    background:
                      pathname === "/puzzle" || showPuzzleDropdown
                        ? `linear-gradient(135deg, var(--cosmic-purple), var(--galaxy-blue))`
                        : "transparent",
                  }}
                >
                  {/* Hover effect background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-lg" />

                  {/* Active glow effect */}
                  {(pathname === "/puzzle" || showPuzzleDropdown) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 animate-pulse rounded-lg" />
                  )}

                  <span className="relative flex items-center gap-1.5">
                    <span className="text-base">🧩</span>
                    <span className="hidden lg:inline">Today&apos;s Puzzles</span>
                    <span className="text-xs">
                      {showPuzzleDropdown ? "▲" : "▼"}
                    </span>
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showPuzzleDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-gray-900/95 backdrop-blur-none rounded-lg border border-purple-500/30 shadow-lg z-50">
                    <div className="py-1">
                      {/* Daily Puzzle Option */}
                      <Link
                        href="/puzzle"
                        onClick={() => setShowPuzzleDropdown(false)}
                        className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">📅</span>
                          <span>Daily Puzzle</span>
                        </div>
                      </Link>

                      {/* Recent Category Puzzles */}
                      {recentPuzzles.length > 0 && (
                        <>
                          <div className="border-t border-purple-500/20 my-1"></div>
                          <div className="px-4 py-1 text-xs text-purple-300 font-semibold">
                            Recent Category Puzzles
                          </div>
                          {recentPuzzles.map((puzzle) => (
                            <Link
                              key={puzzle.puzzleDate}
                              href={`/puzzle?date=${puzzle.puzzleDate}`}
                              onClick={() => setShowPuzzleDropdown(false)}
                              className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-500/20 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">🎯</span>
                                  <span className="truncate">
                                    {puzzle.categoryName}
                                  </span>
                                </div>
                                <span className="text-xs text-purple-300">
                                  {puzzle.wordCount} words
                                </span>
                              </div>
                            </Link>
                          ))}
                        </>
                      )}

                      {/* No recent puzzles message */}
                      {recentPuzzles.length === 0 && (
                        <>
                          <div className="border-t border-purple-500/20 my-1"></div>
                          <div className="px-4 py-2 text-xs text-gray-400">
                            No recent category puzzles. Generate one from the
                            Theme Globe!
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Other Navigation Items */}
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 relative group overflow-hidden",
                    {
                      "text-white font-semibold": pathname === item.href,
                      "text-gray-300 hover:text-white": pathname !== item.href,
                    },
                  )}
                  style={{
                    background:
                      pathname === item.href
                        ? `linear-gradient(135deg, var(--cosmic-purple), var(--galaxy-blue))`
                        : "transparent",
                  }}
                >
                  {/* Hover effect background */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-lg`}
                  />

                  {/* Active glow effect */}
                  {pathname === item.href && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 animate-pulse rounded-lg" />
                  )}

                  <span className="relative flex items-center gap-1.5">
                    <span className="text-base">{item.icon}</span>
                    <span className="hidden lg:inline">{item.label}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="flex items-center gap-2">
                {/* Points display */}
                <div className="flex items-center gap-1.5 cosmic-card px-2.5 py-1.5 border-yellow-500/30">
                  <div className="text-lg">⭐</div>
                  <div className="flex flex-col">
                    <span className="font-bold text-yellow-400 text-sm leading-none">
                      {user.points}
                    </span>
                    <span className="text-xs text-purple-200 -mt-0.5 hidden sm:block">
                      points
                    </span>
                  </div>
                </div>

                {/* Profile and Logout buttons */}
                <Link
                  href="/profile"
                  className={clsx("stellar-button text-xs px-2.5 py-1.5", {
                    "bg-purple-600 text-white": pathname === "/profile",
                  })}
                >
                  <span className="flex items-center gap-1.5">
                    <span>👤</span>
                    <span className="hidden md:inline">Profile</span>
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="stellar-button text-xs px-2.5 py-1.5"
                >
                  <span className="flex items-center gap-1.5">
                    <span>🚀</span>
                    <span className="hidden md:inline">Logout</span>
                  </span>
                </button>
              </div>
            )}

            {/* Hamburger toggle — mobile only. */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="md:hidden p-2 rounded-lg text-purple-200 hover:bg-purple-500/20 transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Mobile drawer + backdrop. Sliding panel from the right, body scroll is
          locked while it's open. Closes on backdrop tap or route change. */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              key="mobile-drawer-backdrop"
              className="md:hidden fixed inset-0 z-40 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              key="mobile-drawer-panel"
              className="md:hidden fixed right-0 z-50 w-72 max-w-[85vw] bg-[var(--dark-nebula)]/95 backdrop-blur-lg border-l border-purple-500/30 overflow-y-auto pl-4 pr-4 py-4"
              style={{
                top: 'calc(var(--nav-h, 3rem) + var(--safe-top, 0px))',
                bottom: 'var(--safe-bottom, 0px)',
              }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              role="dialog"
              aria-label="Mobile navigation menu"
            >
              <div className="space-y-1">
                {/* Mobile Puzzle Dropdown */}
                <div>
                  <button
                    onClick={() => setShowPuzzleDropdown(!showPuzzleDropdown)}
                    className={clsx(
                      "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative overflow-hidden flex items-center justify-between",
                      {
                        "text-white font-semibold":
                          pathname === "/puzzle" || showPuzzleDropdown,
                        "text-gray-300 hover:text-white":
                          pathname !== "/puzzle" && !showPuzzleDropdown,
                      },
                    )}
                    style={{
                      background:
                        pathname === "/puzzle" || showPuzzleDropdown
                          ? `linear-gradient(135deg, var(--cosmic-purple), var(--galaxy-blue))`
                          : "rgba(124, 58, 237, 0.1)",
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-lg">🧩</span>
                      <span>Today&apos;s Puzzles</span>
                    </span>
                    <span className="text-xs">
                      {showPuzzleDropdown ? "▲" : "▼"}
                    </span>
                  </button>

                  {showPuzzleDropdown && (
                    <div className="mt-1 ml-2 space-y-1">
                      <Link
                        href="/puzzle"
                        onClick={() => {
                          setShowPuzzleDropdown(false);
                          setMobileMenuOpen(false);
                        }}
                        className="block px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span>Daily Puzzle</span>
                        </div>
                      </Link>

                      {recentPuzzles.length > 0 && (
                        <>
                          <div className="px-3 py-1 text-xs text-purple-300 font-semibold">
                            Recent Category Puzzles
                          </div>
                          {recentPuzzles.map((puzzle) => (
                            <Link
                              key={puzzle.puzzleDate}
                              href={`/puzzle?date=${puzzle.puzzleDate}`}
                              onClick={() => {
                                setShowPuzzleDropdown(false);
                                setMobileMenuOpen(false);
                              }}
                              className="block px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span>🎯</span>
                                  <span className="truncate">
                                    {puzzle.categoryName}
                                  </span>
                                </div>
                                <span className="text-xs text-purple-300">
                                  {puzzle.wordCount}w
                                </span>
                              </div>
                            </Link>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx(
                      "block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative overflow-hidden",
                      {
                        "text-white font-semibold": pathname === item.href,
                        "text-gray-300 hover:text-white": pathname !== item.href,
                      },
                    )}
                    style={{
                      background:
                        pathname === item.href
                          ? `linear-gradient(135deg, var(--cosmic-purple), var(--galaxy-blue))`
                          : "rgba(124, 58, 237, 0.1)",
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};
