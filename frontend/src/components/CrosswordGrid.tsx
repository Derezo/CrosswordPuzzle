'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PuzzleCell, CrosswordClue, UserProgress } from '@/types';
import clsx from 'clsx';

interface CrosswordGridProps {
  grid: PuzzleCell[][];
  clues: CrosswordClue[];
  progress: UserProgress;
  onAnswerChange: (clueNumber: number, answer: string) => void;
  onCellFocus: (clue: CrosswordClue) => void;
  validationResults?: { [clueNumber: number]: boolean };
  isCompleted?: boolean;
  readOnly?: boolean;
}

interface FocusedCell {
  row: number;
  col: number;
  clue: CrosswordClue;
  direction: 'across' | 'down';
}

export const CrosswordGrid: React.FC<CrosswordGridProps> = ({
  grid,
  clues,
  progress,
  onAnswerChange,
  onCellFocus,
  validationResults,
  isCompleted,
  readOnly = false,
}) => {
  const [focusedCell, setFocusedCell] = useState<FocusedCell | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<{ [key: string]: string }>({});
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentAnswers(progress.answers || {});
  }, [progress.answers]);

  const getClueAtPosition = (row: number, col: number): CrosswordClue[] => {
    return clues.filter(clue => {
      if (clue.direction === 'across') {
        return row === clue.startRow && 
               col >= clue.startCol && 
               col < clue.startCol + clue.length;
      } else {
        return col === clue.startCol && 
               row >= clue.startRow && 
               row < clue.startRow + clue.length;
      }
    });
  };

  const getLetterAtPosition = (row: number, col: number): string => {
    const cluesAtPosition = getClueAtPosition(row, col);
    if (cluesAtPosition.length === 0) return '';

    // Check for answer from current input
    for (const clue of cluesAtPosition) {
      const answer = currentAnswers[clue.number.toString()];
      if (answer) {
        if (clue.direction === 'across') {
          const letterIndex = col - clue.startCol;
          return answer[letterIndex] || '';
        } else {
          const letterIndex = row - clue.startRow;
          return answer[letterIndex] || '';
        }
      }
    }

    return '';
  };

  const handleCellClick = (row: number, col: number) => {
    if (readOnly || grid[row][col].isBlocked) return;

    const cluesAtPosition = getClueAtPosition(row, col);
    if (cluesAtPosition.length === 0) return;

    // If there's already a focused cell and multiple clues, cycle through them
    let selectedClue = cluesAtPosition[0];
    if (focusedCell && cluesAtPosition.length > 1) {
      const currentIndex = cluesAtPosition.findIndex(c => 
        c.number === focusedCell.clue.number && c.direction === focusedCell.direction
      );
      selectedClue = cluesAtPosition[(currentIndex + 1) % cluesAtPosition.length];
    }

    setFocusedCell({
      row,
      col,
      clue: selectedClue,
      direction: selectedClue.direction,
    });

    onCellFocus(selectedClue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!focusedCell || readOnly) return;

    const { row, col, clue, direction } = focusedCell;

    if (e.key.match(/^[A-Za-z]$/)) {
      e.preventDefault();
      const letter = e.key.toUpperCase();
      
      // Update the answer
      const currentAnswer = currentAnswers[clue.number.toString()] || '';
      let newAnswer = currentAnswer;
      
      if (direction === 'across') {
        const letterIndex = col - clue.startCol;
        newAnswer = currentAnswer.padEnd(clue.length);
        newAnswer = newAnswer.substring(0, letterIndex) + letter + newAnswer.substring(letterIndex + 1);
      } else {
        const letterIndex = row - clue.startRow;
        newAnswer = currentAnswer.padEnd(clue.length);
        newAnswer = newAnswer.substring(0, letterIndex) + letter + newAnswer.substring(letterIndex + 1);
      }
      
      setCurrentAnswers(prev => ({
        ...prev,
        [clue.number.toString()]: newAnswer.trimEnd()
      }));

      onAnswerChange(clue.number, newAnswer.trimEnd());

      // Move to next cell
      moveToNextCell();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      
      const currentAnswer = currentAnswers[clue.number.toString()] || '';
      let newAnswer = currentAnswer;
      
      if (direction === 'across') {
        const letterIndex = col - clue.startCol;
        if (letterIndex >= 0 && letterIndex < newAnswer.length) {
          newAnswer = newAnswer.substring(0, letterIndex) + newAnswer.substring(letterIndex + 1);
        }
      } else {
        const letterIndex = row - clue.startRow;
        if (letterIndex >= 0 && letterIndex < newAnswer.length) {
          newAnswer = newAnswer.substring(0, letterIndex) + newAnswer.substring(letterIndex + 1);
        }
      }
      
      setCurrentAnswers(prev => ({
        ...prev,
        [clue.number.toString()]: newAnswer
      }));

      onAnswerChange(clue.number, newAnswer);

      // Move to previous cell
      moveToPreviousCell();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || 
               e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      handleArrowKey(e.key);
    }
  };

  const moveToNextCell = () => {
    if (!focusedCell) return;

    const { row, col, clue, direction } = focusedCell;
    let newRow = row;
    let newCol = col;

    if (direction === 'across') {
      newCol = Math.min(col + 1, clue.startCol + clue.length - 1);
    } else {
      newRow = Math.min(row + 1, clue.startRow + clue.length - 1);
    }

    if (newRow !== row || newCol !== col) {
      setFocusedCell({ row: newRow, col: newCol, clue, direction });
    }
  };

  const moveToPreviousCell = () => {
    if (!focusedCell) return;

    const { row, col, clue, direction } = focusedCell;
    let newRow = row;
    let newCol = col;

    if (direction === 'across') {
      newCol = Math.max(col - 1, clue.startCol);
    } else {
      newRow = Math.max(row - 1, clue.startRow);
    }

    if (newRow !== row || newCol !== col) {
      setFocusedCell({ row: newRow, col: newCol, clue, direction });
    }
  };

  const handleArrowKey = (key: string) => {
    if (!focusedCell) return;

    const { row, col } = focusedCell;
    let newRow = row;
    let newCol = col;

    switch (key) {
      case 'ArrowRight':
        newCol = Math.min(col + 1, grid[0].length - 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(col - 1, 0);
        break;
      case 'ArrowDown':
        newRow = Math.min(row + 1, grid.length - 1);
        break;
      case 'ArrowUp':
        newRow = Math.max(row - 1, 0);
        break;
    }

    // Find a valid clue at the new position
    const cluesAtNewPosition = getClueAtPosition(newRow, newCol);
    if (cluesAtNewPosition.length > 0 && !grid[newRow][newCol].isBlocked) {
      const newClue = cluesAtNewPosition[0];
      setFocusedCell({
        row: newRow,
        col: newCol,
        clue: newClue,
        direction: newClue.direction,
      });
      onCellFocus(newClue);
    }
  };

  const getCellClasses = (row: number, col: number) => {
    const cell = grid[row][col];
    const cluesAtPosition = getClueAtPosition(row, col);
    
    // If cell is not part of any clue, treat it as blocked (black)
    const isEffectivelyBlocked = cell.isBlocked || cluesAtPosition.length === 0;
    
    const isInFocusedClue = focusedCell && (
      (focusedCell.direction === 'across' && 
       row === focusedCell.clue.startRow && 
       col >= focusedCell.clue.startCol && 
       col < focusedCell.clue.startCol + focusedCell.clue.length) ||
      (focusedCell.direction === 'down' && 
       col === focusedCell.clue.startCol && 
       row >= focusedCell.clue.startRow && 
       row < focusedCell.clue.startRow + focusedCell.clue.length)
    );
    
    const isFocused = focusedCell?.row === row && focusedCell?.col === col;
    const letter = getLetterAtPosition(row, col);
    
    let validationClass = '';
    if (validationResults && !isEffectivelyBlocked) {
      for (const clue of cluesAtPosition) {
        // Check if this clue has been validated (regardless of completion status)
        if (validationResults[clue.number] !== undefined) {
          if (validationResults[clue.number] === true) {
            validationClass = '!bg-gradient-to-br !from-green-400 !to-emerald-500 !border-green-400 !text-white !shadow-lg validation-shimmer';
          } else if (validationResults[clue.number] === false) {
            validationClass = '!bg-gradient-to-br !from-red-400 !to-pink-500 !border-red-400 !text-white !shadow-lg validation-shimmer';
          }
          break;
        }
      }
    }

    return clsx(
      'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 border flex items-center justify-center text-xs font-bold relative transition-all duration-500 text-white',
      {
        'bg-gradient-to-br from-gray-900 to-black border-gray-700': isEffectivelyBlocked,
        'bg-gradient-to-br from-purple-900/40 via-blue-900/30 to-indigo-900/40 border-purple-500/30 cursor-pointer hover:border-purple-400/50 hover:shadow-md backdrop-blur-sm': !isEffectivelyBlocked && !readOnly && !validationClass,
        'bg-gradient-to-br from-blue-500/40 to-purple-500/40 border-blue-400/50 shadow-lg': isInFocusedClue && !isEffectivelyBlocked && !validationClass,
        'bg-gradient-to-br from-purple-500/80 to-blue-500/80 border-purple-400 ring-2 ring-purple-400/50 shadow-xl': isFocused && !validationClass,
        'bg-gradient-to-br from-gray-700/40 to-gray-800/40 border-gray-600/30': readOnly && !isEffectivelyBlocked && !validationClass,
      },
      // Apply validation classes with higher priority
      validationClass
    );
  };

  return (
    <div 
      className="inline-block cosmic-card p-6 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      ref={gridRef}
    >
      <div className="grid gap-px rounded-lg overflow-hidden shadow-2xl" style={{ gridTemplateColumns: `repeat(${grid[0]?.length || 0}, minmax(0, 1fr))` }}>
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const cluesAtPosition = getClueAtPosition(rowIndex, colIndex);
            const isEffectivelyBlocked = cell.isBlocked || cluesAtPosition.length === 0;
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={getCellClasses(rowIndex, colIndex)}
                onClick={() => handleCellClick(rowIndex, colIndex)}
              >
                {cell.number && !isEffectivelyBlocked && (
                  <span className="absolute top-0 left-0 text-xs text-purple-300 leading-none p-0.5 font-semibold">
                    {cell.number}
                  </span>
                )}
                {!isEffectivelyBlocked && (
                  <span className="mt-1 font-bold text-center">
                    {getLetterAtPosition(rowIndex, colIndex)}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {isCompleted && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="cosmic-card p-8 text-center border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 max-w-md w-full">
            <div className="text-8xl mb-6 cosmic-float">🌟</div>
            <h2 className="text-4xl md:text-5xl font-bold stellar-text mb-4">
              COSMIC VICTORY!
            </h2>
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-xl text-white mb-4">
              {progress.solveTime 
                ? `Stellar completion time: ${Math.floor(progress.solveTime / 60)}:${(progress.solveTime % 60).toString().padStart(2, '0')}!` 
                : 'Another puzzle conquered across the galaxy!'}
            </p>
            <div className="flex justify-center gap-2 text-4xl animate-bounce">
              <span>🚀</span>
              <span>⭐</span>
              <span>🌌</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};