'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { HeartIcon, MagnifyingGlassIcon, ChartBarIcon, EyeIcon, DocumentTextIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from '@heroicons/react/24/outline';
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
  externalSearchTerm?: string;
  onSearchChange?: (term: string) => void;
}

const CategoriesList = ({ 
  showSearch = true, 
  showStats = true, 
  limit,
  compact = false,
  externalSearchTerm,
  onSearchChange
}: CategoriesListProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<PuzzleCategory[]>([]);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  
  // Use external search term if provided, otherwise use internal
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const [sortBy, setSortBy] = useState<'wordCount' | 'favoritesCount' | 'name'>('wordCount');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [favoriteCategories, setFavoriteCategories] = useState<Set<string>>(new Set());
  
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

  // Debounced search effect - only for actual data loading
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  useEffect(() => {
    loadCategories();
    if (showStats) {
      loadStats();
    }
    if (user) {
      loadUserFavorites();
    }
  }, [debouncedSearchTerm, sortBy, order, user]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesAPI.getCategories({
        sortBy,
        order,
        limit,
        search: debouncedSearchTerm || undefined,
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

  const loadUserFavorites = async () => {
    try {
      const response = await categoriesAPI.getUserFavoriteCategories();
      setFavoriteCategories(new Set(response.data.favoriteIds));
    } catch (err) {
      console.error('Error loading user favorites:', err);
      // Fallback to old single favorite API for backwards compatibility
      try {
        const fallbackResponse = await categoriesAPI.getUserFavoriteCategory();
        if (fallbackResponse.data.favoriteCategory?.id) {
          setFavoriteCategories(new Set([fallbackResponse.data.favoriteCategory.id]));
        }
      } catch (fallbackErr) {
        console.error('Error loading fallback favorite:', fallbackErr);
      }
    }
  };

  const toggleFavorite = async (categoryId: string) => {
    if (!user) return;
    
    // Store original state for potential revert
    const originalFavorites = new Set(favoriteCategories);
    const wasHeart = originalFavorites.has(categoryId);
    
    try {
      // Optimistically update UI immediately
      const newFavorites = new Set(favoriteCategories);
      if (wasHeart) {
        newFavorites.delete(categoryId);
      } else {
        newFavorites.add(categoryId);
      }
      setFavoriteCategories(newFavorites);
      
      // Call API and wait for response
      const response = await categoriesAPI.toggleFavoriteCategory(categoryId);
      
      // Only update if server response differs from our optimistic update
      const serverState = response.isFavorite;
      const optimisticState = !wasHeart;
      
      if (serverState !== optimisticState) {
        // Server disagrees with our optimistic update, correct it
        if (serverState) {
          setFavoriteCategories(prev => new Set([...prev, categoryId]));
        } else {
          setFavoriteCategories(prev => {
            const correctedSet = new Set(prev);
            correctedSet.delete(categoryId);
            return correctedSet;
          });
        }
      }
      
      // Update the category's favorites count in the list
      setCategories(prev => prev.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            favoritesCount: cat.favoritesCount + (serverState ? 1 : -1)
          };
        }
        return cat;
      }));
      
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Revert optimistic update on error
      setFavoriteCategories(originalFavorites);
    }
  };

  const openWordsModal = async (category: PuzzleCategory) => {
    console.log('🔍 Opening words modal for category:', category.name);
    setSelectedCategory(category);
    setShowWordsModal(true);
    setWordsLoading(true);
    setWordsPage(0);
    
    try {
      console.log('📡 Fetching words for category ID:', category.id);
      const response = await categoriesAPI.getCategoryWords(category.id, 50, 0);
      console.log('✅ Words response:', response);
      setCategoryWords(response.data.words);
      setTotalWords(response.data.totalWords);
      setHasMoreWords(response.data.pagination.hasMore);
    } catch (err) {
      console.error('❌ Error loading category words:', err);
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
    console.log('🧩 Opening puzzles modal for category:', category.name);
    setSelectedCategory(category);
    setShowPuzzlesModal(true);
    setPuzzlesLoading(true);
    
    try {
      console.log('📡 Fetching puzzles for category ID:', category.id);
      const response = await categoriesAPI.getCategoryPuzzles(category.id);
      console.log('✅ Puzzles response:', response);
      setCategoryPuzzles(response.data.puzzles);
    } catch (err) {
      console.error('❌ Error loading category puzzles:', err);
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

      {/* Favorites Summary in compact mode */}
      {compact && favoriteCategories.size > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <HeartIconSolid className="h-5 w-5 text-red-500" />
            <h4 className="font-medium text-gray-900">
              Your Favorites ({favoriteCategories.size})
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter(cat => favoriteCategories.has(cat.id))
              .slice(0, 5)
              .map(cat => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full border border-purple-200"
                >
                  <SparklesIcon className="h-3 w-3" />
                  {cat.name}
                </span>
              ))}
            {favoriteCategories.size > 5 && (
              <span className="text-sm text-gray-500 px-2 py-1">
                +{favoriteCategories.size - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search and Sort Controls */}
      {showSearch && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={compact ? "Search categories..." : "Search categories by name..."}
              value={searchTerm}
              onChange={(e) => {
                const newValue = e.target.value;
                if (onSearchChange) {
                  onSearchChange(newValue);
                } else {
                  setInternalSearchTerm(newValue);
                }
              }}
              className="pl-10 pr-10 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-white transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  if (onSearchChange) {
                    onSearchChange('');
                  } else {
                    setInternalSearchTerm('');
                  }
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          {!compact && (
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200"
              >
                <option value="wordCount">Word Count</option>
                <option value="favoritesCount">Popularity</option>
                <option value="name">Name</option>
              </select>
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value as typeof order)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200"
              >
                <option value="desc">High to Low</option>
                <option value="asc">Low to High</option>
              </select>
            </div>
          )}
          {compact && (
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200 text-sm"
              >
                <option value="wordCount">Words</option>
                <option value="favoritesCount">Popular</option>
                <option value="name">A-Z</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Categories Grid */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {categories.map((category, index) => {
          const isFavorite = favoriteCategories.has(category.id);
          
          return (
            <div
              key={category.id}
              className={`group relative bg-white rounded-xl shadow-md border p-5 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 ${
                compact ? '' : 'hover:scale-105'
              } ${
                isFavorite ? 'ring-2 ring-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 shadow-purple-200' : 'hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50'
              }`}
              style={{
                animation: isFavorite 
                  ? `cosmic-entrance 0.8s ease-out ${index * 100}ms both, cosmic-pulse 3s ease-in-out infinite ${index * 100 + 800}ms`
                  : `cosmic-entrance 0.8s ease-out ${index * 100}ms both`
              }}
            >
              {/* Cosmic glow effect for favorites */}
              {isFavorite && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400/20 to-pink-400/20 blur-lg animate-pulse"></div>
              )}
              
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/0 to-purple-400/0 group-hover:from-blue-400/10 group-hover:to-purple-400/10 transition-all duration-500 blur-sm"></div>
              
              <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                {user && (
                  <button
                    onClick={() => toggleFavorite(category.id)}
                    className={`group relative p-2 rounded-full transition-all duration-500 transform ${
                      compact ? 'hover:scale-105 active:scale-95' : 'hover:scale-110 active:scale-95'
                    } ${
                      isFavorite 
                        ? 'text-red-500 hover:text-red-600' 
                        : 'text-gray-400 hover:text-red-400'
                    }`}
                    title={isFavorite ? 'Remove from cosmic favorites' : 'Add to cosmic favorites'}
                  >
                    {/* Background glow effect */}
                    <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
                      isFavorite 
                        ? 'bg-red-100 shadow-lg shadow-red-200/50 scale-100' 
                        : 'bg-transparent scale-0 group-hover:scale-100 group-hover:bg-red-50'
                    }`}></div>
                    
                    {/* Heart icon with smooth transition */}
                    <div className="relative z-10">
                      <HeartIcon 
                        className={`h-5 w-5 transition-all duration-500 ${
                          isFavorite ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
                        }`} 
                      />
                      <HeartIconSolid 
                        className={`h-5 w-5 absolute inset-0 transition-all duration-500 ${
                          isFavorite ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                        }`} 
                      />
                      
                      {/* Sparkle effect for favorites */}
                      {isFavorite && (
                        <SparklesIcon className="h-3 w-3 absolute -top-1 -right-1 text-yellow-400 animate-bounce opacity-75" />
                      )}
                    </div>
                    
                    {/* Ripple effect on click */}
                    <div className="absolute inset-0 rounded-full bg-red-300 opacity-0 group-active:opacity-30 group-active:scale-150 transition-all duration-300"></div>
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
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300"
             style={{
               background: 'radial-gradient(ellipse at center, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.98) 35%, rgba(15,5,29,0.99) 100%)'
             }}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-500 ease-out"
               style={{
                 background: 'linear-gradient(135deg, rgba(147,51,234,0.1) 0%, rgba(59,130,246,0.1) 50%, rgba(147,51,234,0.1) 100%)',
                 backdropFilter: 'blur(20px)',
                 border: '1px solid rgba(147,51,234,0.3)',
                 borderRadius: '20px',
                 boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)'
               }}>
            
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden rounded-t-[20px] pointer-events-none">
              {Array.from({ length: 30 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-purple-400 rounded-full animate-pulse opacity-30"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
            
            <div className="relative p-6 border-b border-purple-500/30 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📖</span>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                    {selectedCategory.name}
                  </h2>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full border border-purple-500/30">
                    Words
                  </span>
                </div>
                <p className="text-sm text-blue-300/80">
                  ✨ {totalWords.toLocaleString()} cosmic words available
                </p>
              </div>
              <button
                onClick={closeModals}
                className="p-2 hover:bg-purple-500/20 rounded-lg transition-all duration-200 text-purple-300 hover:text-white hover:scale-110"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="relative flex-1 overflow-y-auto p-6 custom-scrollbar">
              {wordsLoading && categoryWords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-2 border-blue-500/30 border-b-blue-400 rounded-full animate-spin" style={{animationDirection: 'reverse'}}></div>
                  </div>
                  <p className="mt-4 text-purple-300/80 animate-pulse">Fetching cosmic words...</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryWords.map((word, index) => (
                    <div 
                      key={index} 
                      className="group relative p-4 rounded-xl transition-all duration-300 hover:scale-105 cursor-default"
                      style={{
                        background: 'linear-gradient(135deg, rgba(147,51,234,0.1) 0%, rgba(59,130,246,0.05) 100%)',
                        border: '1px solid rgba(147,51,234,0.2)',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      {/* Hover glow effect */}
                      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                           style={{
                             background: 'linear-gradient(135deg, rgba(147,51,234,0.2) 0%, rgba(59,130,246,0.1) 100%)',
                             filter: 'blur(8px)'
                           }}></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xl bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                            {word.word}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                              {word.length}L
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-blue-200/90 leading-relaxed mb-2">{word.clue}</p>
                        {word.isCommon && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-500/20 text-green-300 rounded-full border border-green-500/30">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                            Common
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {hasMoreWords && (
                <div className="text-center mt-8">
                  <button
                    onClick={loadMoreWords}
                    disabled={wordsLoading}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
                  >
                    {wordsLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Loading...
                      </div>
                    ) : (
                      '✨ Load More Cosmic Words'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Puzzles Modal */}
      {showPuzzlesModal && selectedCategory && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300"
             style={{
               background: 'radial-gradient(ellipse at center, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.98) 35%, rgba(15,5,29,0.99) 100%)'
             }}>
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-500 ease-out"
               style={{
                 background: 'linear-gradient(135deg, rgba(147,51,234,0.1) 0%, rgba(59,130,246,0.1) 50%, rgba(147,51,234,0.1) 100%)',
                 backdropFilter: 'blur(20px)',
                 border: '1px solid rgba(147,51,234,0.3)',
                 borderRadius: '20px',
                 boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)'
               }}>
            
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden rounded-t-[20px] pointer-events-none">
              {Array.from({ length: 25 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-blue-400 rounded-full animate-pulse opacity-30"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
            
            <div className="relative p-6 border-b border-purple-500/30 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🧩</span>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                    {selectedCategory.name}
                  </h2>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full border border-blue-500/30">
                    Puzzles
                  </span>
                </div>
                <p className="text-sm text-blue-300/80">
                  🌟 {categoryPuzzles.length} cosmic puzzle{categoryPuzzles.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <button
                onClick={closeModals}
                className="p-2 hover:bg-purple-500/20 rounded-lg transition-all duration-200 text-purple-300 hover:text-white hover:scale-110"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="relative flex-1 overflow-y-auto p-6 custom-scrollbar">
              {puzzlesLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-400 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-2 border-purple-500/30 border-b-purple-400 rounded-full animate-spin" style={{animationDirection: 'reverse'}}></div>
                  </div>
                  <p className="mt-4 text-blue-300/80 animate-pulse">Loading cosmic puzzles...</p>
                </div>
              ) : categoryPuzzles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative inline-block mb-6">
                    <DocumentTextIcon className="h-16 w-16 text-purple-400/50 mx-auto" />
                    <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-xl animate-pulse"></div>
                  </div>
                  <p className="text-purple-300/80 text-lg mb-2">No cosmic puzzles found</p>
                  <p className="text-blue-300/60 text-sm">This category hasn't been used to generate puzzles yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {categoryPuzzles.map((puzzle, index) => (
                    <div
                      key={index}
                      className="group relative p-5 rounded-xl cursor-pointer transition-all duration-300 hover:scale-102 hover:-translate-y-1"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(147,51,234,0.05) 100%)',
                        border: '1px solid rgba(59,130,246,0.2)',
                        backdropFilter: 'blur(10px)'
                      }}
                      onClick={() => openPuzzle(puzzle.date)}
                    >
                      {/* Hover glow effect */}
                      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                           style={{
                             background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(147,51,234,0.1) 100%)',
                             filter: 'blur(8px)'
                           }}></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                              {puzzle.displayName?.includes('Multi') ? '🌌' : '🧩'}
                            </span>
                            <div>
                              <h3 className="font-bold text-lg bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                                {puzzle.displayName}
                              </h3>
                              <p className="text-xs text-blue-300/60 font-mono">{puzzle.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full border border-blue-500/30">
                              {puzzle.size}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4 text-blue-200/80">
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                              <span>{puzzle.acrossClues} across</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                              <span>{puzzle.downClues} down</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-200 text-xs rounded-full border border-purple-500/20">
                              {puzzle.totalClues} total clues
                            </span>
                            <span className="text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200">→</span>
                          </div>
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