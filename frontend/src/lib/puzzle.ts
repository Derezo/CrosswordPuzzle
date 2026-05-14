import type { DailyPuzzle, UserProgress, CrosswordClue, PuzzleCell } from '@/types';
import type { GridCellData } from '@/components/CrosswordGrid';

/**
 * Reconstruct the per-cell display grid from a puzzle's clue list and the
 * user's recorded clue answers. Used after fetching a completed puzzle that
 * has no saved `gridData` so the UI can show the solution.
 */
export function reconstructGrid(
  puzzle: DailyPuzzle,
  progress: UserProgress,
): GridCellData[][] {
  return puzzle.grid.map((row: PuzzleCell[], rowIndex: number) =>
    row.map((cell: PuzzleCell, colIndex: number): GridCellData => {
      if (cell.isBlocked) {
        return { letter: '' };
      }

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

      let displayLetter = '';
      for (const clue of cluesAtPosition) {
        const answer = progress.answers?.[clue.number.toString()];
        if (!answer) continue;
        const positionInClue =
          clue.direction === 'across'
            ? colIndex - clue.startCol
            : rowIndex - clue.startRow;
        if (positionInClue < 0 || positionInClue >= answer.length) continue;
        displayLetter = answer[positionInClue].toUpperCase();
      }

      return { letter: displayLetter };
    }),
  );
}

export type CellWordStatus = 'correct' | 'incorrect' | 'revealed';

/**
 * Build the per-cell word status map. A cell is `correct` iff ANY clue it
 * belongs to is in `completedClues`. Otherwise, `incorrect` iff some clue it
 * belongs to is in `validatedClues` with value `false` AND every cell in that
 * clue is currently filled in the user's grid. "Correct wins" — if a cell is
 * on a completed correct word, it stays green even if a crossing word is wrong.
 */
export function buildCellWordStatus(
  puzzle: DailyPuzzle,
  gridLetters: { letter: string }[][] | null | undefined,
  completedClues: number[],
  validatedClues: { [clueNumber: number]: boolean } | undefined,
  revealedCells?: { [cellKey: string]: number },
): { [cellKey: string]: CellWordStatus } {
  const status: { [cellKey: string]: CellWordStatus } = {};
  const completedSet = new Set(completedClues);
  const validated = validatedClues ?? {};
  const revealed = revealedCells ?? {};

  // Pass 1: every cell on a completed-correct word goes green.
  for (const clue of puzzle.clues) {
    if (!completedSet.has(clue.number)) continue;
    for (let i = 0; i < clue.length; i++) {
      const row = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
      const col = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
      status[`${row},${col}`] = 'correct';
    }
  }

  // Pass 2: cells on fully-filled incorrect words go red, but green wins.
  for (const clue of puzzle.clues) {
    if (validated[clue.number] !== false) continue;

    let fullyFilled = true;
    if (gridLetters) {
      for (let i = 0; i < clue.length; i++) {
        const row = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
        const col = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
        const letter = gridLetters[row]?.[col]?.letter ?? '';
        if (!letter) {
          fullyFilled = false;
          break;
        }
      }
    }
    if (!fullyFilled) continue;

    for (let i = 0; i < clue.length; i++) {
      const row = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
      const col = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
      const key = `${row},${col}`;
      if (status[key] !== 'correct') status[key] = 'incorrect';
    }
  }

  // Pass 3: individual revealed cells get their own 'revealed' style — only
  // if they didn't already win a 'correct' from being on a completed word.
  for (const key of Object.keys(revealed)) {
    if (status[key] !== 'correct') status[key] = 'revealed';
  }

  return status;
}

/**
 * Return every clue (across + down) that includes the given cell.
 */
export function cluesAtCell(
  puzzle: DailyPuzzle,
  row: number,
  col: number,
): CrosswordClue[] {
  return puzzle.clues.filter((clue) => {
    if (clue.direction === 'across') {
      return (
        row === clue.startRow &&
        col >= clue.startCol &&
        col < clue.startCol + clue.length
      );
    }
    return (
      col === clue.startCol &&
      row >= clue.startRow &&
      row < clue.startRow + clue.length
    );
  });
}
