'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { achievementAPI } from '@/lib/api';
import { Achievement } from '@/types';

export default function AchievementsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<{ 
    recentAchievements: Array<{ id: string; achievement: { icon: string; name: string; points?: number }; earnedAt: string }>;
    totalEarned: number;
    totalPoints: number; 
    completionPercentage: number;
    totalAvailable: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadAchievements();
    }
  }, [user, authLoading, router]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const [achievementsData, statsData] = await Promise.all([
        achievementAPI.getAvailableAchievements(),
        achievementAPI.getAchievementStats()
      ]);
      
      setAchievements((achievementsData as any).achievements);
      setStats(statsData as unknown as { 
        recentAchievements: Array<{ id: string; achievement: { icon: string; name: string; points?: number }; earnedAt: string }>;
        totalEarned: number;
        totalPoints: number; 
        completionPercentage: number;
        totalAvailable: number;
      });
    } catch (error) {
      console.error('Error loading achievements:', error);
      setError('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const getAchievementClasses = (achievement: Achievement) => {
    const baseClasses = 'cosmic-card p-6 transition-all duration-300 cursor-pointer';
    
    if (achievement.earned) {
      return `${baseClasses} border-2 border-yellow-400/60 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 shadow-xl ring-2 ring-yellow-400/30`;
    } else {
      return `${baseClasses} opacity-60 hover:opacity-80 border-gray-500/30`;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="cosmic-card p-8 flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500/30 border-t-green-500"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-green-500/20"></div>
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-medium mb-2">Loading stellar achievements...</p>
              <p className="text-purple-200 text-sm">Cataloging your cosmic accomplishments ⭐</p>
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
            <h2 className="stellar-text text-2xl font-bold mb-4">Achievement Load Failed!</h2>
            <p className="text-red-400 text-lg mb-6">{error}</p>
            <button
              onClick={loadAchievements}
              className="aurora-button"
            >
              ✨ Reload Achievements
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
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 animate-pulse"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-6xl cosmic-float">⭐</div>
              <div className="flex flex-col">
                <h1 className="text-4xl md:text-6xl font-bold aurora-text mb-2">
                  Stellar Achievements
                </h1>
                <div className="flex items-center justify-center gap-2 text-purple-200">
                  <span className="text-2xl">🏆</span>
                  <p className="text-lg md:text-xl">
                    Your Epic Cosmic Journey
                  </p>
                </div>
              </div>
              <div className="text-6xl cosmic-float" style={{ animationDelay: '2s' }}>🎆</div>
            </div>
            <p className="text-purple-200 text-lg max-w-2xl mx-auto">
              Track your legendary accomplishments as you master the art of galactic crosswords! 🌠
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-12">

        {/* Stats Overview */}
        {stats && (
          <div className="cosmic-card p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📊</span>
              <h2 className="text-2xl font-bold text-white">Achievement Statistics</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-4">
                <div className="text-4xl font-bold text-purple-300 mb-2">
                  {stats.totalEarned}
                </div>
                <div className="text-sm text-purple-100 font-medium">Achievements Earned</div>
                <div className="text-2xl mt-2">✨</div>
              </div>
              <div className="text-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4">
                <div className="text-4xl font-bold text-blue-300 mb-2">
                  {stats.totalPoints}
                </div>
                <div className="text-sm text-blue-100 font-medium">Total Points</div>
                <div className="text-2xl mt-2">🎯</div>
              </div>
              <div className="text-center bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4">
                <div className="text-4xl font-bold text-green-300 mb-2">
                  {stats.completionPercentage}%
                </div>
                <div className="text-sm text-green-100 font-medium">Completion</div>
                <div className="text-2xl mt-2">🚀</div>
              </div>
              <div className="text-center bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4">
                <div className="text-4xl font-bold text-yellow-300 mb-2">
                  {stats.totalAvailable}
                </div>
                <div className="text-sm text-yellow-100 font-medium">Total Available</div>
                <div className="text-2xl mt-2">🏆</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Achievements */}
        {stats && stats.recentAchievements.length > 0 && (
          <div className="cosmic-card p-6 mb-8 border-2 border-yellow-500/40 bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🎆</span>
              <h2 className="text-2xl font-bold text-white">Recently Conquered!</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.recentAchievements.map((achievement: { id: string; achievement: { icon: string; name: string }; earnedAt: string }) => (
                <div
                  key={achievement.id}
                  className="cosmic-card flex items-center gap-4 p-4 border border-yellow-400/40 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 transition-all duration-300"
                >
                  <span className="text-3xl animate-bounce">{achievement.achievement.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold text-white text-lg">{achievement.achievement.name}</div>
                    <div className="text-yellow-300 font-bold flex items-center gap-1">
                      <span>⭐</span>
                      <span>+{(achievement.achievement as { points?: number }).points || 0} points</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Achievements */}
        <div className="cosmic-card p-8">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-3xl">🏅</span>
            <h2 className="text-2xl font-bold text-white">Achievement Gallery</h2>
          </div>
          
          {achievements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={getAchievementClasses(achievement)}
                >
                  <div className="text-center h-full flex flex-col">
                    <div className={`text-6xl mb-4 ${achievement.earned ? 'animate-bounce' : 'grayscale opacity-50'}`}>
                      {achievement.icon}
                    </div>
                    <h3 className="font-bold text-xl text-white mb-3">
                      {achievement.name}
                    </h3>
                    <p className="text-purple-200 text-sm mb-6 flex-1">
                      {achievement.description}
                    </p>
                    
                    <div className="flex items-center justify-center gap-2 mb-4 bg-yellow-500/20 px-4 py-2 rounded-full">
                      <span className="text-2xl">⭐</span>
                      <span className="font-bold text-yellow-300 text-lg">{achievement.points} points</span>
                    </div>
                    
                    {achievement.earned ? (
                      <div className="mt-auto">
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
                          ✨ Conquered!
                          {achievement.earnedAt && (
                            <span className="ml-2 text-xs opacity-90">
                              {new Date(achievement.earnedAt).toLocaleDateString()}
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-auto">
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300 border border-gray-600">
                          🔒 Awaiting Hero
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 cosmic-card p-8">
              <div className="text-8xl mb-6 cosmic-float">🌌</div>
              <h3 className="text-2xl font-bold text-white mb-4">Achievement Vault Empty!</h3>
              <p className="text-purple-200 text-lg mb-2">No stellar accomplishments cataloged yet</p>
              <p className="text-purple-300">Begin solving cosmic puzzles to unlock legendary achievements! 🎆</p>
            </div>
          )}
        </div>

        {/* Achievement Tips */}
        <div className="mt-8 cosmic-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🚀</span>
            <h3 className="text-2xl font-bold text-white">Mastery Guide</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-6">
              <h4 className="font-bold text-yellow-300 mb-4 text-xl flex items-center gap-2">
                <span>⚡</span>
                <span>Speed Mastery</span>
              </h4>
              <ul className="space-y-3 text-purple-100">
                <li className="flex items-start gap-2">
                  <span>🎯</span>
                  <span>Practice typing and pattern recognition daily</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>🔄</span>
                  <span>Start with shorter words to build momentum</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>✨</span>
                  <span>Use crossing letters as cosmic hints</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>📚</span>
                  <span>Focus on common galactic letter patterns</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-6">
              <h4 className="font-bold text-blue-300 mb-4 text-xl flex items-center gap-2">
                <span>🏆</span>
                <span>Consistency Excellence</span>
              </h4>
              <ul className="space-y-3 text-purple-100">
                <li className="flex items-start gap-2">
                  <span>📅</span>
                  <span>Solve puzzles daily for legendary streaks</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>🌅</span>
                  <span>Try different solving times throughout the day</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>🌟</span>
                  <span>Be the first galactic solver each day</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>✨</span>
                  <span>Aim for flawless, perfect solutions</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}