"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PuzzleCategory } from "@/types";
import CategoriesList from "@/components/CategoriesList";
import { Navigation } from "@/components/Navigation";
import { puzzleAPI } from "@/lib/api";

// Import the ThemeGlobe wrapper with error boundary and HMR handling
const ThemeGlobeWrapper = dynamic(
  () => import("@/components/ThemeGlobeWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Initializing the cosmic theme universe...</p>
        </div>
      </div>
    ),
  },
);

export default function ThemeGlobePage() {
  const [selectedCategory, setSelectedCategory] =
    useState<PuzzleCategory | null>(null);
  const [showList, setShowList] = useState(false);
  const [globeKey, setGlobeKey] = useState(0); // Key to force re-mount
  const [generatingPuzzle, setGeneratingPuzzle] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState("");
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleCategorySelect = (category: PuzzleCategory) => {
    setSelectedCategory(category);
  };

  const handleCloseErrorDialog = () => {
    setGeneratingPuzzle(false);
    setGenerationProgress(0);
    setGenerationStage("");
    setGenerationError(null);
  };

  const handleGeneratePuzzle = async () => {
    if (!selectedCategory) return;

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

      // Use Server-Sent Events to stream progress
      // EventSource doesn't support custom headers, so we'll pass the token as a query param
      const streamUrl = `${process.env.NEXT_PUBLIC_API_URL}/puzzle/generate-category-stream/${encodeURIComponent(selectedCategory.name)}?token=${encodeURIComponent(token)}`;
      console.log("🔗 Connecting to SSE:", streamUrl);
      console.log("🔗 API URL:", process.env.NEXT_PUBLIC_API_URL);
      console.log("🔗 Selected category:", selectedCategory.name);

      const eventSource = new EventSource(streamUrl);

      eventSource.onopen = (event) => {
        console.log("✅ SSE connection opened:", event);
      };

      eventSource.onmessage = (event) => {
        console.log("📦 SSE message received:", event.data);
        try {
          const data = JSON.parse(event.data);
          console.log("📋 Parsed data:", data);

          if (data.error) {
            console.error("❌ SSE Error received:", data);
            setGenerationError(
              data.message ||
                "The cosmic forces have defeated us... Please try again.",
            );
            setGenerationStage("");
            setGenerationProgress(0);
            eventSource.close();
            return;
          }

          if (data.success) {
            // Final success - redirect to puzzle
            console.log("🎉 Success received:", data);
            setGenerationStage("Launching your cosmic crossword...");
            setGenerationProgress(100);
            eventSource.close();

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
            setGenerationStage(data.message || `Working on ${data.stage}...`);
            setGenerationProgress(data.progress);
          } else {
            console.log("⚠️ Received data without expected fields:", data);
          }
        } catch (parseError) {
          console.error(
            "💥 Error parsing SSE data:",
            parseError,
            "Raw data:",
            event.data,
          );
        }
      };

      eventSource.onerror = (error) => {
        console.error("🚨 SSE Error:", error);
        console.log("🔄 SSE ReadyState:", eventSource.readyState);
        console.log("🔄 EventSource URL:", streamUrl);

        // Check if this is an immediate connection failure
        if (eventSource.readyState === EventSource.CLOSED) {
          console.error(
            "❌ EventSource connection failed immediately - likely authentication or CORS issue",
          );
        } else if (eventSource.readyState === EventSource.CONNECTING) {
          console.error("❌ EventSource connection is stuck connecting");
        }

        eventSource.close();

        // Fallback to regular API call
        console.log("🔄 Falling back to regular API");
        handleGeneratePuzzleFallback();
      };

      // Clean up on unmount
      setTimeout(() => {
        eventSource.close();
      }, 300000); // 5 minute timeout
    } catch (error: any) {
      console.error("Error setting up streaming:", error);
      // Fallback to regular generation
      handleGeneratePuzzleFallback();
    }
  };

  const handleGeneratePuzzleFallback = async () => {
    try {
      setGenerationStage("Initializing standard generation...");

      // Use the regular API as fallback
      const data = await puzzleAPI.generateCategoryPuzzle(
        selectedCategory!.name,
      );

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
    } catch (error: any) {
      console.error("Error generating puzzle (fallback):", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "The cosmic crossword generator experienced a malfunction. Please try again.";
      setGenerationError(errorMessage);
      setGenerationStage("");
      setGenerationProgress(0);
    }
  };

  return (
    <>
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
                  onClick={() => setGlobeKey((prev) => prev + 1)}
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

            {/* Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl mb-2">🎯</div>
                <h3 className="text-white font-semibold mb-1">Interact</h3>
                <p className="text-sm text-gray-300">
                  Click and drag to rotate, scroll to zoom. Click categories to
                  favorite them.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl mb-2">📏</div>
                <h3 className="text-white font-semibold mb-1">
                  Popular Themes
                </h3>
                <p className="text-sm text-gray-300 mb-2"></p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl mb-2">❤️</div>
                <h3 className="text-white font-semibold mb-1">Favorites</h3>
                <p className="text-sm text-gray-300">
                  Red categories are your favorites. Yellow indicates hover
                  state.
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
              <ThemeGlobeWrapper
                key={globeKey}
                onCategorySelect={handleCategorySelect}
              />
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
                    onClick={handleGeneratePuzzle}
                    disabled={generatingPuzzle}
                    className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {generatingPuzzle ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>🧩 Generate Category Puzzle</>
                    )}
                  </button>
                  <p className="text-xs text-gray-400">
                    Click the category in the globe to add/remove from
                    favorites, or generate a puzzle using only words from this
                    category.
                  </p>
                </div>
              </div>
            </div>
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
                    <p className="text-purple-300 text-lg font-medium">
                      {selectedCategory?.name} Theme
                    </p>
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
                      🤷‍♂️ Well, That Didn't Work
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
                    <p className="text-purple-300 text-lg font-medium">
                      {selectedCategory?.name} Theme
                    </p>
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
