"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { CrosswordGrid, GridCellData } from "@/components/CrosswordGrid";
import { CrosswordClues } from "@/components/CrosswordClues";
import { puzzleAPI, suggestionAPI } from "@/lib/api";
import {
  DailyPuzzle,
  UserProgress,
  CrosswordClue,
  ValidationResult,
  UserAchievement,
} from "@/types";

interface CooldownErrorModalProps {
  cooldownData: {
    remainingTime: {
      hours: number;
      minutes: number;
      seconds: number;
      totalSeconds: number;
    };
    message: string;
  };
  onClose: () => void;
}

interface FeedbackModalProps {
  clue: CrosswordClue;
  answer: string;
  onClose: () => void;
  onSubmit: (feedback: {
    clueNumber: number;
    originalClue: string;
    originalAnswer: string;
    suggestedClue?: string;
    suggestedAnswer?: string;
    comments?: string;
  }) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  clue,
  answer,
  onClose,
  onSubmit,
}) => {
  const [suggestWordEdit, setSuggestWordEdit] = useState(false);
  const [suggestClueEdit, setSuggestClueEdit] = useState(false);
  const [editedWord, setEditedWord] = useState(answer);
  const [editedClue, setEditedClue] = useState(clue.clue);
  const [comments, setComments] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      clueNumber: clue.number,
      originalClue: clue.clue,
      originalAnswer: answer,
      suggestedClue: suggestClueEdit ? editedClue : undefined,
      suggestedAnswer: suggestWordEdit ? editedWord : undefined,
      comments: comments.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="cosmic-card p-6 max-w-md w-full border-2 border-blue-500/50">
        <div className="text-4xl mb-4 text-center">💭</div>
        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          Provide Feedback
        </h2>
        <p className="text-purple-200 mb-4 text-center text-sm">
          Help us improve this clue #{clue.number} ({clue.direction})
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Word Section */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Answer Word
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedWord}
                onChange={(e) => setEditedWord(e.target.value.toUpperCase().slice(0, 15))}
                disabled={!suggestWordEdit}
                maxLength={15}
                className="flex-1 cosmic-input text-lg font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label className="flex items-center gap-2 text-sm text-purple-200">
                <input
                  type="checkbox"
                  checked={suggestWordEdit}
                  onChange={(e) => setSuggestWordEdit(e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                />
                Suggest Word Edit
              </label>
            </div>
          </div>

          {/* Clue Section */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Clue
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={editedClue}
                onChange={(e) => setEditedClue(e.target.value.slice(0, 100))}
                disabled={!suggestClueEdit}
                maxLength={100}
                className="w-full cosmic-input disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label className="flex items-center gap-2 text-sm text-purple-200">
                <input
                  type="checkbox"
                  checked={suggestClueEdit}
                  onChange={(e) => setSuggestClueEdit(e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                />
                Suggest Clue Edit
              </label>
            </div>
          </div>

          {/* Comments Section */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Additional Comments (optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share any additional thoughts or context about this clue..."
              rows={3}
              className="w-full cosmic-input resize-none"
            />
            <div className="text-xs text-purple-300 mt-1">
              Help us understand what could be improved about this clue
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!suggestWordEdit && !suggestClueEdit && !comments.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              Submit Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CooldownErrorModal: React.FC<CooldownErrorModalProps> = ({
  cooldownData,
  onClose,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(
    cooldownData.remainingTime.totalSeconds,
  );

  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
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
        <h2 className="text-2xl font-bold text-white mb-4">
          Auto-Solve Locked
        </h2>
        <p className="text-red-400 text-lg mb-6">{cooldownData.message}</p>

        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40 rounded-lg p-4 mb-6">
          <div className="text-sm text-red-200 mb-2">Time remaining:</div>
          <div className="text-2xl font-bold text-white font-mono">
            {remainingSeconds > 0
              ? formatTime(remainingSeconds)
              : "Available now!"}
          </div>
          {remainingSeconds > 0 && (
            <div className="text-xs text-red-300 mt-2">
              Puzzles have a cooldown period before auto-solve becomes available
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
  const searchParams = useSearchParams();

  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [focusedClue, setFocusedClue] = useState<CrosswordClue | null>(null);
  const [validationResults, setValidationResults] = useState<{
    [key: number]: boolean;
  }>({});
  const [cellValidation, setCellValidation] = useState<{
    [cellKey: string]: boolean;
  }>({});
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
    remainingTime: {
      hours: number;
      minutes: number;
      seconds: number;
      totalSeconds: number;
    };
    message: string;
  } | null>(null);
  const [solveTime, setSolveTime] = useState(0);
  const [energyOrbs, setEnergyOrbs] = useState<Array<{
    id: string;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
  }>>([]);
  const [feedbackClue, setFeedbackClue] = useState<CrosswordClue | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [puzzleType, setPuzzleType] = useState<'daily' | 'category'>('daily');
  const [currentPuzzleDate, setCurrentPuzzleDate] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      // Check for URL parameters to determine puzzle type
      const dateParam = searchParams.get('date');
      
      if (dateParam) {
        // Category puzzle or specific date puzzle
        setCurrentPuzzleDate(dateParam);
        setPuzzleType(dateParam.includes('-cat-') ? 'category' : 'daily');
        loadSpecificPuzzle(dateParam);
      } else {
        // Default to today's daily puzzle
        setCurrentPuzzleDate(null);
        setPuzzleType('daily');
        loadTodaysPuzzle();
      }
    }
  }, [user, authLoading, router, searchParams]);

  // Timer logic - uses firstViewedAt from backend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (puzzle && progress && !progress.isCompleted && progress.firstViewedAt) {
      interval = setInterval(() => {
        const now = new Date();
        const firstViewedTime = new Date(progress.firstViewedAt!);
        const elapsed = Math.floor((now.getTime() - firstViewedTime.getTime()) / 1000);
        setSolveTime(elapsed);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [puzzle, progress]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const createEnergyOrbs = (newCompletedClues: number[]) => {
    if (!puzzle || newCompletedClues.length === 0) return;
    
    console.log('Creating energy orbs for completed clues:', newCompletedClues);
    
    // Find progress bar position (desktop and mobile)
    const progressBar = document.querySelector('.progress-bar-container');
    if (!progressBar) {
      console.log('Progress bar container not found');
      return;
    }
    
    const progressBarRect = progressBar.getBoundingClientRect();
    const targetX = progressBarRect.right - 20; // Offset to center of bar
    const targetY = progressBarRect.top + progressBarRect.height / 2;
    
    console.log('Progress bar target position:', { targetX, targetY });
    
    // Create orbs from green (validated) cells
    const greenCells = document.querySelectorAll('.validation-shimmer');
    console.log('Found green cells:', greenCells.length);
    
    // If no green cells, try to find any validated cells
    const allCells = document.querySelectorAll('[class*="bg-gradient-to-br"][class*="green"]');
    console.log('Found validated cells:', allCells.length);
    
    const cellsToUse = greenCells.length > 0 ? greenCells : allCells;
    
    const newOrbs: Array<{
      id: string;
      startX: number;
      startY: number;
      targetX: number;
      targetY: number;
    }> = [];
    
    cellsToUse.forEach((cell, index) => {
      const rect = cell.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      
      console.log(`Orb ${index}:`, { startX, startY, targetX, targetY });
      
      newOrbs.push({
        id: `orb-${Date.now()}-${index}`,
        startX,
        startY,
        targetX,
        targetY,
      });
    });
    
    console.log('Created orbs:', newOrbs);
    setEnergyOrbs(newOrbs);
    
    // Clear orbs after animation
    setTimeout(() => {
      console.log('Clearing orbs and triggering explosion');
      setEnergyOrbs([]);
      triggerProgressBarExplosion();
    }, 1200);
  };
  
  const triggerProgressBarExplosion = () => {
    const progressBar = document.querySelector('.progress-bar-container .relative');
    if (progressBar) {
      // Get progress bar position for firework burst
      const progressBarRect = progressBar.getBoundingClientRect();
      const centerX = progressBarRect.right - 20;
      const centerY = progressBarRect.top + progressBarRect.height / 2;
      
      // Create firework particles
      createFireworkParticles(centerX, centerY);
      
      // Trigger progress bar explosion animation
      progressBar.classList.add('progress-bar-energized');
      setTimeout(() => {
        progressBar.classList.remove('progress-bar-energized');
      }, 600);
    }
  };

  const createFireworkParticles = (centerX: number, centerY: number) => {
    const particleCount = 12;
    const particles: HTMLElement[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'firework-particle';
      
      // Calculate random direction for particle explosion
      const angle = (i / particleCount) * 2 * Math.PI + (Math.random() - 0.5) * 0.5;
      const distance = 40 + Math.random() * 30; // Random distance 40-70px
      const particleX = Math.cos(angle) * distance;
      const particleY = Math.sin(angle) * distance;
      
      // Set custom properties for animation
      particle.style.setProperty('--particle-x', `${particleX}px`);
      particle.style.setProperty('--particle-y', `${particleY}px`);
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      
      document.body.appendChild(particle);
      particles.push(particle);
    }
    
    // Clean up particles after animation completes
    setTimeout(() => {
      particles.forEach(particle => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      });
    }, 1200);
  };

  const loadTodaysPuzzle = async () => {
    try {
      setLoading(true);
      
      // Clear previous puzzle state
      setPuzzle(null);
      setProgress(null);
      setValidationResults({});
      setCellValidation({});
      setCurrentGridData([]);
      setInitialGridData([]);
      setAutoSolved(false);
      setSolveTime(0);
      setError(null);
      
      const data = await puzzleAPI.getTodaysPuzzle();
      setPuzzle(data.puzzle);
      setProgress(data.progress);

      // Check if puzzle was auto-solved (no solve time indicates auto-solve)
      setAutoSolved(data.progress.isCompleted && !data.progress.solveTime);

      // Initialize timer if puzzle is not completed
      if (!data.progress.isCompleted) {
        // Timer will start from firstViewedAt (handled by useEffect)
        setSolveTime(0);
      } else {
        // For completed puzzles, use their actual solve time
        setSolveTime(data.progress.solveTime || 0);
      }

      // Use saved gridData if available, otherwise reconstruct if completed
      if (data.progress.gridData) {
        // Use saved grid state directly
        setInitialGridData(data.progress.gridData);
        
        // Create validation results showing all completed clues as correct
        const completedValidations: { [key: number]: boolean } = {};
        data.progress.completedClues.forEach((clueNumber) => {
          completedValidations[clueNumber] = true;
        });
        setValidationResults(completedValidations);

        // Create cell validation showing validated cells as correct
        const savedCellValidation: { [cellKey: string]: boolean } = {};
        for (let row = 0; row < data.progress.gridData.length; row++) {
          for (let col = 0; col < data.progress.gridData[0]?.length || 0; col++) {
            const cell = data.progress.gridData[row][col];
            if (cell && cell.letter && !data.puzzle.grid[row][col].isBlocked) {
              savedCellValidation[`${row},${col}`] = true;
            }
          }
        }
        setCellValidation(savedCellValidation);
      } else if (data.progress.isCompleted && data.progress.answers) {
        // Create validation results showing all clues as correct
        const completedValidations: { [key: number]: boolean } = {};
        data.progress.completedClues.forEach((clueNumber) => {
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
        const reconstructedGrid: GridCellData[][] = data.puzzle.grid.map(
          (row, rowIndex) =>
            row.map((cell, colIndex) => {
              if (cell.isBlocked) {
                return {
                  letter: "",
                  acrossLetter: undefined,
                  downLetter: undefined,
                  lastActiveDirection: undefined,
                };
              }

              // Find clues that intersect this position
              const cluesAtPosition = data.puzzle.clues.filter((clue) => {
                if (clue.direction === "across") {
                  return (
                    rowIndex === clue.startRow &&
                    colIndex >= clue.startCol &&
                    colIndex < clue.startCol + clue.length
                  );
                } else {
                  return (
                    colIndex === clue.startCol &&
                    rowIndex >= clue.startRow &&
                    rowIndex < clue.startRow + clue.length
                  );
                }
              });

              let acrossLetter = undefined;
              let downLetter = undefined;
              let displayLetter = "";
              let lastActiveDirection: "across" | "down" | undefined =
                undefined;

              // Extract letters from solved clue answers
              cluesAtPosition.forEach((clue) => {
                const answer = data.progress.answers[clue.number.toString()];
                if (answer) {
                  const positionInClue =
                    clue.direction === "across"
                      ? colIndex - clue.startCol
                      : rowIndex - clue.startRow;

                  if (positionInClue >= 0 && positionInClue < answer.length) {
                    const letter = answer[positionInClue].toUpperCase();
                    if (clue.direction === "across") {
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
                lastActiveDirection,
              };
            }),
        );

        setInitialGridData(reconstructedGrid);
      }
    } catch (error) {
      console.error("Error loading puzzle:", error);
      setError("Failed to load today's puzzle");
    } finally {
      setLoading(false);
    }
  };

  const loadSpecificPuzzle = async (puzzleDate: string) => {
    try {
      setLoading(true);
      
      // Clear previous puzzle state
      setPuzzle(null);
      setProgress(null);
      setValidationResults({});
      setCellValidation({});
      setCurrentGridData([]);
      setInitialGridData([]);
      setAutoSolved(false);
      setSolveTime(0);
      setError(null);
      
      const data = await puzzleAPI.getSpecificPuzzle(puzzleDate);
      setPuzzle(data.puzzle);
      setProgress(data.progress);

      // Check if puzzle was auto-solved (no solve time indicates auto-solve)
      setAutoSolved(data.progress.isCompleted && !data.progress.solveTime);

      // Initialize timer if puzzle is not completed
      if (!data.progress.isCompleted) {
        setSolveTime(0);
      } else {
        setSolveTime(data.progress.solveTime || 0);
      }

      // Use saved gridData if available, otherwise reconstruct if completed
      if (data.progress.gridData) {
        setInitialGridData(data.progress.gridData);
        
        const completedValidations: { [key: number]: boolean } = {};
        data.progress.completedClues.forEach((clueNumber) => {
          completedValidations[clueNumber] = true;
        });
        setValidationResults(completedValidations);

        const savedCellValidation: { [cellKey: string]: boolean } = {};
        for (let row = 0; row < data.progress.gridData.length; row++) {
          for (let col = 0; col < data.progress.gridData[0]?.length || 0; col++) {
            const cell = data.progress.gridData[row][col];
            if (cell && cell.letter && !data.puzzle.grid[row][col].isBlocked) {
              savedCellValidation[`${row},${col}`] = true;
            }
          }
        }
        setCellValidation(savedCellValidation);
      } else if (data.progress.isCompleted && data.progress.answers) {
        // Handle completed puzzles without saved grid data
        const completedValidations: { [key: number]: boolean } = {};
        data.progress.completedClues.forEach((clueNumber) => {
          completedValidations[clueNumber] = true;
        });
        setValidationResults(completedValidations);

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

        // Reconstruct the grid data with solved answers (same logic as loadTodaysPuzzle)
        const reconstructedGrid: GridCellData[][] = data.puzzle.grid.map(
          (row, rowIndex) =>
            row.map((cell, colIndex) => {
              if (cell.isBlocked) {
                return {
                  letter: "",
                  acrossLetter: undefined,
                  downLetter: undefined,
                  lastActiveDirection: undefined,
                };
              }

              const cluesAtPosition = data.puzzle.clues.filter((clue) => {
                if (clue.direction === "across") {
                  return (
                    rowIndex === clue.startRow &&
                    colIndex >= clue.startCol &&
                    colIndex < clue.startCol + clue.length
                  );
                } else {
                  return (
                    colIndex === clue.startCol &&
                    rowIndex >= clue.startRow &&
                    rowIndex < clue.startRow + clue.length
                  );
                }
              });

              let acrossLetter = undefined;
              let downLetter = undefined;
              let displayLetter = "";
              let lastActiveDirection: "across" | "down" | undefined = undefined;

              cluesAtPosition.forEach((clue) => {
                const answer = data.progress.answers[clue.number.toString()];
                if (answer) {
                  const positionInClue =
                    clue.direction === "across"
                      ? colIndex - clue.startCol
                      : rowIndex - clue.startRow;

                  if (positionInClue >= 0 && positionInClue < answer.length) {
                    const letter = answer[positionInClue].toUpperCase();
                    if (clue.direction === "across") {
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
                lastActiveDirection,
              };
            }),
        );

        setInitialGridData(reconstructedGrid);
      }
    } catch (error) {
      console.error("Error loading specific puzzle:", error);
      setError("Failed to load the requested puzzle");
    } finally {
      setLoading(false);
    }
  };

  // Legacy function - no longer used in pure grid-based system
  // Grid updates happen internally in CrosswordGrid component

  const handleCheckAnswers = async () => {
    console.log("handleCheckAnswers called");
    console.log(
      "currentGridData:",
      currentGridData.length > 0
        ? `${currentGridData.length}x${currentGridData[0]?.length || 0}`
        : "empty",
    );
    console.log("currentGridData sample:", currentGridData[0]?.[0]);

    if (!puzzle || !progress || currentGridData.length === 0) {
      console.log("Early return - missing data");
      return;
    }

    try {
      // PURE GRID-BASED VALIDATION
      const payload = {
        gridData: currentGridData,
        puzzleDate: currentPuzzleDate || puzzle.date,
      };
      console.log("Sending to validateGridAnswers:", payload);

      const result: ValidationResult =
        await puzzleAPI.validateGridAnswers(payload);

      // Update validation results for visual feedback
      setValidationResults(result.results);
      setCellValidation(result.cellValidation || {});

      // Update progress - ONLY use solvedClues for UI display, NOT for grid rendering
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              answers: result.solvedClues, // Clue answers for UI display only
              completedClues: [
                ...new Set([
                  ...prev.completedClues,
                  ...result.newCompletedClues,
                ]),
              ],
              isCompleted: result.isCompleted,
              solveTime: result.solveTime,
            }
          : null,
      );

      // Grid validation is handled internally - do NOT update currentGridData
      // The grid rendering uses its own state and direction-specific storage

      // Create energy orbs animation for new completed clues
      if (result.newCompletedClues && result.newCompletedClues.length > 0) {
        // Small delay to ensure DOM is updated with validation classes
        setTimeout(() => {
          createEnergyOrbs(result.newCompletedClues);
        }, 100);
      }

      // Show new achievements
      if (result.newAchievements && result.newAchievements.length > 0) {
        setNewAchievements(result.newAchievements);
        setShowAchievements(true);
      }

      console.log("Validation complete:", {
        clueResults: result.results,
        cellValidation:
          Object.keys(result.cellValidation).length + " cells validated",
        solvedClues: result.solvedClues,
      });
    } catch (error) {
      console.error("Error validating answers:", error);
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

  const handleCellEdit = () => {
    // Clear validation results when user edits a cell
    setValidationResults({});
    setCellValidation({});
  };

  const handleFeedbackClick = (clue: CrosswordClue) => {
    setFeedbackClue(clue);
    setShowFeedbackModal(true);
  };

  const handleConfirmAutoSolve = async () => {
    setShowAutoSolveModal(false);
    await performAutoSolve();
  };

  const performAutoSolve = async () => {
    if (!puzzle || !progress) return;

    try {
      setAutoSolving(true);
      const result = await puzzleAPI.autoSolve(currentPuzzleDate || puzzle.date);

      setAutoSolved(true);

      // Update progress
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              answers: result.answers,
              completedClues: result.completedClues,
              isCompleted: result.isCompleted,
              solveTime: null, // No solve time for auto-solved
            }
          : null,
      );

      // Update validation results - both clue and cell level
      setValidationResults(result.results || {});
      setCellValidation(result.cellValidation || {});

      // Update initial grid data to reflect the solved grid
      if (result.validatedGrid) {
        setInitialGridData(result.validatedGrid);
      }

      // Trigger energy orbs animation for all completed clues
      if (result.completedClues && result.completedClues.length > 0) {
        // Small delay to ensure DOM is updated with validation classes
        setTimeout(() => {
          createEnergyOrbs(result.completedClues);
        }, 500); // Slightly longer delay for auto-solve to make it more dramatic
      }
    } catch (error: any) {
      console.error("Error auto-solving puzzle:", error);

      // Handle cooldown error specifically
      if (
        error.response?.status === 429 &&
        error.response?.data?.error === "AUTO_SOLVE_COOLDOWN"
      ) {
        setCooldownData({
          remainingTime: error.response.data.remainingTime,
          message: error.response.data.message,
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
              <p className="text-white text-xl font-medium mb-2">
                Loading today's cosmic puzzle...
              </p>
              <p className="text-purple-200 text-sm">
                Scanning the galaxy for crossword signals ✨
              </p>
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
            <h2 className="stellar-text text-2xl font-bold mb-4">
              Houston, we have a problem!
            </h2>
            <p className="text-red-400 text-lg mb-6">{error}</p>
            <button onClick={loadTodaysPuzzle} className="nebula-button">
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
                  {puzzleType === 'category' ? 'Category Puzzle' : "Today's Cosmic Crossword"}
                </h1>
                <div className="flex items-center gap-2 text-purple-200 text-sm">
                  <span>{puzzleType === 'category' ? '🎯' : '📅'}</span>
                  <p>
                    {puzzleType === 'category' && currentPuzzleDate ? (
                      // Extract category name from date format
                      (() => {
                        const categoryMatch = currentPuzzleDate.match(/-cat-(.+)$/);
                        const categoryName = categoryMatch ? categoryMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown';
                        return `${categoryName} Theme`;
                      })()
                    ) : (
                      new Date(puzzle.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    )}
                  </p>
                </div>
              </div>
            </div>
            {/* Progress Overview with Timer */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-purple-200 text-sm">Progress:</span>
                <span className="text-green-400 font-bold">
                  {progress.completedClues?.length || 0}/{puzzle.clues.length}
                </span>
              </div>
              
              {/* Enhanced Progress Bar with Charging Animation */}
              <div className="progress-bar-container relative w-32 bg-purple-900/50 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="relative bg-gradient-to-r from-green-500 via-green-400 to-blue-500 h-full rounded-full transition-all duration-700 ease-out shadow-lg"
                  style={{
                    width: `${((progress.completedClues?.length || 0) / puzzle.clues.length) * 100}%`,
                  }}
                >
                  {/* Charging pulse animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                  <div 
                    className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-pulse"
                    style={{
                      animation: 'charge-pulse 2s ease-in-out infinite',
                      animationDelay: '0.5s'
                    }}
                  ></div>
                </div>
                
                {/* Sparkle effects */}
                {(progress.completedClues?.length || 0) > 0 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
                )}
              </div>
              
              {/* Timer */}
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-900/30 rounded-lg border border-purple-500/30">
                <span className="text-purple-300 text-sm">⏱️</span>
                <span className="text-white font-mono text-sm font-bold">
                  {formatTime(solveTime)}
                </span>
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
                  onCellEdit={handleCellEdit}
                  cellValidation={cellValidation}
                  isCompleted={progress.isCompleted}
                  readOnly={progress.isCompleted}
                  initialGridData={initialGridData}
                  onCheckAnswers={handleCheckAnswers}
                  onAutoSolve={() => setShowAutoSolveModal(true)}
                  canCheckAnswers={canCheckAnswers()}
                  autoSolving={autoSolving}
                />
              </div>
            </div>
          </div>

          {/* Compact Clues Panel */}
          <div className="lg:col-span-2">
            <div className="space-y-2">
              {/* Mobile Progress Overview */}
              <div className="md:hidden cosmic-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-200 text-sm">Progress:</span>
                  <span className="text-green-400 font-bold">
                    {progress.completedClues?.length || 0}/{puzzle.clues.length}
                  </span>
                </div>
                
                {/* Enhanced Mobile Progress Bar */}
                <div className="progress-bar-container relative w-full bg-purple-900/50 rounded-full h-3 overflow-hidden shadow-inner mb-2">
                  <div
                    className="relative bg-gradient-to-r from-green-500 via-green-400 to-blue-500 h-full rounded-full transition-all duration-700 ease-out shadow-lg"
                    style={{
                      width: `${((progress.completedClues?.length || 0) / puzzle.clues.length) * 100}%`,
                    }}
                  >
                    {/* Charging pulse animation */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                  </div>
                  
                  {/* Mobile sparkle effects */}
                  {(progress.completedClues?.length || 0) > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
                  )}
                </div>
                
                {/* Mobile Timer */}
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 px-2 py-1 bg-purple-900/30 rounded-lg border border-purple-500/30">
                    <span className="text-purple-300 text-xs">⏱️</span>
                    <span className="text-white font-mono text-xs font-bold">
                      {formatTime(solveTime)}
                    </span>
                  </div>
                </div>
              </div>

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
                  onFeedbackClick={handleFeedbackClick}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Solve Confirmation Modal */}
      {showAutoSolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="cosmic-card p-6 max-w-md w-full text-center border-2 border-orange-500/50">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Auto-Solve Confirmation
            </h2>
            <p className="text-purple-200 mb-6">
              Are you sure you want to auto-solve this puzzle? This action
              cannot be undone.
            </p>

            {/* Warning Cards */}
            <div className="space-y-3 mb-6">
              <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-200">
                  <span>🚫</span>
                  <span className="text-sm font-medium">
                    No points will be awarded
                  </span>
                </div>
              </div>
              <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-200">
                  <span>🏆</span>
                  <span className="text-sm font-medium">
                    No achievements will be granted
                  </span>
                </div>
              </div>
              <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-200">
                  <span>📊</span>
                  <span className="text-sm font-medium">
                    Won't appear in your solved puzzle history
                  </span>
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
            <h2 className="text-2xl font-bold mb-4">
              🏆 New Achievement{newAchievements.length > 1 ? "s" : ""}{" "}
              Unlocked!
            </h2>
            <div className="space-y-4">
              {newAchievements.map((userAchievement, index) => (
                <div
                  key={index}
                  className="bg-white bg-opacity-20 rounded-lg p-4"
                >
                  <div className="text-3xl mb-2">
                    {userAchievement.achievement.icon}
                  </div>
                  <div className="font-bold text-lg">
                    {userAchievement.achievement.name}
                  </div>
                  <div className="text-sm opacity-90">
                    {userAchievement.achievement.description}
                  </div>
                  <div className="text-yellow-300 font-bold mt-2">
                    +{userAchievement.achievement.points} points
                  </div>
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

      {/* Feedback Modal */}
      {showFeedbackModal && feedbackClue && (
        <FeedbackModal
          clue={feedbackClue}
          answer={progress.answers[feedbackClue.number.toString()] || ''}
          onClose={() => {
            setShowFeedbackModal(false);
            setFeedbackClue(null);
          }}
          onSubmit={async (feedback) => {
            try {
              await suggestionAPI.submitSuggestion({
                puzzleDate: currentPuzzleDate || puzzle!.date,
                clueNumber: feedback.clueNumber,
                originalClue: feedback.originalClue,
                originalAnswer: feedback.originalAnswer,
                suggestedClue: feedback.suggestedClue,
                suggestedAnswer: feedback.suggestedAnswer,
                comments: feedback.comments,
              });
              
              console.log('Feedback submitted successfully');
              setShowFeedbackModal(false);
              setFeedbackClue(null);
            } catch (error) {
              console.error('Error submitting feedback:', error);
              // TODO: Show error message to user
            }
          }}
        />
      )}

      {/* Energy Orbs Animation */}
      {energyOrbs.map((orb) => (
        <div
          key={orb.id}
          className="energy-orb traveling"
          style={{
            left: `${orb.startX}px`,
            top: `${orb.startY}px`,
          }}
        />
      ))}
    </div>
  );
}
