'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PuzzleCell, CrosswordClue, UserProgress } from '@/types';
import clsx from 'clsx';

interface CrosswordGridProps {
  grid: PuzzleCell[][];
  clues: CrosswordClue[];
  progress: UserProgress;
  onCellFocus: (clue: CrosswordClue) => void;
  onGridDataChange?: (gridData: GridCellData[][]) => void;
  onCellEdit?: () => void; // Callback when user edits a cell
  cellValidation?: { [cellKey: string]: boolean }; // "row,col": boolean
  isCompleted?: boolean;
  readOnly?: boolean;
  initialGridData?: GridCellData[][]; // Pre-populated grid data for solved puzzles
  // Action handlers
  onCheckAnswers?: () => void;
  onAutoSolve?: () => void;
  canCheckAnswers?: boolean;
  autoSolving?: boolean;
}

interface FocusedCell {
  row: number;
  col: number;
  clue: CrosswordClue;
  direction: 'across' | 'down';
}

export interface GridCellData {
  letter: string;
  // Store letters for both directions in intersecting cells
  acrossLetter?: string;
  downLetter?: string;
  // Track which direction was last active for display purposes
  lastActiveDirection?: 'across' | 'down';
}

export const CrosswordGrid: React.FC<CrosswordGridProps> = ({
  grid,
  clues,
  progress,
  onCellFocus,
  onGridDataChange,
  onCellEdit,
  cellValidation,
  isCompleted,
  readOnly = false,
  initialGridData,
  onCheckAnswers,
  onAutoSolve,
  canCheckAnswers = false,
  autoSolving = false,
}) => {
  const [focusedCell, setFocusedCell] = useState<FocusedCell | null>(null);
  const [gridData, setGridData] = useState<GridCellData[][]>([]);
  const [showVictoryMessage, setShowVictoryMessage] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const victoryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize grid data - use initialGridData if provided, otherwise create empty grid
  useEffect(() => {
    if (grid.length > 0 && grid[0].length > 0) {
      if (initialGridData && initialGridData.length > 0) {
        // Use pre-populated grid data for solved puzzles
        setGridData(initialGridData);
      } else if (gridData.length === 0) {
        // Create empty grid for new puzzles
        const newGridData: GridCellData[][] = grid.map(row => 
          row.map(() => ({ 
            letter: '', 
            acrossLetter: undefined, 
            downLetter: undefined, 
            lastActiveDirection: undefined 
          }))
        );
        setGridData(newGridData);
      }
    }
  }, [grid, initialGridData, gridData.length]);

  // Pure grid-based approach - no need to sync with progress answers
  // Grid state is managed independently

  // Notify parent component when grid data changes
  useEffect(() => {
    if (onGridDataChange) {
      console.log('Sending grid data to parent:', gridData.length > 0 ? `${gridData.length}x${gridData[0]?.length || 0}` : 'empty');
      onGridDataChange(gridData);
    }
  }, [gridData, onGridDataChange]);

  // Handle victory message display and auto-dismiss
  useEffect(() => {
    if (isCompleted) {
      setShowVictoryMessage(true);
      
      // Clear any existing timeout
      if (victoryTimeoutRef.current) {
        clearTimeout(victoryTimeoutRef.current);
      }
      
      // Set timeout to hide the message after 5 seconds
      victoryTimeoutRef.current = setTimeout(() => {
        setShowVictoryMessage(false);
      }, 5000);
    } else {
      setShowVictoryMessage(false);
      if (victoryTimeoutRef.current) {
        clearTimeout(victoryTimeoutRef.current);
        victoryTimeoutRef.current = null;
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (victoryTimeoutRef.current) {
        clearTimeout(victoryTimeoutRef.current);
      }
    };
  }, [isCompleted]);

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
    // Pure grid-based approach - always show the actual letter in the cell
    if (row >= gridData.length || col >= gridData[0]?.length) return '';
    
    const cellData = gridData[row][col];
    return cellData.letter || '';
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

    const { row, col, direction } = focusedCell;

    if (e.key.match(/^[A-Za-z]$/)) {
      e.preventDefault();
      const letter = e.key.toUpperCase();
      
      // Update grid data directly
      setGridData(prevGrid => {
        const newGrid = prevGrid.map(gridRow => gridRow.map(cell => ({ ...cell })));
        
        // Set the letter for the specific direction
        if (row < newGrid.length && col < newGrid[0].length) {
          if (direction === 'across') {
            newGrid[row][col].acrossLetter = letter;
          } else {
            newGrid[row][col].downLetter = letter;
          }
          
          // Always display the letter (same for both directions if they match)
          newGrid[row][col].letter = letter;
          newGrid[row][col].lastActiveDirection = direction;
        }
        
        return newGrid;
      });

      // Notify parent that cell was edited (to clear validation)
      if (onCellEdit) onCellEdit();

      // Move to next cell
      moveToNextCell();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      
      // Clear the letter from grid data
      setGridData(prevGrid => {
        const newGrid = prevGrid.map(gridRow => gridRow.map(cell => ({ ...cell })));
        
        if (row < newGrid.length && col < newGrid[0].length) {
          // Clear the letter for the specific direction
          if (direction === 'across') {
            newGrid[row][col].acrossLetter = undefined;
          } else {
            newGrid[row][col].downLetter = undefined;
          }
          
          // Update display letter - show the remaining letter if any, otherwise clear
          const remainingLetter = newGrid[row][col].acrossLetter || newGrid[row][col].downLetter;
          newGrid[row][col].letter = remainingLetter || '';
          
          // Update last active direction to the remaining letter's direction if any
          if (remainingLetter) {
            newGrid[row][col].lastActiveDirection = newGrid[row][col].acrossLetter ? 'across' : 'down';
          } else {
            newGrid[row][col].lastActiveDirection = undefined;
          }
        }
        
        return newGrid;
      });

      // Notify parent that cell was edited (to clear validation)
      if (onCellEdit) onCellEdit();

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
    
    let validationClass = '';
    if (cellValidation && !isEffectivelyBlocked) {
      // PURE GRID-BASED VALIDATION - check this specific cell's validation status
      const cellKey = `${row},${col}`;
      
      if (cellValidation[cellKey] !== undefined) {
        if (cellValidation[cellKey] === true) {
          validationClass = '!bg-gradient-to-br !from-green-400 !to-emerald-500 !border-green-400 !text-black !shadow-lg validation-shimmer';
        } else if (cellValidation[cellKey] === false) {
          validationClass = '!bg-gradient-to-br !from-red-400 !to-pink-500 !border-red-400 !text-black !shadow-lg validation-shimmer';
        }
      }
    }

    return clsx(
      'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 border flex items-center justify-center text-xs font-bold relative text-black',
      {
        'bg-gradient-to-br from-gray-900 to-black border-gray-700': isEffectivelyBlocked,
        'bg-gradient-to-br from-white via-gray-50 to-purple-50 border-purple-200 cursor-pointer backdrop-blur-sm': !isEffectivelyBlocked && !readOnly && !validationClass,
        'bg-gradient-to-br from-blue-500/40 to-purple-500/40 border-blue-400/50 shadow-lg': isInFocusedClue && !isEffectivelyBlocked && !validationClass,
        'bg-gradient-to-br from-purple-500/80 to-blue-500/80 border-purple-400 ring-2 ring-purple-400/50 shadow-xl': isFocused && !validationClass,
        'bg-gradient-to-br from-white via-gray-50 to-purple-50 border-purple-200': readOnly && !isEffectivelyBlocked && !validationClass,
      },
      // Apply validation classes with higher priority
      validationClass
    );
  };

  return (
    <div 
      className="flex flex-col items-center w-full"
    >
      <div 
        className="inline-block cosmic-card p-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        ref={gridRef}
      >
        <div className="grid gap-px rounded-lg overflow-hidden shadow-2xl mx-auto" style={{ gridTemplateColumns: `repeat(${grid[0]?.length || 0}, minmax(0, 1fr))` }}>
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
                  <span className="absolute top-0 left-0 text-xs text-black leading-none p-0.5 font-semibold">
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
      </div>
      
      {/* Actions or Completion Status */}
      <div className="mt-4 w-full max-w-md mx-auto">
        {!isCompleted ? (
          /* Action Buttons */
          <div className="flex gap-3">
            <button
              onClick={onCheckAnswers}
              disabled={!canCheckAnswers}
              className={`flex-1 aurora-button text-sm py-2.5 px-4 ${!canCheckAnswers ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="flex items-center justify-center gap-2">
                <span>✨</span>
                <span>Check & Save</span>
              </span>
            </button>

            <button
              onClick={onAutoSolve}
              disabled={autoSolving}
              className="flex-1 stellar-button text-sm py-2.5 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {autoSolving ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                  <span>Revealing...</span>
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>🔍</span>
                  <span>Auto-Solve</span>
                </span>
              )}
            </button>
          </div>
        ) : (
          /* Completion Status */
          <div className={`cosmic-card p-3 text-center border-2 ${
            !progress.solveTime
              ? 'border-orange-500/50 bg-gradient-to-br from-orange-500/20 to-yellow-500/20'
              : 'border-green-500/50 bg-gradient-to-br from-green-500/20 to-blue-500/20'
          }`}>
            <div className="text-3xl mb-2">
              {!progress.solveTime ? '🔍' : '🎉'}
            </div>
            <div className="text-lg font-bold text-white mb-1">
              {!progress.solveTime ? 'Auto-Solved!' : 'Victory! 🌟'}
            </div>
            <div className="text-purple-200 text-sm">
              {!progress.solveTime ? (
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
      
      {isCompleted && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-1000 ${
          showVictoryMessage ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <div className="cosmic-card p-8 text-center border-2 border-yellow-500/50 bg-transparent backdrop-blur-sm max-w-md w-full">
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