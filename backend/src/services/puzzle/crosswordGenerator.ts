import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { parse } from 'csv-parse/sync';

// Interfaces
export interface PuzzleCell {
  letter: string;
  number: number | null;
  isBlocked: boolean;
}

export interface CrosswordClue {
  number: number;
  clue: string;
  answer: string;
  direction: 'across' | 'down';
  startRow: number;
  startCol: number;
  length: number;
}

export interface GeneratedPuzzle {
  grid: PuzzleCell[][];
  clues: CrosswordClue[];
  size: { rows: number; cols: number };
}

interface DictionaryEntry {
  word: string;
  clue: string;
  is_technical_word: boolean;
  is_common_english: boolean;
  is_plural: boolean;
}

interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  number?: number;
}

// Constants
const GRID_SIZE = 15; // Standard crossword size
const MIN_WORD_LENGTH = 3;
const MAX_BLACK_SQUARES_RATIO = 0.20; // Max 20% black squares
const MAX_ATTEMPTS = 100;

export class CrosswordGenerator {
  private dictionary: DictionaryEntry[] = [];
  private wordsByLength: Map<number, DictionaryEntry[]> = new Map();
  private grid: PuzzleCell[][] = [];
  private placedWords: PlacedWord[] = [];
  private rng: () => number;
  private blackSquares: Set<string> = new Set();
  
  constructor(seed: string) {
    // Initialize seeded random number generator
    const hash = crypto.createHash('sha256').update(seed).digest();
    let seedInt = hash.readUInt32BE(0);
    this.rng = () => {
      seedInt = (seedInt * 1103515245 + 12345) & 0x7fffffff;
      return seedInt / 0x7fffffff;
    };
    
    this.loadDictionary();
    this.initializeGrid();
  }
  
  private loadDictionary(): void {
    const csvPath = path.join(__dirname, '../../../src/data/crossword_dictionary_with_clues.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      skip_records_with_error: true
    });
    
    this.dictionary = records
      .filter((record: any) => {
        const word = record.word?.toUpperCase();
        return word && 
               word.length >= MIN_WORD_LENGTH && 
               word.length <= GRID_SIZE &&
               /^[A-Z]+$/.test(word) && // Only letters
               record.clue; // Must have a clue
      })
      .map((record: any) => ({
        word: record.word.toUpperCase(),
        clue: record.clue,
        is_technical_word: record.is_technical_word === 'True',
        is_common_english: record.is_common_english === 'True', 
        is_plural: record.is_plural === 'True'
      }));
    
    // Prioritize common words and remove duplicates
    const wordMap = new Map<string, DictionaryEntry>();
    for (const entry of this.dictionary) {
      const existing = wordMap.get(entry.word);
      if (!existing || (entry.is_common_english && !existing.is_common_english)) {
        wordMap.set(entry.word, entry);
      }
    }
    this.dictionary = Array.from(wordMap.values());
    
    // Build length index
    for (const entry of this.dictionary) {
      const len = entry.word.length;
      if (!this.wordsByLength.has(len)) {
        this.wordsByLength.set(len, []);
      }
      this.wordsByLength.get(len)!.push(entry);
    }
    
