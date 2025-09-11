'use client';

import { useAuth } from '@/contexts/AuthContext';
import CategoriesList from '@/components/CategoriesList';

export default function CategoriesPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Puzzle Categories
          </h1>
          <p className="text-lg text-gray-600">
            Explore different categories of words used in our crossword puzzles. 
            {user && ' Set your favorite category to personalize your experience!'}
          </p>
        </div>

        {/* User's Favorite Category Section */}
        {user && (
          <div className="mb-8 bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Your Favorite Category
            </h2>
            {user.favoriteCategory ? (
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div>
                  <h3 className="font-medium text-purple-900">{user.favoriteCategory.name}</h3>
                  <p className="text-sm text-purple-700">{user.favoriteCategory.description}</p>
                  <p className="text-sm text-purple-600 mt-1">
                    {user.favoriteCategory.wordCount.toLocaleString()} words • {user.favoriteCategory.favoritesCount} favorites
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">
                You haven&apos;t selected a favorite category yet. Click the heart icon on any category below to set it as your favorite!
              </p>
            )}
          </div>
        )}

        {/* Categories List */}
        <CategoriesList showSearch showStats />
      </div>
    </div>
  );
}