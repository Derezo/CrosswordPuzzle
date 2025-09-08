'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { CrosswordGrid, GridCellData } from '@/components/CrosswordGrid';
import { CrosswordClues } from '@/components/CrosswordClues';
import { puzzleAPI } from '@/lib/api';
import { DailyPuzzle, UserProgress, CrosswordClue, ValidationResult, UserAchievement } from '@/types';

interface CooldownErrorModalProps {
  cooldownData: {
    remainingTime: { hours: number; minutes: number; seconds: number; totalSeconds: number };
    message: string;
  };
  onClose: () => void;
}

const CooldownErrorModal: React.FC<CooldownErrorModalProps> = ({ cooldownData, onClose }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(cooldownData.remainingTime.totalSeconds);

  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="cosmic-card p-6 max-w-md w-full text-center border-2 border-red-500/50">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-white mb-4">Auto-Solve Locked</h2>
        <p className="text-red-400 text-lg mb-6">{cooldownData.message}</p>
        
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40 rounded-lg p-4 mb-6">
          <div className="text-sm text-red-200 mb-2">Time remaining:</div>
          <div className="text-2xl font-bold text-white font-mono">
            {remainingSeconds > 0 ? formatTime(remainingSeconds) : "Available now!"}
          </div>
          {remainingSeconds > 0 && (
            <div className="text-xs text-red-300 mt-2">
              Puzzles can be auto-solved 12 hours after creation
            </div>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors"
        >
          {remainingSeconds <= 0 ? "Try Auto-Solve Again" : "I'll Wait"}
        </button>
      </div>
    </div>
  );
};

export default function PuzzlePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [focusedClue, setFocusedClue] = useState<CrosswordClue | null>(null);
  const [validationResults, setValidationResults] = useState<{ [key: number]: boolean }>({});
  const [cellValidation, setCellValidation] = useState<{ [cellKey: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAchievements, setNewAchievements] = useState<UserAchievement[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [autoSolving, setAutoSolving] = useState(false);
  const [autoSolved, setAutoSolved] = useState(false);
  const [currentGridData, setCurrentGridData] = useState<GridCellData[][]>([]);
  const [initialGridData, setInitialGridData] = useState<GridCellData[][]>([]);
  const [showAutoSolveModal, setShowAutoSolveModal] = useState(false);
  const [showCooldownError, setShowCooldownError] = useState(false);
  const [cooldownData, setCooldownData] = useState<{
    remainingTime: { hours: number; minutes: number; seconds: number; totalSeconds: number };
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadTodaysPuzzle();
    }
  }, [user, authLoading, router]);

  const loadTodaysPuzzle = async () => {
    try {
      setLoading(true);
      const data = await puzzleAPI.getTodaysPuzzle();
      setPuzzle(data.puzzle);
      setProgress(data.progress);
      setAnswers(data.progress.answers || {});
      
      // Check if puzzle was auto-solved (no solve time indicates auto-solve)
      setAutoSolved(data.progress.isCompleted && !data.progress.solveTime);
      
      // If puzzle is completed, reconstruct the grid with solved answers for display
      if (data.progress.isCompleted && data.progress.answers) {
        // Create validation results showing all clues as correct
        const completedValidations: { [key: number]: boolean } = {};
        data.progress.completedClues.forEach(clueNumber => {
          completedValidations[clueNumber] = true;
        });
        setValidationResults(completedValidations);
        
        // Create cell validation showing all cells as correct
        const allCellsCorrect: { [cellKey: string]: boolean } = {};
        for (let row = 0; row < data.puzzle.grid.length; row++) {
          for (let col = 0; col < data.puzzle.grid[0].length; col++) {
            const cell = data.puzzle.grid[row][col];
            if (!cell.isBlocked) {
              allCellsCorrect[`${row},${col}`] = true;
            }
          }
        }
        setCellValidation(allCellsCorrect);
        
        // Reconstruct the grid data with solved answers
        const reconstructedGrid: GridCellData[][] = data.puzzle.grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            if (cell.isBlocked) {
              return { letter: '', acrossLetter: undefined, downLetter: undefined, lastActiveDirection: undefined };
            }
            
            // Find clues that intersect this position
            const cluesAtPosition = data.puzzle.clues.filter(clue => {
              if (clue.direction === 'across') {
                return rowIndex === clue.startRow && 
                       colIndex >= clue.startCol && 
                       colIndex < clue.startCol + clue.length;
              } else {
                return colIndex === clue.startCol && 
                       rowIndex >= clue.startRow && 
                       rowIndex < clue.startRow + clue.length;
              }
            });
            
            let acrossLetter = undefined;
            let downLetter = undefined;
            let displayLetter = '';
            let lastActiveDirection: 'across' | 'down' | undefined = undefined;
            
            // Extract letters from solved clue answers
            cluesAtPosition.forEach(clue => {
              const answer = data.progress.answers[clue.number.toString()];
              if (answer) {
                const positionInClue = clue.direction === 'across' 
                  ? colIndex - clue.startCol 
                  : rowIndex - clue.startRow;
                
                if (positionInClue >= 0 && positionInClue < answer.length) {
                  const letter = answer[positionInClue].toUpperCase();
                  if (clue.direction === 'across') {
                    acrossLetter = letter;
                  } else {
                    downLetter = letter;
                  }
                  displayLetter = letter;
                  lastActiveDirection = clue.direction;
                }
              }
            });
            
            return {
              letter: displayLetter,
              acrossLetter,
              downLetter,
              lastActiveDirection
            };
          })
        );
        
        setInitialGridData(reconstructedGrid);
      }
    } catch (error) {
      console.error('Error loading puzzle:', error);
      setError('Failed to load today&apos;s puzzle');
    } finally {
      setLoading(false);
    }
  };

  // Legacy function - no longer used in pure grid-based system
  // Grid updates happen internally in CrosswordGrid component

  const handleCheckAnswers = async () => {
    console.log('handleCheckAnswers called');
    console.log('currentGridData:', currentGridData.length > 0 ? `${currentGridData.length}x${currentGridData[0]?.length || 0}` : 'empty');
    console.log('currentGridData sample:', currentGridData[0]?.[0]);
    
    if (!puzzle || !progress || currentGridData.length === 0) {
      console.log('Early return - missing data');
      return;
    }

    try {
      // PURE GRID-BASED VALIDATION
      const payload = {
        gridData: currentGridData,
        puzzleDate: puzzle.date
      };
      console.log('Sending to validateGridAnswers:', payload);
      
      const result: ValidationResult = await puzzleAPI.validateGridAnswers(payload);

      // Update validation results for visual feedback
      setValidationResults(result.results);
      setCellValidation(result.cellValidation || {});
      
      // Update progress - ONLY use solvedClues for UI display, NOT for grid rendering
      setProgress(prev => prev ? {
        ...prev,
        answers: result.solvedClues,  // Clue answers for UI display only
        completedClues: [...new Set([...prev.completedClues, ...result.newCompletedClues])],
        isCompleted: result.isCompleted,
        solveTime: result.solveTime
      } : null);

      // Grid validation is handled internally - do NOT update currentGridData
      // The grid rendering uses its own state and direction-specific storage
      
      // Show new achievements
      if (result.newAchievements && result.newAchievements.length > 0) {
        setNewAchievements(result.newAchievements);
        setShowAchievements(true);
      }

      console.log('Validation complete:', {
        clueResults: result.results,
        cellValidation: Object.keys(result.cellValidation).length + ' cells validated',
        solvedClues: result.solvedClues
      });

    } catch (error) {
      console.error('Error validating answers:', error);
    }
  };

  const canCheckAnswers = () => {
    // Pure grid-based system allows checking at any time with any letters
    return !!(puzzle && currentGridData.length > 0);
  };

  const handleCloseAchievements = () => {
    setShowAchievements(false);
    setNewAchievements([]);
  };

  const handleConfirmAutoSolve = async () => {
    setShowAutoSolveModal(false);
    await performAutoSolve();
  };

  const performAutoSolve = async () => {
    if (!puzzle || !progress) return;

    try {
      setAutoSolving(true);
      const result = await puzzleAPI.autoSolve(puzzle.date);
      
      // Update state with all answers
      setAnswers(result.answers);
      setAutoSolved(true);
      
      // Update progress
      setProgress(prev => prev ? {
        ...prev,
        answers: result.answers,
        completedClues: result.completedClues,
        isCompleted: result.isCompleted,
        solveTime: null // No solve time for auto-solved
      } : null);

      // Update validation results - both clue and cell level
      setValidationResults(result.results || {});
      setCellValidation(result.cellValidation || {});

      // Update initial grid data to reflect the solved grid
      if (result.validatedGrid) {
        setInitialGridData(result.validatedGrid);
      }

    } catch (error: any) {
      console.error('Error auto-solving puzzle:', error);
      
      // Handle cooldown error specifically
      if (error.response?.status === 429 && error.response?.data?.error === 'AUTO_SOLVE_COOLDOWN') {
        setCooldownData({
          remainingTime: error.response.data.remainingTime,
          message: error.response.data.message
        });
        setShowCooldownError(true);
      }
    } finally {
      setAutoSolving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="cosmic-card p-8 flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500/30 border-t-purple-500"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-purple-500/20"></div>
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-medium mb-2">Loading today&apos;s cosmic puzzle...</p>
              <p className="text-purple-200 text-sm">Scanning the galaxy for crossword signals ✨</p>
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
            <div className="text-6xl mb-6">💫</div>
            <h2 className="stellar-text text-2xl font-bold mb-4">Houston, we have a problem!</h2>
            <p className="text-red-400 text-lg mb-6">{error}</p>
            <button
              onClick={loadTodaysPuzzle}
              className="nebula-button"
            >
              🚀 Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!puzzle || !progress) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Compact Header */}
      <div className="max-w-7xl mx-auto px-2 py-2">
        <div className="cosmic-card p-2 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl cosmic-float">🌌</div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold nebula-text">
                  Today&apos;s Cosmic Crossword
                </h1>
                <div className="flex items-center gap-2 text-purple-200 text-sm">
                  <span>📅</span>
                  <p>
                    {new Date(puzzle.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>
            {/* Progress Overview - Moved to header */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-purple-200 text-sm">Progress:</span>
                <span className="text-green-400 font-bold">
                  {progress.completedClues?.length || 0}/{puzzle.clues.length}
                </span>
              </div>
              <div className="w-24 bg-purple-900/50 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${((progress.completedClues?.length || 0) / puzzle.clues.length) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-2 pb-2">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
          {/* Crossword Grid - Takes up more space */}
          <div className="lg:col-span-3">
            <div className="cosmic-card p-2">
              <div className="flex justify-center">
                <CrosswordGrid
                  grid={puzzle.grid}
                  clues={puzzle.clues}
                  progress={progress}
                  onCellFocus={setFocusedClue}
                  onGridDataChange={setCurrentGridData}
                  validationResults={validationResults}
                  cellValidation={cellValidation}
                  isCompleted={progress.isCompleted}
                  readOnly={progress.isCompleted}
                  initialGridData={initialGridData}
                />
              </div>
            </div>
          </div>

          {/* Compact Clues Panel */}
          <div className="lg:col-span-2">
            <div className="space-y-2">
              {/* Mobile Progress Overview */}
              <div className="md:hidden cosmic-card p-2">
                <div className="flex items-center justify-between">
                  <span className="text-purple-200 text-sm">Progress:</span>
                  <span className="text-green-400 font-bold">
                    {progress.completedClues?.length || 0}/{puzzle.clues.length}
                  </span>
                </div>
                <div className="w-full bg-purple-900/50 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${((progress.completedClues?.length || 0) / puzzle.clues.length) * 100}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Action Buttons - Moved to top */}
              {!progress.isCompleted && (
                <div className="cosmic-card p-2 border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🎯</span>
                    <h3 className="font-bold text-white text-sm">Actions</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={handleCheckAnswers}
                      disabled={!canCheckAnswers()}
                      className={`w-full aurora-button text-sm py-2 ${!canCheckAnswers() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span>✨</span>
                        <span>Check Answers</span>
                      </span>
                    </button>

                    <button
                      onClick={() => setShowAutoSolveModal(true)}
                      disabled={autoSolving}
                      className="w-full stellar-button text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {autoSolving ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                          <span>Revealing...</span>
                        </div>
                      ) : (
                        <span className="flex items-center justify-center gap-1">
                          <span>🔍</span>
                          <span>Auto-Solve</span>
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Clues - More compact */}
              <div className="cosmic-card p-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📝</span>
                  <h3 className="font-bold text-white text-sm">Clues</h3>
                </div>
                <CrosswordClues
                  clues={puzzle.clues}
                  progress={progress}
                  focusedClue={focusedClue}
                  onClueClick={setFocusedClue}
                  validationResults={validationResults}
                />
              </div>

              {progress.isCompleted && progress.solveTime && (
                <div className="cosmic-card p-4 text-center border-2 border-green-500/50 bg-gradient-to-br from-green-500/20 to-blue-500/20">
                  <div className="text-4xl mb-3">🎉</div>
                  <div className="text-xl font-bold text-white mb-2">Victory! 🌟</div>
                  <div className="text-purple-200 text-sm">
                    <p>Time: {Math.floor(progress.solveTime / 60)}:{(progress.solveTime % 60).toString().padStart(2, '0')} ⏱️</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Solve Confirmation Modal */}
      {showAutoSolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="cosmic-card p-6 max-w-md w-full text-center border-2 border-orange-500/50">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-4">Auto-Solve Confirmation</h2>
            <p className="text-purple-200 mb-6">
              Are you sure you want to auto-solve this puzzle? This action cannot be undone.
            </p>
            
            {/* Warning Cards */}
            <div className="space-y-3 mb-6">
              <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-200">
                  <span>🚫</span>
                  <span className="text-sm font-medium">No points will be awarded</span>
                </div>
              </div>
              <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-200">
                  <span>🏆</span>
                  <span className="text-sm font-medium">No achievements will be granted</span>
                </div>
              </div>
              <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-200">
                  <span>📊</span>
                  <span className="text-sm font-medium">Won't appear in your solved puzzle history</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowAutoSolveModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAutoSolve}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-500 transition-colors"
              >
                Auto-Solve Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Solve Cooldown Error Modal */}
      {showCooldownError && cooldownData && (
        <CooldownErrorModal 
          cooldownData={cooldownData}
          onClose={() => {
            setShowCooldownError(false);
            setCooldownData(null);
          }}
        />
      )}

      {/* Achievement Modal */}
      {showAchievements && newAchievements.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white p-8 rounded-lg max-w-md w-full text-center animate-pulse">
            <h2 className="text-2xl font-bold mb-4">🏆 New Achievement{newAchievements.length > 1 ? 's' : ''} Unlocked!</h2>
            <div className="space-y-4">
              {newAchievements.map((userAchievement, index) => (
                <div key={index} className="bg-white bg-opacity-20 rounded-lg p-4">
                  <div className="text-3xl mb-2">{userAchievement.achievement.icon}</div>
                  <div className="font-bold text-lg">{userAchievement.achievement.name}</div>
                  <div className="text-sm opacity-90">{userAchievement.achievement.description}</div>
                  <div className="text-yellow-300 font-bold mt-2">+{userAchievement.achievement.points} points</div>
                </div>
              ))}
            </div>
            <button
              onClick={handleCloseAchievements}
              className="mt-6 px-6 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}