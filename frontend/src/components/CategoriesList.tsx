'use client';

import { useState, useEffect } from 'react';
import { HeartIcon, MagnifyingGlassIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { PuzzleCategory, CategoryStats } from '@/types';
import { categoriesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface CategoriesListProps {
  showSearch?: boolean;
  showStats?: boolean;
  limit?: number;
  compact?: boolean;
}

const CategoriesList = ({ 
  showSearch = true, 
  showStats = true, 
  limit,
  compact = false 
}: CategoriesListProps) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<PuzzleCategory[]>([]);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'wordCount' | 'favoritesCount' | 'name'>('wordCount');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [favoriteCategory, setFavoriteCategory] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
    if (showStats) {
      loadStats();
    }
    if (user) {
      loadUserFavorite();
    }
  }, [searchTerm, sortBy, order, user]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesAPI.getCategories({
        sortBy,
        order,
        limit,
        search: searchTerm || undefined,
        activeOnly: true
      });
      setCategories(response.data);
    } catch (err) {
      setError('Failed to load categories');
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await categoriesAPI.getCategoryStats();
      setStats(response.data);
    } catch (err) {
      console.error('Error loading category stats:', err);
    }
  };

  const loadUserFavorite = async () => {
    try {
      const response = await categoriesAPI.getUserFavoriteCategory();
      setFavoriteCategory(response.data.favoriteCategory?.id || null);
    } catch (err) {
      console.error('Error loading user favorite:', err);
    }
  };

  const toggleFavorite = async (categoryId: string) => {
    if (!user) return;
    
    try {
      const response = await categoriesAPI.toggleFavoriteCategory(categoryId);
      setFavoriteCategory(response.categoryId);
      
      // Reload categories to get accurate favorites counts from server
      await loadCategories();
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-600">
        <p>{error}</p>
        <button 
          onClick={loadCategories}
          className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      {showStats && stats && !compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Categories</p>
                <p className="text-xl font-semibold text-gray-900">{stats.totalCategories}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Words</p>
                <p className="text-xl font-semibold text-gray-900">{stats.totalWords.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center">
              <HeartIconSolid className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Favorites</p>
                <p className="text-xl font-semibold text-gray-900">{stats.totalFavorites}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Top Category</p>
              <p className="text-lg font-semibold text-gray-900">{stats.topCategory?.name}</p>
              <p className="text-sm text-gray-500">{stats.topCategory?.wordCount} words</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Sort Controls */}
      {showSearch && !compact && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            >
              <option value="wordCount">Word Count</option>
              <option value="favoritesCount">Popularity</option>
              <option value="name">Name</option>
            </select>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as typeof order)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            >
              <option value="desc">High to Low</option>
              <option value="asc">Low to High</option>
            </select>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {categories.map((category) => {
          const isFavorite = favoriteCategory === category.id;
          
          return (
            <div
              key={category.id}
              className={`bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow ${
                isFavorite ? 'ring-2 ring-purple-200 bg-purple-50' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                {user && (
                  <button
                    onClick={() => toggleFavorite(category.id)}
                    className={`p-1 rounded-full transition-colors ${
                      isFavorite 
                        ? 'text-red-600 hover:text-red-700' 
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFavorite ? (
                      <HeartIconSolid className="h-5 w-5" />
                    ) : (
                      <HeartIcon className="h-5 w-5" />
                    )}
                  </button>
                )}
              </div>
              
              {category.description && !compact && (
                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
              )}
              
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>{category.wordCount.toLocaleString()} words</span>
                <div className="flex items-center gap-1">
                  <HeartIconSolid className="h-4 w-4 text-red-400" />
                  <span>{category.favoritesCount}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No categories found matching your search.' : 'No categories available.'}
        </div>
      )}
    </div>
  );
};

export default CategoriesList;