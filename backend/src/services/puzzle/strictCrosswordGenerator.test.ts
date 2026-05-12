import { describe, it, expect } from 'vitest';
import { generateNytStyle, GRID_SIZE } from './nytStyleGenerator';
import { StrictCrosswordGenerator } from './strictCrosswordGenerator';

// A single generated 15x15 puzzle is shared across structural-invariant tests
// so we don't pay the ~1.5s generation cost for every assertion.
const sharedPuzzle = generateNytStyle({
  seed: 'vitest-fixture-2026',
  maxTemplateAttempts: 10,
});

describe('NYT-style generator — structural invariants', () => {
  it('produces a 15x15 grid', () => {
    expect(sharedPuzzle.size.rows).toBe(GRID_SIZE);
    expect(sharedPuzzle.size.cols).toBe(GRID_SIZE);
    expect(sharedPuzzle.grid).toHaveLength(GRID_SIZE);
    sharedPuzzle.grid.forEach((row) => expect(row).toHaveLength(GRID_SIZE));
  });

  it('has rotational (180°) symmetry of black squares', () => {
    const size = GRID_SIZE;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const here = sharedPuzzle.grid[r][c].isBlocked;
        const opposite = sharedPuzzle.grid[size - 1 - r][size - 1 - c].isBlocked;
        expect(opposite, `mirror mismatch at (${r},${c})`).toBe(here);
      }
    }
  });

  it('has no across run shorter than 3 cells', () => {
    const size = GRID_SIZE;
    for (let r = 0; r < size; r++) {
      let run = 0;
      for (let c = 0; c <= size; c++) {
        const blocked = c === size || sharedPuzzle.grid[r][c].isBlocked;
        if (blocked) {
          if (run > 0) expect(run).toBeGreaterThanOrEqual(3);
          run = 0;
        } else {
          run++;
        }
      }
    }
  });

  it('has no down run shorter than 3 cells', () => {
    const size = GRID_SIZE;
    for (let c = 0; c < size; c++) {
      let run = 0;
      for (let r = 0; r <= size; r++) {
        const blocked = r === size || sharedPuzzle.grid[r][c].isBlocked;
        if (blocked) {
          if (run > 0) expect(run).toBeGreaterThanOrEqual(3);
          run = 0;
        } else {
          run++;
        }
      }
    }
  });

  it('every white cell has a non-empty uppercase letter', () => {
    for (const row of sharedPuzzle.grid) {
      for (const cell of row) {
        if (cell.isBlocked) {
          expect(cell.letter).toBe('');
        } else {
          expect(cell.letter).toMatch(/^[A-Z]$/);
        }
      }
    }
  });

  it('clue answers match the letters along their cells in the grid', () => {
    for (const clue of sharedPuzzle.clues) {
      let reconstructed = '';
      for (let i = 0; i < clue.length; i++) {
        const r = clue.direction === 'across' ? clue.startRow : clue.startRow + i;
        const c = clue.direction === 'across' ? clue.startCol + i : clue.startCol;
        reconstructed += sharedPuzzle.grid[r][c].letter;
      }
      expect(reconstructed).toBe(clue.answer);
    }
  });

  it('every clue answer is at least 3 letters long', () => {
    for (const clue of sharedPuzzle.clues) {
      expect(clue.answer.length).toBeGreaterThanOrEqual(3);
      expect(clue.length).toBe(clue.answer.length);
    }
  });

  it('numbers each clue start cell with a unique sequential number', () => {
    const numberedCells = new Map<number, { row: number; col: number }>();
    for (const clue of sharedPuzzle.clues) {
      const existing = numberedCells.get(clue.number);
      if (existing) {
        // Across and down clues can share a number — they must start at the same cell.
        expect(existing.row).toBe(clue.startRow);
        expect(existing.col).toBe(clue.startCol);
      } else {
        numberedCells.set(clue.number, { row: clue.startRow, col: clue.startCol });
      }
    }
  });
});

describe('NYT-style generator — determinism', () => {
  it('produces the same grid for the same seed', () => {
    const a = generateNytStyle({ seed: 'vitest-fixture-2026', maxTemplateAttempts: 10 });
    // Compare against the shared puzzle (same seed) — avoids a second slow run.
    expect(a.grid).toEqual(sharedPuzzle.grid);
    expect(a.clues).toEqual(sharedPuzzle.clues);
  }, 120_000);
});

describe('StrictCrosswordGenerator class', () => {
  it('delegates to nyt-style generator and returns a valid puzzle', () => {
    const gen = new StrictCrosswordGenerator('vitest-fixture-2026');
    const puzzle = gen.generate();
    expect(puzzle.size.rows).toBe(15);
    expect(puzzle.clues.length).toBeGreaterThan(40);
  }, 120_000);
});
