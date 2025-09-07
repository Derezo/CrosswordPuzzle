'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { CrosswordGrid } from '@/components/CrosswordGrid';
import { CrosswordClues } from '@/components/CrosswordClues';
import { puzzleAPI } from '@/lib/api';
import { DailyPuzzle, UserProgress, CrosswordClue, ValidationResult, UserAchievement } from '@/types';

export default function PuzzlePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [focusedClue, setFocusedClue] = useState<CrosswordClue | null>(null);
  const [validationResults, setValidationResults] = useState<{ [key: number]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAchievements, setNewAchievements] = useState<UserAchievement[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [autoSolving, setAutoSolving] = useState(false);
  const [autoSolved, setAutoSolved] = useState(false);

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
    } catch (error) {
      console.error('Error loading puzzle:', error);
      setError('Failed to load today\'s puzzle');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (clueNumber: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [clueNumber.toString()]: answer
    }));
  };

  const handleCheckAnswers = async () => {
    if (!puzzle || !progress) return;

    try {
      const result: ValidationResult = await puzzleAPI.validateAnswers({
        answers,
        puzzleDate: puzzle.date
      });

      setValidationResults(result.results);
      
      // Update progress
      setProgress(prev => prev ? {
        ...prev,
        answers,
        completedClues: [...new Set([...prev.completedClues, ...result.newCompletedClues])],
        isCompleted: result.isCompleted,
        solveTime: result.solveTime
      } : null);

      // Show new achievements
      if (result.newAchievements && result.newAchievements.length > 0) {
        setNewAchievements(result.newAchievements);
        setShowAchievements(true);
      }

    } catch (error) {
      console.error('Error validating answers:', error);
    }
  };

  const canCheckAnswers = () => {
    if (!puzzle || !answers) return false;
    
    // Check if any row or column is complete
    return Object.keys(answers).some(clueNumberStr => {
      const clue = puzzle.clues.find(c => c.number === parseInt(clueNumberStr));
      const answer = answers[clueNumberStr];
      return clue && answer && answer.length === clue.length;
    });
  };

  const handleCloseAchievements = () => {
    setShowAchievements(false);
    setNewAchievements([]);
  };

  const handleAutoSolve = async () => {
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

      // Validate all answers to show them as correct
      const allValidations: { [key: number]: boolean } = {};
      result.completedClues.forEach(clueNumber => {
        allValidations[clueNumber] = true;
      });
      setValidationResults(allValidations);

    } catch (error) {
      console.error('Error auto-solving puzzle:', error);
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
              <p className="text-white text-xl font-medium mb-2">Loading today's cosmic puzzle...</p>
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
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="cosmic-card p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl cosmic-float">🌌</div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold nebula-text">
                  Today's Cosmic Crossword
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
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Crossword Grid - Takes up more space */}
          <div className="lg:col-span-3">
            <div className="cosmic-card p-4">
              <div className="flex justify-center">
                <CrosswordGrid
                  grid={puzzle.grid}
                  clues={puzzle.clues}
                  progress={progress}
                  onAnswerChange={handleAnswerChange}
                  onCellFocus={setFocusedClue}
                  validationResults={validationResults}
                  isCompleted={progress.isCompleted}
                  readOnly={progress.isCompleted}
                />
              </div>
            </div>
          </div>

          {/* Compact Clues Panel */}
          <div className="lg:col-span-2">
            <div className="space-y-3">
              {/* Mobile Progress Overview */}
              <div className="md:hidden cosmic-card p-3">
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
                <div className="cosmic-card p-3 border-blue-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🎯</span>
                    <h3 className="font-bold text-white text-sm">Actions</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={handleCheckAnswers}
                      disabled={!canCheckAnswers()}
                      className={`w-full aurora-button text-sm py-2 ${!canCheckAnswers() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {canCheckAnswers() ? (
                        <span className="flex items-center justify-center gap-2">
                          <span>✨</span>
                          <span>Check Answers</span>
                        </span>
                      ) : (
                        'Complete a word to check'
                      )}
                    </button>

                    <button
                      onClick={handleAutoSolve}
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
              <div className="cosmic-card p-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📝</span>
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

              {progress.isCompleted && (
                <div className={`cosmic-card p-4 text-center border-2 ${
                  autoSolved 
                    ? 'border-orange-500/50 bg-gradient-to-br from-orange-500/20 to-yellow-500/20' 
                    : 'border-green-500/50 bg-gradient-to-br from-green-500/20 to-blue-500/20'
                }`}>
                  <div className="text-4xl mb-3">
                    {autoSolved ? '🔍' : '🎉'}
                  </div>
                  <div className="text-xl font-bold text-white mb-2">
                    {autoSolved ? 'Auto-Solved!' : 'Victory! 🌟'}
                  </div>
                  <div className="text-purple-200 text-sm">
                    {autoSolved ? (
                      <p>All answers revealed</p>
                    ) : progress.solveTime ? (
                      <p>Time: {Math.floor(progress.solveTime / 60)}:{(progress.solveTime % 60).toString().padStart(2, '0')} ⏱️</p>
                    ) : (
                      <p>Stellar! 🚀</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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