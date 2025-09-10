'use client';

import { useState, useEffect } from 'react';
import { HeartIcon, MagnifyingGlassIcon, ChartBarIcon, EyeIcon, DocumentTextIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { PuzzleCategory, CategoryStats } from '@/types';
import { categoriesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [categories, setCategories] = useState<PuzzleCategory[]>([]);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'wordCount' | 'favoritesCount' | 'name'>('wordCount');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [favoriteCategory, setFavoriteCategory] = useState<string | null>(null);
  
  // Modal states
  const [showWordsModal, setShowWordsModal] = useState(false);
  const [showPuzzlesModal, setShowPuzzlesModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PuzzleCategory | null>(null);
  const [categoryWords, setCategoryWords] = useState<any[]>([]);
  const [categoryPuzzles, setCategoryPuzzles] = useState<any[]>([]);
  const [wordsLoading, setWordsLoading] = useState(false);
  const [puzzlesLoading, setPuzzlesLoading] = useState(false);
  const [wordsPage, setWordsPage] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [hasMoreWords, setHasMoreWords] = useState(false);

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

  const openWordsModal = async (category: PuzzleCategory) => {
    setSelectedCategory(category);
    setShowWordsModal(true);
    setWordsLoading(true);
    setWordsPage(0);
    
    try {
      const response = await categoriesAPI.getCategoryWords(category.id, 50, 0);
      setCategoryWords(response.data.words);
      setTotalWords(response.data.totalWords);
      setHasMoreWords(response.data.pagination.hasMore);
    } catch (err) {
      console.error('Error loading category words:', err);
    } finally {
      setWordsLoading(false);
    }
  };

  const loadMoreWords = async () => {
    if (!selectedCategory || wordsLoading) return;
    
    setWordsLoading(true);
    const nextOffset = (wordsPage + 1) * 50;
    
    try {
      const response = await categoriesAPI.getCategoryWords(selectedCategory.id, 50, nextOffset);
      setCategoryWords(prev => [...prev, ...response.data.words]);
      setWordsPage(prev => prev + 1);
      setHasMoreWords(response.data.pagination.hasMore);
    } catch (err) {
      console.error('Error loading more words:', err);
    } finally {
      setWordsLoading(false);
    }
  };

  const openPuzzlesModal = async (category: PuzzleCategory) => {
    setSelectedCategory(category);
    setShowPuzzlesModal(true);
    setPuzzlesLoading(true);
    
    try {
      const response = await categoriesAPI.getCategoryPuzzles(category.id);
      setCategoryPuzzles(response.data.puzzles);
    } catch (err) {
      console.error('Error loading category puzzles:', err);
    } finally {
      setPuzzlesLoading(false);
    }
  };

  const openPuzzle = (puzzleDate: string) => {
    router.push(`/puzzle?date=${puzzleDate}`);
    setShowPuzzlesModal(false);
  };

  const closeModals = () => {
    setShowWordsModal(false);
    setShowPuzzlesModal(false);
    setSelectedCategory(null);
    setCategoryWords([]);
    setCategoryPuzzles([]);
    setWordsPage(0);
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
              placeholder="Search categories by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
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
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{category.wordCount.toLocaleString()} words</span>
                  <div className="flex items-center gap-1">
                    <HeartIconSolid className="h-4 w-4 text-red-400" />
                    <span>{category.favoritesCount}</span>
                  </div>
                </div>
                
                {!compact && (
                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openWordsModal(category);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <EyeIcon className="h-3 w-3" />
                      Show Words
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openPuzzlesModal(category);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <DocumentTextIcon className="h-3 w-3" />
                      Show Puzzles
                    </button>
                  </div>
                )}
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
      
      {/* Words Modal */}
      {showWordsModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedCategory.name} - Words</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {totalWords.toLocaleString()} total words
                </p>
              </div>
              <button
                onClick={closeModals}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {wordsLoading && categoryWords.length === 0 ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {categoryWords.map((word, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-purple-600">{word.word}</span>
                        <span className="text-xs text-gray-500">{word.length} letters</span>
                      </div>
                      <p className="text-sm text-gray-700">{word.clue}</p>
                      {word.isCommon && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                          Common
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {hasMoreWords && (
                <div className="text-center mt-6">
                  <button
                    onClick={loadMoreWords}
                    disabled={wordsLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {wordsLoading ? 'Loading...' : 'Load More Words'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Puzzles Modal */}
      {showPuzzlesModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedCategory.name} - Puzzles</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {categoryPuzzles.length} puzzle{categoryPuzzles.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <button
                onClick={closeModals}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {puzzlesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : categoryPuzzles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>No puzzles found for this category yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryPuzzles.map((puzzle, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => openPuzzle(puzzle.date)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{puzzle.displayName}</h3>
                        <span className="text-sm text-gray-500">{puzzle.size}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span className="font-mono">{puzzle.date}</span>
                        <div className="flex items-center gap-4">
                          <span>{puzzle.acrossClues} across</span>
                          <span>{puzzle.downClues} down</span>
                          <span className="font-medium">{puzzle.totalClues} total</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesList;