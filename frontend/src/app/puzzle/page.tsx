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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="text-white text-lg">Loading today's cosmic puzzle...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <button
              onClick={loadTodaysPuzzle}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Try Again
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Today's Cosmic Crossword
          </h1>
          <p className="text-gray-300">
            {new Date(puzzle.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Crossword Grid */}
          <div className="lg:col-span-2 flex justify-center">
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

          {/* Clues Panel */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <CrosswordClues
                clues={puzzle.clues}
                progress={progress}
                focusedClue={focusedClue}
                onClueClick={setFocusedClue}
                validationResults={validationResults}
              />

              {/* Check Answers Button */}
              {!progress.isCompleted && (
                <div className="space-y-3">
                  <button
                    onClick={handleCheckAnswers}
                    disabled={!canCheckAnswers()}
                    className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-all duration-200 ${
                      canCheckAnswers()
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 shadow-lg transform hover:scale-105'
                        : 'bg-gray-500 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {canCheckAnswers() ? '✨ Check Answers' : 'Complete a word to check'}
                  </button>

                  {/* Auto-Solve Button */}
                  <button
                    onClick={handleAutoSolve}
                    disabled={autoSolving}
                    className="w-full py-3 px-6 rounded-lg font-medium text-white transition-all duration-200 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {autoSolving ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Revealing answers...
                      </div>
                    ) : (
                      '🔍 Auto-Solve (No points)'
                    )}
                  </button>
                </div>
              )}

              {progress.isCompleted && (
                <div className={`text-white p-6 rounded-lg text-center ${
                  autoSolved 
                    ? 'bg-gradient-to-r from-orange-500 to-yellow-500' 
                    : 'bg-gradient-to-r from-green-500 to-blue-500'
                }`}>
                  <div className="text-2xl mb-2">
                    {autoSolved ? '🔍 Puzzle Auto-Solved!' : '🌟 Puzzle Completed! 🌟'}
                  </div>
                  <div className="text-sm opacity-90">
                    {autoSolved ? (
                      <p>All answers revealed • No points awarded</p>
                    ) : progress.solveTime ? (
                      <p>Time: {Math.floor(progress.solveTime / 60)}:{(progress.solveTime % 60).toString().padStart(2, '0')}</p>
                    ) : null}
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