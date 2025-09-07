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
    let baseClasses = 'flex items-center justify-between p-4 rounded-lg border transition-all duration-200';
    
    if (isCurrentUser) {
      baseClasses += ' bg-purple-100 border-purple-300 ring-2 ring-purple-500';
    } else {
      switch (rank) {
        case 1:
          baseClasses += ' bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300';
          break;
        case 2:
          baseClasses += ' bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300';
          break;
        case 3:
          baseClasses += ' bg-gradient-to-r from-orange-100 to-orange-200 border-orange-300';
          break;
        default:
          baseClasses += ' bg-white border-gray-200 hover:bg-gray-50';
      }
    }
    
    return baseClasses;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="text-white text-lg">Loading cosmic leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <button
              onClick={loadLeaderboard}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            🏆 Galactic Leaderboard
          </h1>
          <p className="text-gray-300">
            Top cosmic crossword solvers across the universe
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* User's Rank (if not in top 100) */}
          {userRank && userRank.rank > 100 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Your Position</h3>
              <div className={getRankClasses(userRank.rank, true)}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getRankIcon(userRank.rank)}</span>
                  <div>
                    <span className="font-bold text-gray-800">#{userRank.rank}</span>
                    <span className="text-gray-600 ml-2">
                      {userRank.user.firstName} {userRank.user.lastName}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span>
                  <span className="font-bold text-gray-800">{userRank.points}</span>
                </div>
              </div>
            </div>
          )}

          {/* Top 100 Leaderboard */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Top 100 Players</h3>
            <div className="space-y-3">
              {leaderboard.map((entry) => {
                const isCurrentUser = user?.id === entry.user.id;
                
                return (
                  <div
                    key={entry.user.id}
                    className={getRankClasses(entry.rank, isCurrentUser)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getRankIcon(entry.rank)}</span>
                      <div>
                        <span className="font-bold text-gray-800">#{entry.rank}</span>
                        <span className={`ml-2 ${isCurrentUser ? 'font-bold text-purple-800' : 'text-gray-600'}`}>
                          {entry.user.firstName} {entry.user.lastName}
                          {isCurrentUser && (
                            <span className="ml-2 text-sm bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                              You
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="font-bold text-gray-800">{entry.points}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {leaderboard.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🌌</span>
                <p className="text-gray-500 text-lg">No players yet</p>
                <p className="text-gray-400">Be the first to solve a puzzle!</p>
              </div>
            )}
          </div>
        </div>

        {/* Points Information */}
        <div className="mt-8 bg-white bg-opacity-10 text-white rounded-lg p-6">
          <h3 className="text-lg font-bold mb-3">How to Earn Points</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-yellow-400 mb-2">🏆 Achievements</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Speed Demon: 100 points</li>
                <li>• Daily Champion: 200 points</li>
                <li>• Week Warrior: 150 points</li>
                <li>• Perfect Solver: 75 points</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-400 mb-2">⚡ Special Bonuses</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Lightning Fast: 50 points</li>
                <li>• Early Bird: 40 points</li>
                <li>• Night Owl: 40 points</li>
                <li>• Word Master: 30 points</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}