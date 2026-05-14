'use client';

import React, { useState, useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from 'react';
import { PuzzleCell, CrosswordClue, UserProgress } from '@/types';
import { haptics } from '@/lib/haptics';
import clsx from 'clsx';

export interface CrosswordGridHandle {
  toggleDirection: () => void;
  navigateClue: (dir: 'prev' | 'next') => void;
}

interface CrosswordGridProps {
  grid: PuzzleCell[][];
  clues: CrosswordClue[];
  progress: UserProgress;
  onCellFocus: (clue: CrosswordClue) => void;
  onGridDataChange?: (gridData: GridCellData[][]) => void;
  // Called whenever the user edits a cell. Receives the (row, col) of the
  // cell so the parent can invalidate just the words that touch it.
  onCellEdit?: (row: number, col: number) => void;
  // Per-cell word status. 'correct' (green) iff the cell is on a completed
  // word; 'incorrect' (red) iff some word the cell is on is fully filled
  // but wrong; 'revealed' (amber) iff a per-clue hint exposed this cell.
  cellWordStatus?: { [cellKey: string]: 'correct' | 'incorrect' | 'revealed' };
  isCompleted?: boolean;
  readOnly?: boolean;
  initialGridData?: GridCellData[][]; // Pre-populated grid data for solved puzzles
  // Action handlers
  onCheckAnswers?: () => void;
  onAutoSolve?: () => void;
  canCheckAnswers?: boolean;
  autoSolving?: boolean;
  // 'inline' renders the action buttons under the grid (desktop default);
  // 'none' suppresses them — pair with a separate <MobileActionBar /> in the
  // parent so phones get a sticky bottom toolbar instead.
  actionMode?: 'inline' | 'none';
}

interface FocusedCell {
  row: number;
  col: number;
  clue: CrosswordClue;
  direction: 'across' | 'down';
}

export interface GridCellData {
  letter: string;
}

export const CrosswordGrid = forwardRef<CrosswordGridHandle, CrosswordGridProps>(function CrosswordGrid({
  grid,
  clues,
  progress,
  onCellFocus,
  onGridDataChange,
  onCellEdit,
  cellWordStatus,
  isCompleted,
  readOnly = false,
  initialGridData,
  onCheckAnswers,
  onAutoSolve,
  canCheckAnswers = false,
  autoSolving = false,
  actionMode = 'inline',
}, ref) {
  const [focusedCell, setFocusedCell] = useState<FocusedCell | null>(null);
  const [gridData, setGridData] = useState<GridCellData[][]>([]);
  const [showVictoryMessage, setShowVictoryMessage] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const victoryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize grid data - use initialGridData if provided, otherwise create empty grid
  useEffect(() => {
    if (grid.length > 0 && grid[0].length > 0) {
      if (initialGridData && initialGridData.length > 0) {
        // Normalize incoming grid: previous releases stored acrossLetter /
        // downLetter / lastActiveDirection per cell. Drop them — single
        // `letter` is the source of truth now. Persisted data still loads.
        const normalized: GridCellData[][] = initialGridData.map((row) =>
          row.map((cell) => ({ letter: cell?.letter ?? '' })),
        );
        setGridData(normalized);
      } else if (gridData.length === 0) {
        const newGridData: GridCellData[][] = grid.map((row) =>
          row.map(() => ({ letter: '' })),
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

  // Keep the hidden input focused whenever a cell is active. If something
  // upstream (modal, dropdown) steals focus, this restores typing the moment
  // the user returns. preventScroll so iOS doesn't jerk the page on refocus.
  useEffect(() => {
    if (!focusedCell || readOnly) return;
    const input = hiddenInputRef.current;
    if (input && document.activeElement !== input) {
      input.focus({ preventScroll: true });
    }
  }, [focusedCell, readOnly]);

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

  // A cell is locked iff (a) it belongs to any completed-correct clue, or
  // (b) it was revealed via the per-clue letter hint. Locked cells can't be
  // edited and the cursor skips over them on click / arrow / type-advance.
  const completedSet = useMemo(
    () => new Set(progress.completedClues),
    [progress.completedClues],
  );
  const revealedSet = useMemo(
    () => new Set(Object.keys(progress.revealedCells ?? {})),
    [progress.revealedCells],
  );
  const isCellLocked = (row: number, col: number): boolean => {
    if (grid[row]?.[col]?.isBlocked) return false;
    if (revealedSet.has(`${row},${col}`)) return true;
    const cluesHere = getClueAtPosition(row, col);
    if (cluesHere.length === 0) return false;
    return cluesHere.some((c) => completedSet.has(c.number));
  };

  // Walk along a clue starting from (startRow, startCol) — but NOT including
  // it — looking for the first non-locked cell. Direction-aware. Returns null
  // if every other cell of that clue is locked.
  const findNextEditableInClue = (
    clue: CrosswordClue,
    startRow: number,
    startCol: number,
  ): { row: number; col: number } | null => {
    for (let i = 0; i < clue.length; i++) {
      const row = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
      const col = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
      if (row === startRow && col === startCol) continue;
      if (!isCellLocked(row, col)) return { row, col };
    }
    return null;
  };

  const handleCellClick = (row: number, col: number) => {
    if (readOnly || grid[row][col].isBlocked) return;

    const cluesAtPosition = getClueAtPosition(row, col);
    if (cluesAtPosition.length === 0) return;

    // Pick the active direction (cycle on same-cell re-tap; otherwise prefer
    // the current direction).
    let selectedClue = cluesAtPosition[0];
    if (focusedCell && focusedCell.row === row && focusedCell.col === col && cluesAtPosition.length > 1) {
      const currentIndex = cluesAtPosition.findIndex(c =>
        c.number === focusedCell.clue.number && c.direction === focusedCell.direction
      );
      selectedClue = cluesAtPosition[(currentIndex + 1) % cluesAtPosition.length];
    } else if (focusedCell && cluesAtPosition.length > 1) {
      const sameDirection = cluesAtPosition.find(c => c.direction === focusedCell.direction);
      if (sameDirection) selectedClue = sameDirection;
    }

    // If the clicked cell is locked, redirect focus to the next editable
    // cell in that clue's direction. Visual signal stays on the clue
    // (CurrentClueBanner) so the user still sees what they clicked.
    let targetRow = row;
    let targetCol = col;
    if (isCellLocked(row, col)) {
      const next = findNextEditableInClue(selectedClue, row, col);
      if (next) {
        targetRow = next.row;
        targetCol = next.col;
      } else {
        // Every other cell in this direction is locked too. Try the opposite
        // direction at the same cell; if that's locked or unavailable, just
        // focus the clue without landing on an editable cell.
        const opposite = cluesAtPosition.find((c) => c.direction !== selectedClue.direction);
        if (opposite) {
          const altNext = findNextEditableInClue(opposite, row, col);
          if (altNext && !isCellLocked(altNext.row, altNext.col)) {
            selectedClue = opposite;
            targetRow = altNext.row;
            targetCol = altNext.col;
          }
        }
      }
    }

    setFocusedCell({
      row: targetRow,
      col: targetCol,
      clue: selectedClue,
      direction: selectedClue.direction,
    });

    onCellFocus(selectedClue);
    haptics.tap();
    hiddenInputRef.current?.focus({ preventScroll: true });
  };

  const performLetter = (letter: string) => {
    if (!focusedCell || readOnly) return;
    const { row, col } = focusedCell;
    // Locked (completed-correct) cells are read-only.
    if (isCellLocked(row, col)) {
      moveToNextCell();
      return;
    }

    setGridData((prevGrid) => {
      const newGrid = prevGrid.map((gridRow) => gridRow.map((cell) => ({ ...cell })));
      if (row < newGrid.length && col < newGrid[0].length) {
        newGrid[row][col].letter = letter;
      }
      return newGrid;
    });

    if (onCellEdit) onCellEdit(row, col);
    moveToNextCell();
  };

  const performBackspace = () => {
    if (!focusedCell || readOnly) return;
    const { row, col } = focusedCell;
    if (isCellLocked(row, col)) {
      moveToPreviousCell();
      return;
    }

    setGridData((prevGrid) => {
      const newGrid = prevGrid.map((gridRow) => gridRow.map((cell) => ({ ...cell })));
      if (row < newGrid.length && col < newGrid[0].length) {
        newGrid[row][col].letter = '';
      }
      return newGrid;
    });

    if (onCellEdit) onCellEdit(row, col);
    moveToPreviousCell();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!focusedCell || readOnly) return;

    if (e.key.match(/^[A-Za-z]$/)) {
      e.preventDefault();
      performLetter(e.key.toUpperCase());
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      performBackspace();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' ||
               e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      handleArrowKey(e.key);
    } else if (e.key === ' ') {
      // Crossword convention: spacebar toggles between across and down.
      e.preventDefault();
      toggleDirection();
    }
  };

  // beforeinput is the authoritative event on Android Chrome IMEs, where
  // keydown often arrives with key === 'Unidentified'. Dispatch to the same
  // helpers so virtual and physical keyboards share one code path.
  const handleBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
    if (!focusedCell || readOnly) return;
    const native = e.nativeEvent as InputEvent;
    if (native.inputType === 'deleteContentBackward') {
      e.preventDefault();
      performBackspace();
      return;
    }
    const ch = native.data;
    if (ch && /^[A-Za-z]$/.test(ch)) {
      e.preventDefault();
      performLetter(ch.toUpperCase());
    }
  };

  // Safety net for compositional IMEs (e.g. swipe-typing keyboards) that
  // deliver characters as a composition rather than beforeinput data.
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    if (!focusedCell || readOnly) return;
    const ch = e.data?.slice(-1);
    if (ch && /^[A-Za-z]$/.test(ch)) {
      performLetter(ch.toUpperCase());
    }
    if (hiddenInputRef.current) hiddenInputRef.current.value = '';
  };

  const moveToNextCell = () => {
    if (!focusedCell) return;

    const { row, col, clue, direction } = focusedCell;
    let curRow = row;
    let curCol = col;
    const endRow = direction === 'across' ? clue.startRow : clue.startRow + clue.length - 1;
    const endCol = direction === 'across' ? clue.startCol + clue.length - 1 : clue.startCol;

    while (true) {
      if (direction === 'across') {
        if (curCol >= endCol) return; // already at clue end
        curCol += 1;
      } else {
        if (curRow >= endRow) return;
        curRow += 1;
      }
      if (!isCellLocked(curRow, curCol)) {
        setFocusedCell({ row: curRow, col: curCol, clue, direction });
        return;
      }
    }
  };

  const moveToPreviousCell = () => {
    if (!focusedCell) return;

    const { row, col, clue, direction } = focusedCell;
    let curRow = row;
    let curCol = col;
    const startRow = direction === 'across' ? clue.startRow : clue.startRow;
    const startCol = direction === 'across' ? clue.startCol : clue.startCol;

    while (true) {
      if (direction === 'across') {
        if (curCol <= startCol) return;
        curCol -= 1;
      } else {
        if (curRow <= startRow) return;
        curRow -= 1;
      }
      if (!isCellLocked(curRow, curCol)) {
        setFocusedCell({ row: curRow, col: curCol, clue, direction });
        return;
      }
    }
  };

  const handleArrowKey = (key: string) => {
    if (!focusedCell) return;

    const { row, col } = focusedCell;
    let dRow = 0;
    let dCol = 0;
    switch (key) {
      case 'ArrowRight': dCol = 1; break;
      case 'ArrowLeft':  dCol = -1; break;
      case 'ArrowDown':  dRow = 1; break;
      case 'ArrowUp':    dRow = -1; break;
    }

    // Walk in the chosen direction until we land on an editable, non-blocked
    // cell. Stops at grid boundary.
    let newRow = row + dRow;
    let newCol = col + dCol;
    while (
      newRow >= 0 && newRow < grid.length &&
      newCol >= 0 && newCol < grid[0].length
    ) {
      const cluesAtNewPosition = getClueAtPosition(newRow, newCol);
      if (
        cluesAtNewPosition.length > 0 &&
        !grid[newRow][newCol].isBlocked &&
        !isCellLocked(newRow, newCol)
      ) {
        const newClue =
          cluesAtNewPosition.find((c) => c.direction === focusedCell.direction) ??
          cluesAtNewPosition[0];
        setFocusedCell({
          row: newRow,
          col: newCol,
          clue: newClue,
          direction: newClue.direction,
        });
        onCellFocus(newClue);
        return;
      }
      newRow += dRow;
      newCol += dCol;
    }
  };

  // Flip the active direction at the currently focused cell, if a clue exists
  // in the opposite direction. Used by the current-clue banner's direction pill
  // and by the spacebar shortcut on physical keyboards.
  const toggleDirection = () => {
    if (!focusedCell || readOnly) return;
    const cluesAtPosition = getClueAtPosition(focusedCell.row, focusedCell.col);
    const opposite = cluesAtPosition.find((c) => c.direction !== focusedCell.direction);
    if (!opposite) return;
    setFocusedCell({
      row: focusedCell.row,
      col: focusedCell.col,
      clue: opposite,
      direction: opposite.direction,
    });
    onCellFocus(opposite);
    haptics.toggle();
  };

  // Advance to the previous/next clue in puzzle order (number then direction).
  // Lands focus on the clue's starting cell, matching crossword conventions.
  const navigateClue = (dir: 'prev' | 'next') => {
    if (clues.length === 0 || readOnly) return;
    const sorted = [...clues].sort((a, b) => {
      if (a.number !== b.number) return a.number - b.number;
      return a.direction === 'across' ? -1 : 1;
    });
    const currentIdx = focusedCell
      ? sorted.findIndex(
          (c) => c.number === focusedCell.clue.number && c.direction === focusedCell.direction,
        )
      : -1;
    const len = sorted.length;
    const nextIdx =
      currentIdx === -1
        ? 0
        : (currentIdx + (dir === 'next' ? 1 : -1) + len) % len;
    const target = sorted[nextIdx];
    setFocusedCell({
      row: target.startRow,
      col: target.startCol,
      clue: target,
      direction: target.direction,
    });
    onCellFocus(target);
  };

  useImperativeHandle(ref, () => ({ toggleDirection, navigateClue }));

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
    if (cellWordStatus && !isEffectivelyBlocked) {
      const status = cellWordStatus[`${row},${col}`];
      if (status === 'correct') {
        validationClass = '!bg-gradient-to-br !from-green-400 !to-emerald-500 !border-green-400 !text-black !shadow-lg validation-shimmer';
      } else if (status === 'incorrect') {
        validationClass = '!bg-gradient-to-br !from-red-400 !to-pink-500 !border-red-400 !text-black !shadow-lg validation-shimmer';
      } else if (status === 'revealed') {
        // Soft amber tint with a dotted border — reads as "hint used, locked"
        // without claiming the word is complete.
        validationClass = '!bg-gradient-to-br !from-amber-200 !to-yellow-300 !border-amber-500 !border-dashed !text-gray-900 !shadow-md';
      }
    }

    // The focused/active cell is yellow and gently pulses — clearly signals
    // "this is where typing will land." Green (correct) wins over yellow so
    // locked completed cells never look editable.
    const cellIsLocked = !isEffectivelyBlocked && isCellLocked(row, col);
    const activeCellClass =
      isFocused && !cellIsLocked && !readOnly
        ? '!bg-gradient-to-br !from-yellow-300 !to-amber-400 !border-amber-500 !text-gray-900 !shadow-xl ring-2 ring-amber-400/70 animate-pulse'
        : '';

    return clsx(
      'cw-cell aspect-square border flex items-center justify-center font-bold relative text-black',
      {
        'bg-gradient-to-br from-gray-900 to-black border-gray-700': isEffectivelyBlocked,
        'bg-gradient-to-br from-white via-gray-50 to-purple-50 border-purple-200 cursor-pointer backdrop-blur-sm':
          !isEffectivelyBlocked && !readOnly && !validationClass && !activeCellClass,
        'bg-gradient-to-br from-blue-500/40 to-purple-500/40 border-blue-400/50 shadow-lg':
          isInFocusedClue && !isFocused && !isEffectivelyBlocked && !validationClass,
        'bg-gradient-to-br from-white via-gray-50 to-purple-50 border-purple-200':
          readOnly && !isEffectivelyBlocked && !validationClass && !activeCellClass,
      },
      // Word-status (green/red) wins when present.
      validationClass,
      // Active cell wins over everything except a 'correct' word-status
      // (which means the cell is locked anyway and activeCellClass is empty).
      activeCellClass,
    );
  };

  // Memoize the rendered cell list. We deliberately scope the dependencies
  // to the values the rendering actually reads (grid, gridData, focusedCell,
  // cellWordStatus, readOnly, completedClues, revealedCells) so unrelated state
  // changes (e.g. the achievement modal in the parent) do not force a full
  // grid re-render on every keystroke.
  const cellList = useMemo(() => {
    if (grid.length === 0) return null;
    return grid.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        const cluesAtPosition = getClueAtPosition(rowIndex, colIndex);
        const isEffectivelyBlocked =
          cell.isBlocked || cluesAtPosition.length === 0;
        const letter = getLetterAtPosition(rowIndex, colIndex);

        const cellKey = `${rowIndex},${colIndex}`;
        const validationState = cellWordStatus?.[cellKey];

        const labelParts = [`Row ${rowIndex + 1}, column ${colIndex + 1}`];
        if (isEffectivelyBlocked) {
          labelParts.push('blocked');
        } else if (letter) {
          labelParts.push(`letter ${letter}`);
        } else {
          labelParts.push('empty');
        }
        if (validationState === 'correct') labelParts.push('correct');
        else if (validationState === 'incorrect') labelParts.push('incorrect');

        return (
          <div
            key={`${rowIndex}-${colIndex}`}
            role="gridcell"
            aria-label={labelParts.join(', ')}
            aria-disabled={isEffectivelyBlocked || readOnly ? true : undefined}
            data-row={rowIndex}
            data-col={colIndex}
            className={getCellClasses(rowIndex, colIndex)}
            onClick={() => handleCellClick(rowIndex, colIndex)}
          >
            {cell.number && !isEffectivelyBlocked && (
              <span
                className="absolute top-0 left-0 text-black leading-none p-0.5 font-semibold"
                style={{ fontSize: 'clamp(0.5rem, 1.6vw, 0.625rem)' }}
              >
                {cell.number}
              </span>
            )}
            {!isEffectivelyBlocked && (
              <span
                className="font-bold text-center leading-none"
                style={{ fontSize: 'clamp(0.7rem, 2.6vw, 1rem)' }}
              >
                {letter}
              </span>
            )}
          </div>
        );
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, gridData, focusedCell, cellWordStatus, readOnly, clues, onCellFocus, progress.completedClues, progress.revealedCells]);

  // Summary for the aria-live region — fires whenever word status changes so
  // screen readers announce the outcome of a "check answers" run.
  const validationSummary = useMemo(() => {
    if (!cellWordStatus) return '';
    const entries = Object.values(cellWordStatus);
    if (entries.length === 0) return '';
    const correct = entries.filter((v) => v === 'correct').length;
    const incorrect = entries.filter((v) => v === 'incorrect').length;
    if (incorrect === 0 && correct > 0) {
      return `All ${correct} cells are part of correctly completed words.`;
    }
    return `Validation complete: ${correct} cells in correct words, ${incorrect} cells in incorrect words.`;
  }, [cellWordStatus]);

  return (
    <div
      className="flex flex-col items-center w-full"
    >
      {/* Screen-reader-only announcement region for validation results. */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {validationSummary}
      </div>
      <div
        className="relative inline-block cosmic-card p-2 sm:p-3 md:p-4 w-full"
        style={{
          maxWidth: `calc(${grid[0]?.length || 1} * 2.5rem + 2rem)`,
        }}
        ref={gridRef}
      >
        {/* Hidden input that captures keystrokes. Lives inside the grid wrapper
            so iOS keeps it in viewport while the user types — moving it out to
            body level causes Safari to auto-blur and dismiss the keyboard. */}
        <input
          ref={hiddenInputRef}
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="next"
          aria-hidden="true"
          tabIndex={-1}
          className="cw-hidden-input"
          value=""
          onChange={() => { /* swallow */ }}
          onKeyDown={handleKeyDown}
          onBeforeInput={handleBeforeInput}
          onCompositionEnd={handleCompositionEnd}
          readOnly={readOnly}
        />
        <div
          role="grid"
          aria-rowcount={grid.length}
          aria-colcount={grid[0]?.length || 0}
          aria-label="Crossword puzzle grid"
          className="grid gap-px rounded-lg overflow-hidden shadow-2xl mx-auto"
          style={{
            gridTemplateColumns: `repeat(${grid[0]?.length || 0}, minmax(0, 1fr))`,
          }}
        >
          {cellList}
        </div>
      </div>
      
      {/* Actions or Completion Status */}
      <div className="mt-4 w-full max-w-md mx-auto">
        {!isCompleted ? (
          /* Action Buttons */
          <div className={clsx('flex gap-3', actionMode === 'none' && 'hidden')}>
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
});