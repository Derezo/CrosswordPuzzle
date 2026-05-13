'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { leaderboardAPI } from '@/lib/api';
import { LeaderboardEntry } from '@/types';

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadLeaderboard();
    }
  }, [user, authLoading, router]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await leaderboardAPI.getTop100();
      setLeaderboard(data.leaderboard);
      setUserRank(data.userRank || null);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '⭐';
    }
  };

  const getRankClasses = (rank: number, isCurrentUser?: boolean) => {
    // Stack the rank info above the points pill on phones — at 360px the
    // single-row layout otherwise wraps name + "TOP 3" + "You" + points pill
    // into a cramped flex line.
    let baseClasses = 'cosmic-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-3 sm:p-4 transition-all duration-300 cursor-pointer';
    
    if (isCurrentUser) {
      baseClasses += ' border-2 border-purple-400/60 bg-gradient-to-br from-purple-500/30 to-blue-500/30 ring-2 ring-purple-400/50 shadow-lg';
    } else {
      switch (rank) {
        case 1:
          baseClasses += ' border-2 border-yellow-400/60 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 shadow-xl';
          break;
        case 2:
          baseClasses += ' border-2 border-gray-400/60 bg-gradient-to-br from-gray-500/30 to-slate-500/30 shadow-lg';
          break;
        case 3:
          baseClasses += ' border-2 border-orange-400/60 bg-gradient-to-br from-orange-500/30 to-red-500/30 shadow-lg';
          break;
        default:
          baseClasses += ' hover:border-purple-400/40';
      }
    }
    
    return baseClasses;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="cosmic-card p-8 flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500/30 border-t-yellow-500"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-yellow-500/20"></div>
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-medium mb-2">Loading galactic hall of fame...</p>
              <p className="text-purple-200 text-sm">Scanning the universe for top solvers 🏆</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="cosmic-card p-8 text-center max-w-md">
            <div className="text-6xl mb-6">⚠️</div>
            <h2 className="stellar-text text-2xl font-bold mb-4">Houston, we have a problem!</h2>
            <p className="text-red-400 text-lg mb-6">{error}</p>
            <button
              onClick={loadLeaderboard}
              className="stellar-button"
            >
              🚀 Retry Mission
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 animate-pulse"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-6xl cosmic-float">🏆</div>
              <div className="flex flex-col">
                <h1 className="text-4xl md:text-6xl font-bold stellar-text mb-2">
                  Galactic Hall of Fame
                </h1>
                <div className="flex items-center justify-center gap-2 text-purple-200">
                  <span className="text-2xl">⭐</span>
                  <p className="text-lg md:text-xl">
                    Elite Cosmic Crossword Champions
                  </p>
                </div>
              </div>
              <div className="text-6xl cosmic-float" style={{ animationDelay: '2s' }}>👑</div>
            </div>
            <p className="text-purple-200 text-lg max-w-2xl mx-auto">
              Witness the greatest puzzle solvers in the known universe! May their cosmic wisdom inspire your journey. 🌟
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-12">

        <div className="space-y-8">
          {/* User's Rank (if not in top 100) */}
          {userRank && userRank.rank > 100 && (
            <div className="cosmic-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📍</span>
                <h3 className="text-2xl font-bold text-white">Your Cosmic Position</h3>
              </div>
              <div className={getRankClasses(userRank.rank, true)}>
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{getRankIcon(userRank.rank)}</span>
                  <div>
                    <span className="font-bold text-white text-2xl">#{userRank.rank}</span>
                    <div className="text-purple-200 text-lg">
                      {userRank.user.firstName} {userRank.user.lastName}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-full">
                  <span className="text-2xl">⭐</span>
                  <span className="font-bold text-yellow-300 text-xl">{userRank.points}</span>
                </div>
              </div>
            </div>
          )}

          {/* Top 100 Leaderboard */}
          <div className="cosmic-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🎖️</span>
              <h3 className="text-2xl font-bold text-white">Top 100 Galactic Champions</h3>
            </div>
            <div className="space-y-4">
              {leaderboard.map((entry) => {
                const isCurrentUser = user?.id === entry.user.id;
                
                return (
                  <div
                    key={entry.user.id}
                    className={getRankClasses(entry.rank, isCurrentUser)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl sm:text-4xl">{getRankIcon(entry.rank)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-white text-xl">#{entry.rank}</span>
                          {entry.rank <= 3 && (
                            <span className="text-[0.6rem] sm:text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full">
                              TOP 3
                            </span>
                          )}
                        </div>
                        <div className={`text-lg ${isCurrentUser ? 'font-bold text-purple-200' : 'text-purple-100'}`}>
                          {entry.user.firstName} {entry.user.lastName}
                          {isCurrentUser && (
                            <span className="ml-3 text-sm bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full font-semibold">
                              ✨ You
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1 sm:px-4 sm:py-2 rounded-full self-end sm:self-auto">
                      <span className="text-xl sm:text-2xl">⭐</span>
                      <span className="font-bold text-yellow-300 text-base sm:text-xl">{entry.points}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {leaderboard.length === 0 && (
              <div className="text-center py-12 cosmic-card p-8">
                <div className="text-8xl mb-6 cosmic-float">🌌</div>
                <h3 className="text-2xl font-bold text-white mb-4">The Galaxy Awaits Champions!</h3>
                <p className="text-purple-200 text-lg mb-2">No cosmic warriors have claimed their place yet</p>
                <p className="text-purple-300">Be the first to conquer a stellar puzzle! 🎆</p>
              </div>
            )}
          </div>
        </div>

        {/* Points Information */}
        <div className="cosmic-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">📊</span>
            <h3 className="text-2xl font-bold text-white">Cosmic Point System</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-6">
              <h4 className="font-bold text-yellow-300 mb-4 text-xl flex items-center gap-2">
                <span>🏆</span>
                <span>Elite Achievements</span>
              </h4>
              <ul className="space-y-3 text-purple-100">
                <li className="flex items-center gap-2">
                  <span>⚡</span>
                  <span>Speed Demon: <strong className="text-yellow-300">100 points</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🌟</span>
                  <span>Daily Champion: <strong className="text-yellow-300">200 points</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🔥</span>
                  <span>Week Warrior: <strong className="text-yellow-300">150 points</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span>✨</span>
                  <span>Perfect Solver: <strong className="text-yellow-300">75 points</strong></span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-6">
              <h4 className="font-bold text-blue-300 mb-4 text-xl flex items-center gap-2">
                <span>⚡</span>
                <span>Stellar Bonuses</span>
              </h4>
              <ul className="space-y-3 text-purple-100">
                <li className="flex items-center gap-2">
                  <span>🚀</span>
                  <span>Lightning Fast: <strong className="text-blue-300">50 points</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🌅</span>
                  <span>Early Bird: <strong className="text-blue-300">40 points</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🌃</span>
                  <span>Night Owl: <strong className="text-blue-300">40 points</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🎨</span>
                  <span>Word Master: <strong className="text-blue-300">30 points</strong></span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}