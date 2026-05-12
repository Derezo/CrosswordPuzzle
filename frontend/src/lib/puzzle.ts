import type { DailyPuzzle, UserProgress, CrosswordClue, PuzzleCell } from '@/types';
import type { GridCellData } from '@/components/CrosswordGrid';

/**
 * Reconstruct the per-cell display grid from a puzzle's clue list and the
 * user's recorded clue answers. Used after fetching a completed puzzle that
 * has no saved `gridData` so the UI can show the solution.
 *
 * Extracted from `loadTodaysPuzzle` / `loadSpecificPuzzle` in the puzzle page,
 * which had two near-identical ~200-line copies of this logic.
 */
export function reconstructGrid(
  puzzle: DailyPuzzle,
  progress: UserProgress,
): GridCellData[][] {
  return puzzle.grid.map((row: PuzzleCell[], rowIndex: number) =>
    row.map((cell: PuzzleCell, colIndex: number): GridCellData => {
      if (cell.isBlocked) {
        return {
          letter: '',
          acrossLetter: undefined,
          downLetter: undefined,
          lastActiveDirection: undefined,
        };
      }

      // All clues that include this cell.
      const cluesAtPosition = puzzle.clues.filter((clue: CrosswordClue) => {
        if (clue.direction === 'across') {
          return (
            rowIndex === clue.startRow &&
            colIndex >= clue.startCol &&
            colIndex < clue.startCol + clue.length
          );
        }
        return (
          colIndex === clue.startCol &&
          rowIndex >= clue.startRow &&
          rowIndex < clue.startRow + clue.length
        );
      });

      let acrossLetter: string | undefined;
      let downLetter: string | undefined;
      let displayLetter = '';
      let lastActiveDirection: 'across' | 'down' | undefined;

      for (const clue of cluesAtPosition) {
        const answer = progress.answers?.[clue.number.toString()];
        if (!answer) continue;

        const positionInClue =
          clue.direction === 'across'
            ? colIndex - clue.startCol
            : rowIndex - clue.startRow;
        if (positionInClue < 0 || positionInClue >= answer.length) continue;

        const letter = answer[positionInClue].toUpperCase();
        if (clue.direction === 'across') {
          acrossLetter = letter;
        } else {
          downLetter = letter;
        }
        displayLetter = letter;
        lastActiveDirection = clue.direction;
      }

      return {
        letter: displayLetter,
        acrossLetter,
        downLetter,
        lastActiveDirection,
      };
    }),
  );
}

/**
 * Build the `cellValidation` map for a fully-completed puzzle (every
 * non-blocked cell is correct). Used as a quick fill for already-solved
 * puzzles being re-displayed.
 */
export function buildAllCorrectCellValidation(
  puzzle: DailyPuzzle,
): { [cellKey: string]: boolean } {
  const validation: { [cellKey: string]: boolean } = {};
  for (let row = 0; row < puzzle.grid.length; row++) {
    for (let col = 0; col < puzzle.grid[0].length; col++) {
      const cell = puzzle.grid[row][col];
      if (!cell.isBlocked) {
        validation[`${row},${col}`] = true;
      }
    }
  }
  return validation;
}

/**
 * Build the `cellValidation` map from a saved gridData grid: each non-blocked
 * cell that has a letter is marked correct.
 */
export function buildCellValidationFromSavedGrid(
  puzzle: DailyPuzzle,
  savedGrid: unknown[][],
): { [cellKey: string]: boolean } {
  const validation: { [cellKey: string]: boolean } = {};
  for (let row = 0; row < savedGrid.length; row++) {
    const rowLen = savedGrid[0]?.length ?? 0;
    for (let col = 0; col < rowLen; col++) {
      const cell = savedGrid[row]?.[col] as { letter?: string } | undefined;
      if (
        cell &&
        cell.letter &&
        puzzle.grid[row]?.[col] &&
        !puzzle.grid[row][col].isBlocked
      ) {
        validation[`${row},${col}`] = true;
      }
    }
  }
  return validation;
}
