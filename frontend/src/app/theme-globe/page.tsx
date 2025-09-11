"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { PuzzleCategory } from "@/types";
import CategoriesList from "@/components/CategoriesList";
import { Navigation } from "@/components/Navigation";
import { puzzleAPI } from "@/lib/api";
import CosmicLoader from "@/components/CosmicLoader";

// Import the ThemeGlobe wrapper with error boundary and HMR handling
const ThemeGlobeWrapper = dynamic(
  () => import("@/components/ThemeGlobeWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        <div className="text-center text-purple-300">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border border-blue-400/50 animate-pulse"></div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 animate-pulse"></div>
          </div>
          <p className="text-sm opacity-75">Loading 3D components...</p>
        </div>
      </div>
    ),
  },
);

export default function ThemeGlobePage() {
  const [selectedCategory, setSelectedCategory] =
    useState<PuzzleCategory | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<
    PuzzleCategory[]
  >([]);
  const [showList, setShowList] = useState(false);
  const [globeKey, setGlobeKey] = useState(0);
  const [generatingPuzzle, setGeneratingPuzzle] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState("");
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isGlobeLoading, setIsGlobeLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  const handleCategorySelect = (category: PuzzleCategory) => {
    setSelectedCategory(category);
  };

  const handleAddCategory = (category: PuzzleCategory) => {
    if (selectedCategories.length >= 5) return;
    if (selectedCategories.some((cat) => cat.id === category.id)) return;

    setSelectedCategories((prev) => [...prev, category]);
  };

  // Handle initial page load
  useEffect(() => {
    // Simulate initial loading time (for data fetching, etc.)
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1500); // Adjust timing as needed

    return () => clearTimeout(timer);
  }, []);

  // Handle globe loading state
  useEffect(() => {
    if (!showList && !isInitialLoading) {
      setIsGlobeLoading(true);
      const timer = setTimeout(() => {
        setIsGlobeLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showList, globeKey, isInitialLoading]);

  const handleLoaderComplete = () => {
    setShowLoader(false);
  };

  const handleRemoveCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.filter((cat) => cat.id !== categoryId),
    );
  };

  const totalWordCount = selectedCategories.reduce(
    (sum, cat) => sum + cat.wordCount,
    0,
  );
  const canGenerate = totalWordCount >= 100 && selectedCategories.length > 0;

  const handleCloseErrorDialog = () => {
    setGeneratingPuzzle(false);
    setGenerationProgress(0);
    setGenerationStage("");
    setGenerationError(null);
  };

  const handleGeneratePuzzle = async () => {
    if (!canGenerate) return;

    try {
      setGeneratingPuzzle(true);
      setGenerationProgress(0);
      setGenerationError(null);
      setGenerationStage("Initializing cosmic engines...");

      // Get token for authenticated request (same key as AuthContext and API client)
      const token = localStorage.getItem("token");
      console.log("🔐 Auth token found:", !!token);
      console.log("🔐 Token length:", token?.length || 0);

      if (!token) {
        throw new Error(
          "Authentication required - no token found in localStorage",
        );
      }

      // Use multi-category endpoint with POST request
      const categoryNames = selectedCategories.map((c) => c.name);
      console.log("🔗 Selected categories:", categoryNames);

      // Since EventSource doesn't support POST, we'll use fetch with streaming
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/puzzle/generate-multi-category-stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            categoryNames,
            token,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      // Process streaming response
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("✅ Stream complete");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            if (jsonStr.trim()) {
              try {
                const data = JSON.parse(jsonStr);
                console.log("📋 Parsed data:", data);

                if (data.error) {
                  console.error("❌ Error received:", data);
                  setGenerationError(
                    data.message ||
                      "The cosmic forces have defeated us... Please try again.",
                  );
                  setGenerationStage("");
                  setGenerationProgress(0);
                  return;
                }

                if (data.success) {
                  // Final success - redirect to puzzle
                  console.log("🎉 Success received:", data);
                  setGenerationStage("Launching your cosmic crossword...");
                  setGenerationProgress(100);

                  setTimeout(() => {
                    window.location.href = `/puzzle?date=${data.puzzleDate}`;
                  }, 1000);
                  return;
                }

                // Progress update
                if (data.stage && data.progress !== undefined) {
                  console.log(
                    `📈 Progress update: ${data.progress}% - ${data.message}`,
                  );
                  setGenerationStage(
                    data.message || `Working on ${data.stage}...`,
                  );
                  setGenerationProgress(data.progress);
                }
              } catch (parseError) {
                console.error(
                  "💥 Error parsing data:",
                  parseError,
                  "Line:",
                  line,
                );
              }
            }
          }
        }
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string }; message?: string }; message?: string };
      console.error("Error setting up streaming:", err);
      // Fallback to regular generation
      handleGeneratePuzzleFallback();
    }
  };

  const handleGeneratePuzzleFallback = async () => {
    try {
      setGenerationStage("Initializing standard generation...");

      // For fallback, we'll use the first category only
      // (The multi-category endpoint requires streaming)
      const categoryName = selectedCategories[0]?.name || "Mixed";
      const data = await puzzleAPI.generateCategoryPuzzle(categoryName);

      if (data.success) {
        setGenerationStage("Puzzle generated successfully!");
        setGenerationProgress(100);

        setTimeout(() => {
          window.location.href = `/puzzle?date=${data.puzzleDate}`;
        }, 1000);
      } else {
        setGenerationError(
          data.message ||
            "The cosmic crossword generator encountered an unknown anomaly.",
        );
        setGenerationStage("");
        setGenerationProgress(0);
      }
    } catch (error: unknown) {
      console.error("Error generating puzzle (fallback):", error);
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "The cosmic crossword generator experienced a malfunction. Please try again.";
      setGenerationError(errorMessage);
      setGenerationStage("");
      setGenerationProgress(0);
    }
  };

  return (
    <>
      {/* Initial page loader */}
      <CosmicLoader
        isLoading={showLoader && isInitialLoading}
        onComplete={handleLoaderComplete}
        loadingText="Initializing cosmic theme universe..."
      />

      <Navigation />
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
                  Explore categories in a cosmic 3D sphere where size reflects
                  word abundance
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setIsGlobeLoading(true);
                    setGlobeKey((prev) => prev + 1);
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600/20 text-white hover:bg-blue-600/40 transition-colors text-sm"
                  title="Reload Globe (fixes HMR issues)"
                >
                  🔄 Reload Globe
                </button>
                <button
                  onClick={() => setShowList(!showList)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    showList
                      ? "bg-purple-600 text-white"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {showList ? "🌍 Show Globe" : "📋 Show List"}
                </button>
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
            <div className="h-[calc(100vh-300px)] min-h-[600px] relative">
              {isGlobeLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm rounded-xl">
                  <CosmicLoader
                    isLoading={isGlobeLoading}
                    onComplete={() => setIsGlobeLoading(false)}
                    loadingText="Rendering 3D cosmic globe..."
                  />
                </div>
              )}
              <div
                className={`transition-opacity duration-500 h-full ${
                  isGlobeLoading ? "opacity-30" : "opacity-100"
                }`}
              >
                <ThemeGlobeWrapper
                  key={globeKey}
                  onCategorySelect={handleCategorySelect}
                />
              </div>
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

                <div className="pt-3 border-t border-purple-500/30 space-y-3">
                  <button
                    onClick={() => handleAddCategory(selectedCategory)}
                    disabled={
                      selectedCategories.length >= 5 ||
                      selectedCategories.some(
                        (cat) => cat.id === selectedCategory.id,
                      )
                    }
                    className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {selectedCategories.some(
                      (cat) => cat.id === selectedCategory.id,
                    ) ? (
                      <>✅ Already Selected</>
                    ) : selectedCategories.length >= 5 ? (
                      <>🚫 Max 5 Categories</>
                    ) : (
                      <>➕ Select Category</>
                    )}
                  </button>
                  <p className="text-xs text-gray-400">
                    Click to add this category to your selection for
                    multi-category puzzle generation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selected Categories Widget */}
        {selectedCategories.length > 0 && (
          <div className="fixed bottom-24 right-6 z-20 max-w-sm">
            <div className="bg-black/90 backdrop-blur-sm rounded-xl p-4 text-white border border-purple-500/30 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-purple-300">
                  Selected Categories
                </h3>
                <div className="text-sm text-gray-300">
                  {selectedCategories.length}/5
                </div>
              </div>

              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {selectedCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between bg-purple-900/30 rounded-lg p-2 group hover:bg-purple-900/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {category.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {category.wordCount.toLocaleString()} words
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveCategory(category.id)}
                      className="ml-2 p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove category"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-purple-500/30">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-300">Total Words:</span>
                  <span className="font-bold text-green-400">
                    {totalWordCount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Generate Button */}
        {selectedCategories.length > 0 && (
          <div className="fixed bottom-6 left-6 z-20">
            <button
              onClick={handleGeneratePuzzle}
              disabled={!canGenerate || generatingPuzzle}
              className={`py-3 px-6 rounded-xl font-bold text-white transition-all duration-200 flex items-center gap-3 shadow-2xl ${
                canGenerate && !generatingPuzzle
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-105 transform animate-pulse"
                  : "bg-gray-600 cursor-not-allowed"
              }`}
              style={{
                opacity: canGenerate && !generatingPuzzle ? 1 : 0.2,
              }}
            >
              {generatingPuzzle ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  🧩 Generate Multi-Category Puzzle
                  <div className="bg-white/20 rounded-full px-2 py-1 text-xs">
                    {selectedCategories.length}
                  </div>
                </>
              )}
            </button>
          </div>
        )}

        {/* Puzzle Generation Loading Modal */}
        {generatingPuzzle && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-black p-8 rounded-xl border border-purple-500/30 shadow-2xl max-w-md w-full mx-4">
              {/* Error State */}
              {generationError ? (
                <>
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-4 animate-bounce">💥</div>
                    <h2 className="text-2xl font-bold text-red-400 mb-2">
                      Oops! Cosmic Malfunction
                    </h2>
                    <div className="text-purple-300 text-lg font-medium">
                      {selectedCategories.length === 1
                        ? `${selectedCategories[0].name} Theme`
                        : `Multi-Category Theme (${selectedCategories.length})`}
                    </div>
                    {selectedCategories.length > 1 && (
                      <div className="text-sm text-gray-400 mt-1">
                        {selectedCategories.map((c) => c.name).join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Error Message */}
                  <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
                    <p className="text-red-200 text-sm leading-relaxed">
                      {generationError}
                    </p>
                  </div>

                  {/* Cheeky Close Button */}
                  <div className="text-center">
                    <button
                      onClick={handleCloseErrorDialog}
                      className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      🤷‍♂️ Well, That Didn&apos;t Work
                    </button>
                    <p className="text-purple-300 text-xs mt-2">
                      Maybe try a different category? The cosmos can be
                      finicky...
                    </p>
                  </div>
                </>
              ) : (
                /* Loading State */
                <>
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-4 animate-bounce">🌌</div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Generating Category Puzzle
                    </h2>
                    <div className="text-purple-300 text-lg font-medium">
                      {selectedCategories.length === 1
                        ? `${selectedCategories[0].name} Theme`
                        : `Multi-Category Theme (${selectedCategories.length})`}
                    </div>
                    {selectedCategories.length > 1 && (
                      <div className="text-sm text-gray-400 mt-1">
                        {selectedCategories.map((c) => c.name).join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Enhanced Progress Bar with Dynamic Colors */}
                  <div className="relative mb-6">
                    <div className="bg-gray-700 rounded-full h-6 overflow-hidden shadow-inner border border-gray-600">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out shadow-lg relative ${
                          generationProgress < 30
                            ? "bg-gradient-to-r from-green-400 to-green-600"
                            : generationProgress < 60
                              ? "bg-gradient-to-r from-blue-400 to-blue-600"
                              : generationProgress < 80
                                ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                                : generationProgress < 95
                                  ? "bg-gradient-to-r from-orange-500 to-red-500"
                                  : "bg-gradient-to-r from-purple-500 to-pink-500"
                        }`}
                        style={{ width: `${generationProgress}%` }}
                      >
                        {/* Dynamic shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>

                        {/* Progress wave effect */}
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"
                          style={{ animationDuration: "2s" }}
                        ></div>

                        {/* Dynamic Emoji Animation based on progress */}
                        <div
                          className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-500 ease-out text-2xl"
                          style={{
                            right: generationProgress > 8 ? "-12px" : "auto",
                            left: generationProgress <= 8 ? "4px" : "auto",
                          }}
                        >
                          <div className="animate-bounce">
                            {generationProgress < 30
                              ? "🚀"
                              : generationProgress < 60
                                ? "🧩"
                                : generationProgress < 80
                                  ? "⚡"
                                  : generationProgress < 95
                                    ? "💫"
                                    : "🎉"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Progress Display */}
                    <div className="text-center mt-3 space-y-1">
                      <span
                        className={`text-3xl font-bold font-mono transition-colors duration-300 ${
                          generationProgress < 30
                            ? "text-green-400"
                            : generationProgress < 60
                              ? "text-blue-400"
                              : generationProgress < 80
                                ? "text-yellow-400"
                                : generationProgress < 95
                                  ? "text-orange-400"
                                  : "text-purple-400"
                        }`}
                      >
                        {Math.round(generationProgress)}%
                      </span>

                      {/* Progress Phase Indicator */}
                      <div className="text-xs text-gray-400 uppercase tracking-wider">
                        {generationProgress < 30
                          ? "Getting Started"
                          : generationProgress < 60
                            ? "Making Progress"
                            : generationProgress < 80
                              ? "Working Hard"
                              : generationProgress < 95
                                ? "Almost There"
                                : "Finishing Up"}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Generation Stage Display */}
                  <div className="text-center bg-black/20 rounded-lg p-4 border border-purple-500/20">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      <p className="text-purple-200 text-sm font-medium">
                        Current Status
                      </p>
                      <div
                        className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                        style={{ animationDelay: "0.5s" }}
                      ></div>
                    </div>

                    <p className="text-white font-medium min-h-[2.5rem] text-base leading-relaxed">
                      {generationStage || "Preparing cosmic engines..."}
                    </p>

                    {/* Attempt counter for debugging/fun */}
                    {generationStage.includes("attempt") && (
                      <div className="mt-2 text-xs text-gray-400">
                        The AI is working very hard on this one! 🤖💪
                      </div>
                    )}

                    {/* Personality indicators based on progress */}
                    <div className="mt-3 text-2xl">
                      {generationProgress < 20
                        ? "😊"
                        : generationProgress < 40
                          ? "🤔"
                          : generationProgress < 60
                            ? "😅"
                            : generationProgress < 80
                              ? "😰"
                              : generationProgress < 95
                                ? "🙏"
                                : "🎉"}
                    </div>
                  </div>
                </>
              )}

              {/* Star trail animation */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                <div className="absolute top-4 left-4 w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
                <div className="absolute top-8 right-6 w-0.5 h-0.5 bg-blue-400 rounded-full animate-pulse"></div>
                <div
                  className="absolute bottom-6 left-8 w-1 h-1 bg-purple-400 rounded-full animate-ping"
                  style={{ animationDelay: "0.5s" }}
                ></div>
                <div
                  className="absolute bottom-4 right-4 w-0.5 h-0.5 bg-pink-400 rounded-full animate-pulse"
                  style={{ animationDelay: "1s" }}
                ></div>
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
    </>
  );
}