    console.log(`📚 Loaded ${this.dictionary.length} unique words with clues`);
  }
  
  private initializeGrid(): void {
    this.grid = Array(GRID_SIZE).fill(null).map(() =>
      Array(GRID_SIZE).fill(null).map(() => ({
        letter: '',
        number: null,
        isBlocked: false
      }))
    );
  }
  
  /**
   * Generate symmetric black square pattern
   * Uses 180-degree rotational symmetry
   */
  private generateBlackSquarePattern(): void {
    this.blackSquares.clear();
    const maxBlackSquares = Math.floor(GRID_SIZE * GRID_SIZE * MAX_BLACK_SQUARES_RATIO);
    let blackCount = 0;
    
    // Start with a simpler, more open pattern for better word placement
    const patterns = [
      // Corner patterns (smaller to leave more space)
      [[0,3]], [[0,4]],
      [[3,0]], [[4,0]],
      // Some strategic interior patterns
      [[6,6]], [[7,7]]
    ];
    
    // Add patterns with symmetry
    for (const pattern of patterns) {
      if (blackCount + pattern.length * 2 <= maxBlackSquares) {
        for (const [r, c] of pattern) {
          if (this.rng() > 0.5) { // 50% chance to add pattern
            this.addSymmetricBlackSquare(r, c);
            blackCount += 2;
          }
        }
      }
    }
    
    // Add fewer random symmetric black squares for more open grid
    while (blackCount < maxBlackSquares * 0.3) { // Use only 30% of allowed black squares initially
      const r = Math.floor(this.rng() * Math.floor(GRID_SIZE / 2));
      const c = Math.floor(this.rng() * GRID_SIZE);
      
      // Avoid clustering black squares
      let hasNeighbor = false;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
            if (this.blackSquares.has(`${nr},${nc}`)) {
              hasNeighbor = true;
              break;
            }
          }
        }
      }
      
      if (!hasNeighbor && !this.blackSquares.has(`${r},${c}`)) {
        this.addSymmetricBlackSquare(r, c);
        blackCount += 2;
      }
    }
    
    // Apply black squares to grid
    for (const key of this.blackSquares) {
      const [r, c] = key.split(',').map(Number);
      this.grid[r][c].isBlocked = true;
    }
  }
  
  private addSymmetricBlackSquare(row: number, col: number): void {
    // Add the square and its 180-degree rotation
    this.blackSquares.add(`${row},${col}`);
    const symRow = GRID_SIZE - 1 - row;
    const symCol = GRID_SIZE - 1 - col;
    this.blackSquares.add(`${symRow},${symCol}`);
  }
  
  /**
   * Find all valid slots for words (continuous white squares)
   */
  private findWordSlots(): Array<{row: number, col: number, length: number, direction: 'across' | 'down'}> {
    const slots: Array<{row: number, col: number, length: number, direction: 'across' | 'down'}> = [];
    
    // Find horizontal slots
    for (let r = 0; r < GRID_SIZE; r++) {
      let startCol = -1;
      for (let c = 0; c <= GRID_SIZE; c++) {
        const isBlocked = c === GRID_SIZE || this.grid[r][c].isBlocked;
        
        if (isBlocked) {
          if (startCol >= 0 && c - startCol >= MIN_WORD_LENGTH) {
            slots.push({
              row: r,
              col: startCol,
              length: c - startCol,
              direction: 'across'
            });
          }
          startCol = -1;
        } else if (startCol < 0) {
          startCol = c;
        }
      }
    }
    
    // Find vertical slots
    for (let c = 0; c < GRID_SIZE; c++) {
      let startRow = -1;
      for (let r = 0; r <= GRID_SIZE; r++) {
        const isBlocked = r === GRID_SIZE || this.grid[r][c].isBlocked;
        
        if (isBlocked) {
          if (startRow >= 0 && r - startRow >= MIN_WORD_LENGTH) {
            slots.push({
              row: startRow,
              col: c,
              length: r - startRow,
              direction: 'down'
            });
          }
          startRow = -1;
        } else if (startRow < 0) {
          startRow = r;
        }
      }
    }
    
    // Mix across and down words for better interleaving
    // Sort by length but alternate directions
    slots.sort((a, b) => {
      // First sort by length
      const lengthDiff = b.length - a.length;
      if (lengthDiff !== 0) return lengthDiff;
      
      // For same length, alternate directions
      if (a.direction !== b.direction) {
        return a.direction === 'across' ? -1 : 1;
      }
      
      return 0;
    });
    
    // Interleave across and down words
    const acrossSlots = slots.filter(s => s.direction === 'across');
    const downSlots = slots.filter(s => s.direction === 'down');
    const interleavedSlots: typeof slots = [];
    
    let i = 0, j = 0;
    while (i < acrossSlots.length || j < downSlots.length) {
      if (i < acrossSlots.length) interleavedSlots.push(acrossSlots[i++]);
      if (j < downSlots.length) interleavedSlots.push(downSlots[j++]);
    }
    
    return interleavedSlots;
  }
  
  /**
   * Check if a word can be placed at a position
   */
  private canPlaceWord(word: string, row: number, col: number, direction: 'across' | 'down'): boolean {
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      
      if (r >= GRID_SIZE || c >= GRID_SIZE) return false;
      if (this.grid[r][c].isBlocked) return false;
      
      // Check if there's a letter and it matches
      if (this.grid[r][c].letter && this.grid[r][c].letter !== word[i]) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Place a word on the grid
   */
  private placeWord(entry: DictionaryEntry, row: number, col: number, direction: 'across' | 'down'): void {
    const word = entry.word;
    
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      this.grid[r][c].letter = word[i];
    }
    
    this.placedWords.push({
      word: word,
      clue: entry.clue,
      row,
      col,
      direction
    });
  }
  
  /**
   * Get constraint pattern for a slot (existing letters)
   */
  private getSlotPattern(row: number, col: number, length: number, direction: 'across' | 'down'): string {
    let pattern = '';
    for (let i = 0; i < length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      pattern += this.grid[r][c].letter || '_';
    }
    return pattern;
  }
  
  /**
   * Find words matching a pattern (e.g., "_A_E")
   */
  private findMatchingWords(pattern: string): DictionaryEntry[] {
    const length = pattern.length;
    const candidates = this.wordsByLength.get(length) || [];
    
    return candidates.filter(entry => {
      const word = entry.word;
      for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] !== '_' && pattern[i] !== word[i]) {
          return false;
        }
      }
      return true;
    });
  }
  
  /**
   * Fill the grid with words
   */
  private fillGrid(): boolean {
    const slots = this.findWordSlots();
    const usedWords = new Set<string>();
    
    // Separate slots by whether they have constraints
    const constrainedSlots: typeof slots = [];
    const unconstrainedSlots: typeof slots = [];
    
    for (const slot of slots) {
      const pattern = this.getSlotPattern(slot.row, slot.col, slot.length, slot.direction);
      if (pattern.includes('_') && pattern.replace(/_/g, '').length > 0) {
        constrainedSlots.push(slot);
      } else {
        unconstrainedSlots.push(slot);
      }
    }
    
    // Fill unconstrained slots first (easier)
    for (const slot of unconstrainedSlots) {
      let candidates = this.wordsByLength.get(slot.length) || [];
      
      // Filter out already used words
      candidates = candidates.filter(e => !usedWords.has(e.word));
      
      // Prioritize common words
      candidates.sort((a, b) => {
        if (a.is_common_english !== b.is_common_english) {
          return a.is_common_english ? -1 : 1;
        }
        return this.rng() - 0.5; // Random shuffle
      });
      
      // Try to place a word
      for (const candidate of candidates.slice(0, 10)) { // Try top 10 candidates
        if (this.canPlaceWord(candidate.word, slot.row, slot.col, slot.direction)) {
          this.placeWord(candidate, slot.row, slot.col, slot.direction);
          usedWords.add(candidate.word);
          break;
        }
      }
    }
    
    // Now fill constrained slots
    for (const slot of constrainedSlots) {
      const pattern = this.getSlotPattern(slot.row, slot.col, slot.length, slot.direction);
      let candidates = this.findMatchingWords(pattern);
      
      // Filter out already used words
      candidates = candidates.filter(e => !usedWords.has(e.word));
      
      if (candidates.length === 0) {
        // No valid word for this slot
        continue; // Skip instead of failing immediately
      }
      
      // Prioritize common words
      candidates.sort((a, b) => {
        if (a.is_common_english !== b.is_common_english) {
          return a.is_common_english ? -1 : 1;
        }
        return this.rng() - 0.5; // Random shuffle
      });
      
      // Place the first valid candidate
      const candidate = candidates[0];
      if (this.canPlaceWord(candidate.word, slot.row, slot.col, slot.direction)) {
        this.placeWord(candidate, slot.row, slot.col, slot.direction);
        usedWords.add(candidate.word);
      }
    }
    
    // Check if we have enough words
    return this.placedWords.length >= 15; // Minimum viable puzzle
  }
  
  /**
   * Assign numbers to word starts
   */
  private assignNumbers(): void {
    let number = 1;
    
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c].isBlocked || !this.grid[r][c].letter) continue;
        
        const isAcrossStart = (c === 0 || this.grid[r][c-1].isBlocked || !this.grid[r][c-1].letter) &&
                             c < GRID_SIZE - 1 && !this.grid[r][c+1].isBlocked && this.grid[r][c+1].letter;
        
        const isDownStart = (r === 0 || this.grid[r-1][c].isBlocked || !this.grid[r-1][c].letter) &&
                           r < GRID_SIZE - 1 && !this.grid[r+1][c].isBlocked && this.grid[r+1][c].letter;
        
        if (isAcrossStart || isDownStart) {
          this.grid[r][c].number = number;
          
          // Update placed words with numbers
          for (const word of this.placedWords) {
            if (word.row === r && word.col === c) {
              word.number = number;
            }
          }
          
          number++;
        }
      }
    }
  }
  
  /**
   * Generate final clues list
   */
  private generateClues(): CrosswordClue[] {
    const clues: CrosswordClue[] = [];
    
    for (const word of this.placedWords) {
      if (word.number) {
        clues.push({
          number: word.number,
          clue: word.clue,
          answer: word.word,
          direction: word.direction,
          startRow: word.row,
          startCol: word.col,
          length: word.word.length
        });
      }
    }
    
    // Sort by number and direction
    clues.sort((a, b) => {
      if (a.number !== b.number) return a.number - b.number;
      return a.direction === 'across' ? -1 : 1;
    });
    
    return clues;
  }
  
  /**
   * Main generation method
   */
  public generate(): GeneratedPuzzle {
    let attempts = 0;
    let bestAttempt = { placedWords: 0, clues: 0 };
    
    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      
      // Reset
      this.initializeGrid();
      this.placedWords = [];
      
      // Generate black square pattern
      this.generateBlackSquarePattern();
      
      // Try to fill grid
      if (this.fillGrid()) {
        // Assign numbers
        this.assignNumbers();
        
        // Generate clues
        const clues = this.generateClues();
        
        // Track best attempt
        if (this.placedWords.length > bestAttempt.placedWords) {
          bestAttempt = { placedWords: this.placedWords.length, clues: clues.length };
        }
        
        // Validate minimum clues (relaxed for testing)
        if (clues.length >= 10) {
          console.log(`✅ Successfully generated puzzle with ${clues.length} clues in ${attempts} attempts`);
          
          return {
            grid: this.grid,
            clues,
            size: { rows: GRID_SIZE, cols: GRID_SIZE }
          };
        }
      }
    }
    
    throw new Error(`Failed to generate valid puzzle after ${MAX_ATTEMPTS} attempts. Best attempt: ${bestAttempt.placedWords} words, ${bestAttempt.clues} clues`);
  }
}

// Import the improved generator
import { ImprovedCrosswordGenerator } from './improvedCrosswordGenerator';

// Export function for daily puzzle generation - now using the improved generator
export function generateDailyPuzzle(date: string): GeneratedPuzzle {
  const generator = new ImprovedCrosswordGenerator(date);
  return generator.generate();
}