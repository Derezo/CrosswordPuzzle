import { describe, it, expect } from 'vitest';
import { validateGrid, createSolutionGrid } from './gridValidator';

// 3x3 mini-puzzle used across tests.
//   C A T
//   A R E
//   T E D
// Black squares: none. Across clues: 1 (CAT), 4 (ARE), 6 (TED).
// Down clues: 1 (CAT), 2 (ARE), 3 (TED).
const cluesData = [
  { number: 1, direction: 'across' as const, startRow: 0, startCol: 0, length: 3, answer: 'CAT', clue: 'feline' },
  { number: 4, direction: 'across' as const, startRow: 1, startCol: 0, length: 3, answer: 'ARE', clue: 'verb' },
  { number: 6, direction: 'across' as const, startRow: 2, startCol: 0, length: 3, answer: 'TED', clue: 'name' },
  { number: 1, direction: 'down' as const, startRow: 0, startCol: 0, length: 3, answer: 'CAT', clue: 'feline' },
  { number: 2, direction: 'down' as const, startRow: 0, startCol: 1, length: 3, answer: 'ARE', clue: 'verb' },
  { number: 3, direction: 'down' as const, startRow: 0, startCol: 2, length: 3, answer: 'TED', clue: 'name' },
];

const solutionGrid = [
  [{ letter: 'C', isBlocked: false }, { letter: 'A', isBlocked: false }, { letter: 'T', isBlocked: false }],
  [{ letter: 'A', isBlocked: false }, { letter: 'R', isBlocked: false }, { letter: 'E', isBlocked: false }],
  [{ letter: 'T', isBlocked: false }, { letter: 'E', isBlocked: false }, { letter: 'D', isBlocked: false }],
];

const emptyCell = { letter: '' };
const cell = (l: string) => ({ letter: l });

describe('validateGrid', () => {
  it('marks every cell correct when the user grid matches the solution', () => {
    const userGrid = [
      [cell('C'), cell('A'), cell('T')],
      [cell('A'), cell('R'), cell('E')],
      [cell('T'), cell('E'), cell('D')],
    ];

    const result = validateGrid(userGrid, solutionGrid, cluesData, []);
    expect(result.cellValidation['0,0']).toBe(true);
    expect(result.cellValidation['2,2']).toBe(true);
    // All clues complete.
    expect(Object.values(result.clueResults).every(Boolean)).toBe(true);
    // Distinct clue numbers reported, no duplicates (across-1 + down-1 share
    // the number 1 but only appear once).
    expect(result.newCompletedClues.sort()).toEqual([1, 2, 3, 4, 6]);
  });

  it('reports a wrong cell as incorrect and the containing clues as incomplete', () => {
    const userGrid = [
      [cell('X'), cell('A'), cell('T')], // 0,0 wrong → both across-1 and down-1 fail
      [cell('A'), cell('R'), cell('E')],
      [cell('T'), cell('E'), cell('D')],
    ];

    const result = validateGrid(userGrid, solutionGrid, cluesData, []);
    expect(result.cellValidation['0,0']).toBe(false);
    expect(result.cellValidation['0,1']).toBe(true);
    expect(result.clueResults[1]).toBe(false); // across-1 CAT fails
    // The down-1 clue also has number 1, but clueResults is keyed by number, so
    // the same key is shared. We just verify that with a wrong corner cell,
    // results contain a false for clue 1.
    expect(result.clueResults[1]).toBe(false);
  });

  it('case-insensitive letter comparison', () => {
    const userGrid = [
      [cell('c'), cell('a'), cell('t')],
      [cell('A'), cell('R'), cell('E')],
      [cell('T'), cell('E'), cell('D')],
    ];

    const result = validateGrid(userGrid, solutionGrid, cluesData, []);
    expect(result.cellValidation['0,0']).toBe(true);
    expect(result.cellValidation['0,2']).toBe(true);
  });

  it('treats blank cells as incorrect (no progress)', () => {
    const userGrid = [
      [emptyCell, emptyCell, emptyCell],
      [emptyCell, emptyCell, emptyCell],
      [emptyCell, emptyCell, emptyCell],
    ];

    const result = validateGrid(userGrid, solutionGrid, cluesData, []);
    // No cells validated.
    expect(Object.keys(result.cellValidation)).toHaveLength(0);
    // No clues complete.
    expect(Object.values(result.clueResults).every((v) => v === false)).toBe(true);
    expect(result.newCompletedClues).toEqual([]);
  });

  it('does not re-report already-completed clues as new', () => {
    const userGrid = [
      [cell('C'), cell('A'), cell('T')],
      [cell('A'), cell('R'), cell('E')],
      [cell('T'), cell('E'), cell('D')],
    ];

    const result = validateGrid(userGrid, solutionGrid, cluesData, [1, 4, 6]);
    // Already-completed clue numbers 1, 4, 6 are excluded; only down clues 2, 3 remain
    // (down clue 1 shares its number with across clue 1 so it is also excluded).
    expect(result.newCompletedClues.sort()).toEqual([2, 3]);
  });
});

describe('createSolutionGrid', () => {
  it('builds a grid with letters from the solution', () => {
    const result = createSolutionGrid(solutionGrid, cluesData);
    expect(result[0][0].letter).toBe('C');
    expect(result[2][2].letter).toBe('D');
  });

  it('blocks blocked cells with an empty letter', () => {
    const blockedSolution = [
      [{ letter: 'C', isBlocked: false }, { letter: '', isBlocked: true }, { letter: 'T', isBlocked: false }],
      [{ letter: 'A', isBlocked: false }, { letter: 'R', isBlocked: false }, { letter: 'E', isBlocked: false }],
      [{ letter: 'T', isBlocked: false }, { letter: 'E', isBlocked: false }, { letter: 'D', isBlocked: false }],
    ];
    const result = createSolutionGrid(blockedSolution, []);
    expect(result[0][1].letter).toBe('');
  });

  it('sets direction-specific across/down letters', () => {
    const result = createSolutionGrid(solutionGrid, cluesData);
    // 0,0 is the start of both across-1 (CAT) and down-1 (CAT). Both letters are C.
    expect(result[0][0].acrossLetter).toBe('C');
    expect(result[0][0].downLetter).toBe('C');
  });
});
