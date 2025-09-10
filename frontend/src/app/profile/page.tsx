'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { UserIcon, HeartIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { PuzzleCategory } from '@/types';
import { categoriesAPI } from '@/lib/api';
import CategoriesList from '@/components/CategoriesList';
import { Navigation } from '@/components/Navigation';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [favoriteCategory, setFavoriteCategory] = useState<PuzzleCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserFavorite();
    }
  }, [user]);

  const loadUserFavorite = async () => {
    try {
      setLoading(true);
      const response = await categoriesAPI.getUserFavoriteCategory();
      setFavoriteCategory(response.data.favoriteCategory);
    } catch (err) {
      console.error('Error loading user favorite:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFavorite = async (categoryId: string) => {
    if (!user) return;
    
    try {
      setUpdating(true);
      const response = await categoriesAPI.toggleFavoriteCategory(categoryId);
      
      if (response.isFavorite) {
        // Get the updated category info
        const categoriesResponse = await categoriesAPI.getCategories({ limit: 100 });
        const updatedCategory = categoriesResponse.data.find(cat => cat.id === categoryId);
        setFavoriteCategory(updatedCategory || null);
      } else {
        setFavoriteCategory(null);
      }

      // Update user context if available
      if (updateUser) {
        await updateUser();
      }
    } catch (err) {
      console.error('Error updating favorite category:', err);
    } finally {
      setUpdating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">Please log in to view your profile.</p>
          <a 
            href="/login" 
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            User Profile
          </h1>
          <p className="text-lg text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-purple-100 rounded-full p-3 mr-4">
              <UserIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <ChartBarIcon className="h-6 w-6 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-purple-600">Cosmic Points</p>
                  <p className="text-xl font-bold text-purple-900">{user.points}</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <HeartIconSolid className="h-6 w-6 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-600">Favorite Category</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {favoriteCategory ? favoriteCategory.name : 'None'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <UserIcon className="h-6 w-6 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-600">Member Since</p>
                  <p className="text-lg font-semibold text-green-900">
                    {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Favorite Category Settings */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Favorite Category Settings
          </h3>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              {favoriteCategory ? (
                <div className="mb-6">
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div>
                      <h4 className="font-medium text-purple-900">{favoriteCategory.name}</h4>
                      <p className="text-sm text-purple-700">{favoriteCategory.description}</p>
                      <p className="text-sm text-purple-600 mt-1">
                        {favoriteCategory.wordCount.toLocaleString()} words • {favoriteCategory.favoritesCount} favorites
                      </p>
                    </div>
                    <button
                      onClick={() => handleCategoryFavorite(favoriteCategory.id)}
                      disabled={updating}
                      className="p-2 text-red-600 hover:text-red-700 disabled:opacity-50"
                      title="Remove from favorites"
                    >
                      <HeartIconSolid className="h-6 w-6" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    Your favorite category helps us personalize your crossword experience. 
                    You can change it anytime by selecting a different category below.
                  </p>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-600">
                      You haven't selected a favorite category yet. Choose one from the categories below 
                      to personalize your crossword experience!
                    </p>
                  </div>
                </div>
              )}

              {/* Categories Selection */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">
                  Browse Categories
                </h4>
                <div className="max-h-96 overflow-y-auto">
                  <CategoriesList 
                    showSearch={false} 
                    showStats={false} 
                    limit={20} 
                    compact={true} 
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Additional Settings Placeholder */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Account Settings
          </h3>
          <p className="text-gray-600">
            Additional account settings will be available here in future updates.
          </p>
        </div>
        </div>
      </div>
    </>
  );
}