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
  const [stats, setStats] = useState<any>(null);
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
      
      setAchievements(achievementsData.achievements);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading achievements:', error);
      setError('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const getAchievementClasses = (achievement: Achievement) => {
    const baseClasses = 'p-6 rounded-lg border transition-all duration-300 transform hover:scale-105';
    
    if (achievement.earned) {
      return `${baseClasses} bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300 shadow-lg`;
    } else {
      return `${baseClasses} bg-gray-100 border-gray-300 opacity-60`;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="text-white text-lg">Loading cosmic achievements...</p>
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
              onClick={loadAchievements}
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
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            ⭐ Cosmic Achievements
          </h1>
          <p className="text-gray-300">
            Your journey through the galactic crossword universe
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {stats.totalEarned}
                </div>
                <div className="text-sm text-gray-600">Achievements Earned</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {stats.totalPoints}
                </div>
                <div className="text-sm text-gray-600">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {stats.completionPercentage}%
                </div>
                <div className="text-sm text-gray-600">Completion</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 mb-1">
                  {stats.totalAvailable}
                </div>
                <div className="text-sm text-gray-600">Total Available</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Achievements */}
        {stats && stats.recentAchievements.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🌟 Recently Earned</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.recentAchievements.map((achievement: any) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200"
                >
                  <span className="text-2xl">{achievement.icon}</span>
                  <div>
                    <div className="font-medium text-gray-800">{achievement.name}</div>
                    <div className="text-sm text-yellow-600 font-bold">+{achievement.points} points</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Achievements */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">All Achievements</h2>
          
          {achievements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={getAchievementClasses(achievement)}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3 animate-pulse">
                      {achievement.icon}
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 mb-2">
                      {achievement.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      {achievement.description}
                    </p>
                    
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-yellow-500">⭐</span>
                      <span className="font-bold text-gray-800">{achievement.points} points</span>
                    </div>
                    
                    {achievement.earned ? (
                      <div className="mt-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Earned
                          {achievement.earnedAt && (
                            <span className="ml-1">
                              {new Date(achievement.earnedAt).toLocaleDateString()}
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                          🔒 Locked
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">🌌</span>
              <p className="text-gray-500 text-lg">No achievements available</p>
              <p className="text-gray-400">Start solving puzzles to unlock achievements!</p>
            </div>
          )}
        </div>

        {/* Achievement Tips */}
        <div className="mt-8 bg-white bg-opacity-10 text-white rounded-lg p-6">
          <h3 className="text-lg font-bold mb-3">🚀 Tips for Earning Achievements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-yellow-400 mb-2">Speed Achievements</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Practice typing and pattern recognition</li>
                <li>• Start with shorter words first</li>
                <li>• Use crossing letters as hints</li>
                <li>• Focus on common letter patterns</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-400 mb-2">Consistency Achievements</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Solve puzzles daily for streaks</li>
                <li>• Try different solving times</li>
                <li>• Be the first to solve each day</li>
                <li>• Aim for perfect solutions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}