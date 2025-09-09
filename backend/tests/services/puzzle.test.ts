import { generateStrictPuzzle } from '../../src/services/puzzle/strictCrosswordGenerator';
import { validateGridStructure } from '../../src/services/puzzle/gridValidator';

describe('Puzzle Generation Service', () => {
  describe('generateStrictPuzzle', () => {
    it('should generate a valid puzzle for a given date', () => {
      const date = '2024-01-01';
      const puzzle = generateStrictPuzzle(date);
      
      expect(puzzle).toBeDefined();
      expect(puzzle.grid).toBeDefined();
      expect(puzzle.clues).toBeDefined();
      expect(puzzle.size).toBeDefined();
      expect(puzzle.size.rows).toBeGreaterThan(0);
      expect(puzzle.size.cols).toBeGreaterThan(0);
    });

    it('should generate the same puzzle for the same date', () => {
      const date = '2024-01-01';
      const puzzle1 = generateStrictPuzzle(date);
      const puzzle2 = generateStrictPuzzle(date);
      
      expect(JSON.stringify(puzzle1)).toBe(JSON.stringify(puzzle2));
    });

    it('should generate different puzzles for different dates', () => {
      const puzzle1 = generateStrictPuzzle('2024-01-01');
      const puzzle2 = generateStrictPuzzle('2024-01-02');
      
      expect(JSON.stringify(puzzle1)).not.toBe(JSON.stringify(puzzle2));
    });

    it('should generate a puzzle with valid grid structure', () => {
      const date = '2024-01-01';
      const puzzle = generateStrictPuzzle(date);
      
      const isValid = validateGridStructure(puzzle.grid);
      expect(isValid).toBe(true);
    });

    it('should generate clues for all words in the grid', () => {
      const date = '2024-01-01';
      const puzzle = generateStrictPuzzle(date);
      
      expect(puzzle.clues).toBeDefined();
      expect(Array.isArray(puzzle.clues)).toBe(true);
      expect(puzzle.clues.length).toBeGreaterThan(0);
      
      // Check that each clue has required properties
      puzzle.clues.forEach(clue => {
        expect(clue).toHaveProperty('number');
        expect(clue).toHaveProperty('direction');
        expect(clue).toHaveProperty('clue');
        expect(clue).toHaveProperty('answer');
        expect(clue).toHaveProperty('startRow');
        expect(clue).toHaveProperty('startCol');
        expect(clue).toHaveProperty('length');
      });
    });

    it('should handle edge cases gracefully', () => {
      // Test with empty date
      expect(() => generateStrictPuzzle('')).not.toThrow();
      
      // Test with invalid date format
      expect(() => generateStrictPuzzle('invalid-date')).not.toThrow();
      
      // Test with very old date
      expect(() => generateStrictPuzzle('1900-01-01')).not.toThrow();
      
      // Test with future date
      expect(() => generateStrictPuzzle('2050-12-31')).not.toThrow();
    });
  });

  describe('Grid Validation', () => {
    it('should validate a proper crossword grid', () => {
      const validGrid = [
        ['C', 'A', 'T', '#', '#'],
        ['O', '#', 'E', '#', '#'],
        ['D', '#', 'S', 'U', 'N'],
        ['E', '#', 'T', '#', '#'],
        ['#', '#', '#', '#', '#']
      ];
      
      const isValid = validateGridStructure(validGrid);
      expect(isValid).toBe(true);
    });

    it('should reject invalid grid structures', () => {
      // Empty grid
      expect(validateGridStructure([])).toBe(false);
      
      // Grid with inconsistent row lengths
      const invalidGrid = [
        ['A', 'B'],
        ['C', 'D', 'E']
      ];
      expect(validateGridStructure(invalidGrid)).toBe(false);
    });

    it('should handle grids with only black squares', () => {
      const blackGrid = [
        ['#', '#', '#'],
        ['#', '#', '#'],
        ['#', '#', '#']
      ];
      
      // Should be structurally valid but logically invalid for crossword
      const isValid = validateGridStructure(blackGrid);
      expect(isValid).toBe(true); // Structure is valid even if not useful
    });
  });

  describe('Performance Tests', () => {
    it('should generate puzzle within reasonable time', () => {
      const startTime = Date.now();
      const puzzle = generateStrictPuzzle('2024-01-01');
      const endTime = Date.now();
      
      expect(puzzle).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple concurrent generations', async () => {
      const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'];
      
      const promises = dates.map(date => 
        new Promise((resolve) => {
          const puzzle = generateStrictPuzzle(date);
          resolve(puzzle);
        })
      );
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });
});