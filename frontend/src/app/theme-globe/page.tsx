'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { PuzzleCategory } from '@/types';
import CategoriesList from '@/components/CategoriesList';

// Dynamically import ThemeGlobe to avoid SSR issues with Three.js
const ThemeGlobe = dynamic(() => import('@/components/ThemeGlobe'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p>Initializing the cosmic theme universe...</p>
      </div>
    </div>
  )
});

export default function ThemeGlobePage() {
  const [selectedCategory, setSelectedCategory] = useState<PuzzleCategory | null>(null);
  const [showList, setShowList] = useState(false);

  const handleCategorySelect = (category: PuzzleCategory) => {
    setSelectedCategory(category);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black">
      {/* Header */}
      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                🌌 Theme Globe
              </h1>
              <p className="text-lg text-gray-300">
                Explore categories in a cosmic 3D sphere where size reflects word abundance
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowList(!showList)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  showList 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {showList ? '🌍 Show Globe' : '📋 Show List'}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="text-white font-semibold mb-1">Interact</h3>
              <p className="text-sm text-gray-300">
                Click and drag to rotate, scroll to zoom. Click categories to favorite them.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl mb-2">📏</div>
              <h3 className="text-white font-semibold mb-1">Logarithmic Scale</h3>
              <p className="text-sm text-gray-300 mb-2">
                Text size = log₁₀(word count). Examples:
              </p>
              <div className="text-xs text-gray-400 space-y-1">
                <div>• "Noun" (2244 words) = <span className="text-lg">Large</span></div>
                <div>• "Food" (455 words) = <span className="text-base">Medium</span></div>
                <div>• "Color" (89 words) = <span className="text-sm">Small</span></div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl mb-2">❤️</div>
              <h3 className="text-white font-semibold mb-1">Favorites</h3>
              <p className="text-sm text-gray-300">
                Red categories are your favorites. Yellow indicates hover state.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative">
        {showList ? (
          // List View
          <div className="max-w-7xl mx-auto px-6 pb-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">
                📚 Categories List View
              </h2>
              <CategoriesList showSearch showStats limit={300} />
            </div>
          </div>
        ) : (
          // Globe View
          <div className="h-[calc(100vh-300px)] min-h-[600px]">
            <ThemeGlobe onCategorySelect={handleCategorySelect} />
          </div>
        )}
      </div>

      {/* Selected Category Detail */}
      {selectedCategory && !showList && (
        <div className="fixed bottom-6 left-6 right-6 z-20 max-w-md mx-auto">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl p-6 text-white border border-purple-500/30">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-xl font-bold text-purple-300">
                {selectedCategory.name}
              </h3>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-300">
                  📚 {selectedCategory.wordCount.toLocaleString()} words
                </span>
                <span className="text-gray-300">
                  ❤️ {selectedCategory.favoritesCount} favorites
                </span>
              </div>
              
              {selectedCategory.description && (
                <p className="text-sm text-gray-200 leading-relaxed">
                  {selectedCategory.description}
                </p>
              )}
              
              <div className="pt-3 border-t border-purple-500/30">
                <p className="text-xs text-gray-400">
                  Click the category in the globe to add/remove from favorites
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cosmic Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-blue-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-20 left-32 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse"></div>
        <div className="absolute bottom-40 right-10 w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
      </div>
    </div>
  );
}