import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

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

// Enhanced dictionary data structures
let DICTIONARY_WORDS: string[] = [];
let WORDS_BY_LENGTH: Map<number, string[]> = new Map();
let WORDS_WITH_LETTER: Map<string, string[]> = new Map();

// Advanced trie data structure for pattern matching
interface TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  word?: string;
}

class CrosswordTrie {
  private root: TrieNode;

  constructor() {
    this.root = {
      children: new Map(),
      isEndOfWord: false
    };
  }

  // Build trie from dictionary words
  buildTrie(words: string[]): void {
    console.log(`🌳 Building trie from ${words.length} words...`);
    for (const word of words) {
      this.insertWord(word);
    }
    console.log(`✅ Trie construction complete`);
  }

  private insertWord(word: string): void {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, {
          children: new Map(),
          isEndOfWord: false
        });
      }
      node = node.children.get(char)!;
    }
    node.isEndOfWord = true;
    node.word = word;
  }

  // Find words matching pattern like "_O_G_T" (underscore = any letter)
  findMatchingWords(pattern: string): string[] {
    const results: string[] = [];
    this.searchPattern(this.root, pattern, 0, '', results);
    return results;
  }

  private searchPattern(node: TrieNode, pattern: string, index: number, current: string, results: string[]): void {
    if (index === pattern.length) {
      if (node.isEndOfWord && node.word) {
        results.push(node.word);
      }
      return;
    }

    const char = pattern[index];
    if (char === '_') {
      // Wildcard - try all possible children
      for (const [childChar, childNode] of node.children) {
        this.searchPattern(childNode, pattern, index + 1, current + childChar, results);
      }
    } else {
      // Exact character match
      if (node.children.has(char)) {
        this.searchPattern(node.children.get(char)!, pattern, index + 1, current + char, results);
      }
    }
  }

  // Check if a partial pattern can potentially be completed to form valid words
  canCompletePattern(pattern: string): boolean {
    return this.hasValidPrefix(this.root, pattern, 0);
  }

  private hasValidPrefix(node: TrieNode, pattern: string, index: number): boolean {
    if (index === pattern.length) {
      // Check if we can continue from this node to form words
      return this.hasDescendantWords(node);
    }

    const char = pattern[index];
    if (char === '_') {
      // Wildcard - check if any child can complete the pattern
      for (const [, childNode] of node.children) {
        if (this.hasValidPrefix(childNode, pattern, index + 1)) {
          return true;
        }
      }
      return false;
    } else {
      // Exact character match
      if (node.children.has(char)) {
        return this.hasValidPrefix(node.children.get(char)!, pattern, index + 1);
      }
      return false;
    }
  }

  private hasDescendantWords(node: TrieNode): boolean {
    if (node.isEndOfWord) return true;
    
    for (const [, childNode] of node.children) {
      if (this.hasDescendantWords(childNode)) {
        return true;
      }
    }
    return false;
  }
}

// Global trie instance
let DICTIONARY_TRIE: CrosswordTrie;

const initializeDictionary = () => {
  try {
    const dictPath = path.join(__dirname, '../../data/crossword_dictionary.txt');
    if (fs.existsSync(dictPath)) {
      const allWords = fs.readFileSync(dictPath, 'utf-8')
        .split('\n')
        .map(word => word.trim().toUpperCase())
        .filter(word => word.length >= 3 && word.length <= 12 && /^[A-Z]+$/.test(word));
      
      // Smart sampling strategy - take a good representative sample from each length
      const sampledWords = [];
      const wordsPerLength = new Map();
      
      // Group words by length
      for (const word of allWords) {
        const len = word.length;
        if (!wordsPerLength.has(len)) wordsPerLength.set(len, []);
        wordsPerLength.get(len).push(word);
      }
      
      // Take representative samples from each length (more from common crossword lengths)
      for (const [length, words] of wordsPerLength) {
        let sampleSize;
        if (length >= 3 && length <= 5) {
          sampleSize = Math.min(3000, words.length); // Less short words
        } else if (length >= 6 && length <= 8) {
          sampleSize = Math.min(9000, words.length); // Good medium words
        } else {
          sampleSize = Math.min(4200, words.length);  // Lots of long words
        }
        
        // Shuffle and take sample
        const shuffled = words.sort(() => Math.random() - 0.5);
        sampledWords.push(...shuffled.slice(0, sampleSize));
      }
      
      DICTIONARY_WORDS = sampledWords;
      
      console.log(`📚 Loaded ${DICTIONARY_WORDS.length} dictionary words (sampled from ${allWords.length})`);
    } else {
      console.error('❌ Dictionary file not found! Cannot generate crosswords without dictionary.');
      throw new Error('Dictionary file not found');
    }
    
    // Build enhanced lookup tables
    for (const word of DICTIONARY_WORDS) {
      const len = word.length;
      if (!WORDS_BY_LENGTH.has(len)) WORDS_BY_LENGTH.set(len, []);
      WORDS_BY_LENGTH.get(len)!.push(word);
      
      // Index by each letter in the word
      for (const letter of word) {
        if (!WORDS_WITH_LETTER.has(letter)) WORDS_WITH_LETTER.set(letter, []);
        if (!WORDS_WITH_LETTER.get(letter)!.includes(word)) {
          WORDS_WITH_LETTER.get(letter)!.push(word);
        }
      }
    }
    
    console.log(`🔍 Built lookup tables: ${WORDS_BY_LENGTH.size} length groups, ${WORDS_WITH_LETTER.size} letter groups`);
    
    // Build trie for advanced pattern matching
    DICTIONARY_TRIE = new CrosswordTrie();
    DICTIONARY_TRIE.buildTrie(DICTIONARY_WORDS);
    
  } catch (error) {
    console.error('Failed to load dictionary:', error);
  }
};

initializeDictionary();

const GRID_SIZE = 15;
const MIN_WORD_LENGTH = 3;
const MIN_ACROSS_WORDS = 5;  // Start with more achievable targets
const MIN_DOWN_WORDS = 5;
const MAX_TOTAL_WORDS = 25;
const MAX_WORD_ATTEMPTS = 30;
const MAX_FAILED_WORDS = 20;

// Word placement tracking
interface WordPlacement {
  word: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  intersections: Array<{
    row: number;
    col: number;
    letter: string;
  }>;
}

// Connection point for intersections
interface ConnectionPoint {
  row: number;
  col: number;
  letter: string;
  acrossWord?: WordPlacement;
  downWord?: WordPlacement;
}

// Advanced constraint satisfaction system
interface PlacementConstraint {
  row: number;
  col: number;
  direction: 'across' | 'down';
  pattern: string;  // Pattern like "C_T" where _ means any letter
  length: number;
}

interface WordScore {
  word: string;
  position: { row: number; col: number };
  direction: 'across' | 'down';
  score: number;
  constraints: PlacementConstraint[];
}

class AdvancedConstraintEngine {
  private grid: PuzzleCell[][];
  private placedWords: WordPlacement[];
  private trie: CrosswordTrie;

  constructor(grid: PuzzleCell[][], placedWords: WordPlacement[], trie: CrosswordTrie) {
    this.grid = grid;
    this.placedWords = placedWords;
    this.trie = trie;
  }

  // Advanced validation with constraint satisfaction and lookahead
  validateWordPlacement(word: string, row: number, col: number, direction: 'across' | 'down'): boolean {
    console.log(`🔬 Advanced validation for "${word}" ${direction} at (${row},${col})`);
    
    // Step 1: Basic bounds and intersection checking
    if (!this.basicValidation(word, row, col, direction)) {
      console.log(`   ❌ Failed basic validation`);
      return false;
    }

    // Step 2: Generate all perpendicular constraints this placement would create
    const constraints = this.generatePerpendicularConstraints(word, row, col, direction);
    console.log(`   📐 Generated ${constraints.length} perpendicular constraints`);

    // Step 3: Validate each constraint can be satisfied
    for (let i = 0; i < constraints.length; i++) {
      const constraint = constraints[i];
      console.log(`   🧩 Checking constraint ${i + 1}: "${constraint.pattern}" (${constraint.direction})`);
      
      if (!this.canSatisfyConstraint(constraint)) {
        console.log(`   ❌ Cannot satisfy constraint: ${constraint.pattern}`);
        return false;
      } else {
        console.log(`   ✅ Constraint satisfiable: ${constraint.pattern}`);
      }
    }

    // Step 4: Check if placement creates invalid adjacencies
    if (!this.validateAdjacencies(word, row, col, direction)) {
      console.log(`   ❌ Creates invalid adjacencies`);
      return false;
    }

    // Step 5: Check black square placement rules (deferred to final black square placement)
    

    console.log(`   🎯 Advanced validation passed!`);
    return true;
  }

  private basicValidation(word: string, row: number, col: number, direction: 'across' | 'down'): boolean {
    // Check bounds
    if (direction === 'across') {
      if (col < 0 || col + word.length > GRID_SIZE) return false;
    } else {
      if (row < 0 || row + word.length > GRID_SIZE) return false;
    }

    // Check letter compatibility at intersection points
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      
      if (this.grid[r][c].isBlocked) return false;
      
      if (this.grid[r][c].letter) {
        // Must match existing letter exactly
        if (this.grid[r][c].letter !== word[i]) return false;
      }
    }

    return true;
  }

  // Generate constraints for all perpendicular words this placement would create/affect
  private generatePerpendicularConstraints(word: string, row: number, col: number, direction: 'across' | 'down'): PlacementConstraint[] {
    const constraints: PlacementConstraint[] = [];
    const perpDirection = direction === 'across' ? 'down' : 'across';

    for (let i = 0; i < word.length; i++) {
      const letterRow = direction === 'across' ? row : row + i;
      const letterCol = direction === 'across' ? col + i : col;
      const letter = word[i];

      // Skip if there's already a matching letter at this position (valid intersection)
      if (this.grid[letterRow][letterCol].letter && this.grid[letterRow][letterCol].letter === letter) {
        continue;
      }

      // Get the perpendicular word pattern at this position
      const perpPattern = this.getPerpendicularWordPattern(letterRow, letterCol, letter, perpDirection);
      
      // Only create constraints for new patterns that have wildcards (incomplete words)
      if (perpPattern.length >= MIN_WORD_LENGTH && perpPattern.includes('_')) {
        // Calculate start position based on where the new letter would be placed
        const letterIndexInPattern = this.findLetterIndexInPattern(perpPattern, letterRow, letterCol, perpDirection);
        const perpStartPos = this.calculatePatternStartPosition(letterRow, letterCol, perpDirection, letterIndexInPattern);
        
        constraints.push({
          row: perpStartPos.row,
          col: perpStartPos.col,
          direction: perpDirection,
          pattern: perpPattern,
          length: perpPattern.length
        });
      }
    }

    return constraints;
  }

  // Check if a constraint can be satisfied by finding matching dictionary words
  private canSatisfyConstraint(constraint: PlacementConstraint): boolean {
    // If pattern has no wildcards, check if it's a complete valid word
    if (!constraint.pattern.includes('_')) {
      return DICTIONARY_WORDS.includes(constraint.pattern);
    }

    // For patterns with wildcards, use trie to check if valid completions exist
    const matchingWords = this.trie.findMatchingWords(constraint.pattern);
    const availableWords = matchingWords.filter(word => !this.isWordUsed(word));
    
    console.log(`     Pattern "${constraint.pattern}" has ${matchingWords.length} matches, ${availableWords.length} available`);
    
    return availableWords.length > 0;
  }

  // Get the perpendicular word pattern that would be formed 
  private getPerpendicularWordPattern(row: number, col: number, newLetter: string, direction: 'across' | 'down'): string {
    let pattern = '';
    let startPos = { row, col };
    let endPos = { row, col };

    if (direction === 'across') {
      // Find horizontal word boundaries - only extend if there's actually a letter there
      while (startPos.col > 0 && this.grid[row][startPos.col - 1].letter) {
        startPos.col--;
      }
      
      while (endPos.col < GRID_SIZE - 1 && this.grid[row][endPos.col + 1].letter) {
        endPos.col++;
      }

      // Build pattern
      for (let c = startPos.col; c <= endPos.col; c++) {
        if (c === col) {
          pattern += newLetter;
        } else {
          pattern += this.grid[row][c].letter || '_';
        }
      }
    } else {
      // Find vertical word boundaries - only extend if there's actually a letter there
      while (startPos.row > 0 && this.grid[startPos.row - 1][col].letter) {
        startPos.row--;
      }
      
      while (endPos.row < GRID_SIZE - 1 && this.grid[endPos.row + 1][col].letter) {
        endPos.row++;
      }

      // Build pattern
      for (let r = startPos.row; r <= endPos.row; r++) {
        if (r === row) {
          pattern += newLetter;
        } else {
          pattern += this.grid[r][col].letter || '_';
        }
      }
    }

    return pattern;
  }

  // Find where the new letter appears in the perpendicular pattern
  private findLetterIndexInPattern(pattern: string, letterRow: number, letterCol: number, direction: 'across' | 'down'): number {
    // Count how many positions we are from the start of the pattern
    if (direction === 'across') {
      // Find leftmost position of the pattern
      let startCol = letterCol;
      while (startCol > 0 && (this.grid[letterRow][startCol - 1].letter || startCol - 1 === letterCol)) {
        startCol--;
      }
      return letterCol - startCol;
    } else {
      // Find topmost position of the pattern  
      let startRow = letterRow;
      while (startRow > 0 && (this.grid[startRow - 1][letterCol].letter || startRow - 1 === letterRow)) {
        startRow--;
      }
      return letterRow - startRow;
    }
  }

  private calculatePatternStartPosition(letterRow: number, letterCol: number, direction: 'across' | 'down', letterIndex: number): { row: number; col: number } {
    if (direction === 'across') {
      return { row: letterRow, col: letterCol - letterIndex };
    } else {
      return { row: letterRow - letterIndex, col: letterCol };
    }
  }

  private validateAdjacencies(word: string, row: number, col: number, direction: 'across' | 'down'): boolean {
    // Check that word placement doesn't create invalid adjacent letter combinations
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      
      // Check adjacent cells for invalid patterns
      const adjacentPositions = [
        { row: r - 1, col: c }, { row: r + 1, col: c },
        { row: r, col: c - 1 }, { row: r, col: c + 1 }
      ];

      for (const pos of adjacentPositions) {
        if (pos.row >= 0 && pos.row < GRID_SIZE && pos.col >= 0 && pos.col < GRID_SIZE) {
          if (this.grid[pos.row][pos.col].letter && 
              !this.grid[pos.row][pos.col].isBlocked &&
              !this.isPartOfValidWord(pos.row, pos.col)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private isWordUsed(word: string): boolean {
    return this.placedWords.some(placement => placement.word === word);
  }

  private isPartOfValidWord(row: number, col: number): boolean {
    return this.placedWords.some(placement => {
      if (placement.direction === 'across') {
        return placement.row === row && 
               col >= placement.col && 
               col < placement.col + placement.word.length;
      } else {
        return placement.col === col && 
               row >= placement.row && 
               row < placement.row + placement.word.length;
      }
    });
  }
}

export class ProperCrosswordGenerator {
  private grid: PuzzleCell[][];
  private placedWords: WordPlacement[];
  private connectionPoints: ConnectionPoint[];
  private usedWords: Set<string>;
  private rng: () => number;
  private constraintEngine: AdvancedConstraintEngine;

  constructor(seed: string) {
    // Seeded RNG
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    let seedValue = Math.abs(hash);
    this.rng = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };

    this.initializeGrid();
    this.placedWords = [];
    this.connectionPoints = [];
    this.usedWords = new Set();
    
    // Initialize advanced constraint engine
    this.constraintEngine = new AdvancedConstraintEngine(this.grid, this.placedWords, DICTIONARY_TRIE);
  }

  private initializeGrid(): void {
    this.grid = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      this.grid[i] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        this.grid[i][j] = {
          letter: '',
          isBlocked: false,
          number: null
        };
      }
    }
  }

  /**
   * Find words from dictionary that contain a specific letter at a specific position
   */
  private findWordsWithLetterAt(letter: string, position: number, length: number): string[] {
    const candidates = WORDS_BY_LENGTH.get(length) || [];
    return candidates
      .filter(word => word[position] === letter && !this.usedWords.has(word))
      .slice(0, 100); // Allow more candidates for better variety
  }

  /**
   * Find words from dictionary that match a pattern with known and unknown letters
   */
  private findWordsMatchingPattern(pattern: string): string[] {
    const length = pattern.length;
    const candidates = WORDS_BY_LENGTH.get(length) || [];
    
    return candidates
      .filter(word => {
        if (this.usedWords.has(word)) return false;
        
        for (let i = 0; i < pattern.length; i++) {
          if (pattern[i] !== '_' && pattern[i] !== word[i]) {
            return false;
          }
        }
        return true;
      })
      .slice(0, 100); // Allow more pattern matches
  }

  /**
   * Check if a word can be placed at a specific location using advanced constraint satisfaction
   */
  private canPlaceWordStrict(word: string, row: number, col: number, direction: 'across' | 'down'): boolean {
    // Use the advanced constraint engine for validation
    return this.constraintEngine.validateWordPlacement(word, row, col, direction);
  }
  
  /**
   * Legacy validation method (kept for reference but not used)
   */
  private legacyValidation(word: string, row: number, col: number, direction: 'across' | 'down'): boolean {
    // Check bounds
    if (direction === 'across') {
      if (col < 0 || col + word.length > GRID_SIZE) return false;
    } else {
      if (row < 0 || row + word.length > GRID_SIZE) return false;
    }

    let intersectionCount = 0;
    const newLetterPositions = [];

    // Check each position of the word
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      
      // Check if position is blocked
      if (this.grid[r][c].isBlocked) return false;
      
      if (this.grid[r][c].letter) {
        // Existing letter - must match exactly
        if (this.grid[r][c].letter !== word[i]) return false;
        intersectionCount++;
      } else {
        // New letter position
        newLetterPositions.push({ row: r, col: c, letter: word[i] });
      }
    }


    // Rule: Must intersect with existing words (except first word)
    if (this.placedWords.length > 0 && intersectionCount === 0) return false;

    // Rule: Check word separation - words must be separated by black squares or grid edges
    if (!this.isWordProperlySeparated(word, row, col, direction)) return false;

    // Rule: Check that new letters won't create invalid adjacent patterns
    for (const pos of newLetterPositions) {
      if (!this.isValidLetterPlacement(pos.row, pos.col, pos.letter, direction)) return false;
    }

    return true;
  }

  /**
   * Check if word placement follows proper crossword separation rules
   * Every word must have a black square or grid boundary before and after it
   */
  private isWordProperlySeparated(word: string, row: number, col: number, direction: 'across' | 'down'): boolean {
    if (direction === 'across') {
      // Check cell before word start
      if (col > 0) {
        const beforeCell = this.grid[row][col - 1];
        if (beforeCell.letter && !beforeCell.isBlocked) {
          console.log(`   ❌ Word "${word}" would be adjacent to existing letter '${beforeCell.letter}' at (${row},${col - 1})`);
          return false; // Another letter exists without black square separation
        }
      }
      
      // Check cell after word end
      if (col + word.length < GRID_SIZE) {
        const afterCell = this.grid[row][col + word.length];
        if (afterCell.letter && !afterCell.isBlocked) {
          console.log(`   ❌ Word "${word}" would be adjacent to existing letter '${afterCell.letter}' at (${row},${col + word.length})`);
          return false; // Another letter exists without black square separation
        }
      }
    } else {
      // Check cell before word start (up direction)
      if (row > 0) {
        const beforeCell = this.grid[row - 1][col];
        if (beforeCell.letter && !beforeCell.isBlocked) {
          console.log(`   ❌ Word "${word}" would be adjacent to existing letter '${beforeCell.letter}' at (${row - 1},${col})`);
          return false; // Another letter exists without black square separation
        }
      }
      
      // Check cell after word end (down direction)
      if (row + word.length < GRID_SIZE) {
        const afterCell = this.grid[row + word.length][col];
        if (afterCell.letter && !afterCell.isBlocked) {
          console.log(`   ❌ Word "${word}" would be adjacent to existing letter '${afterCell.letter}' at (${row + word.length},${col})`);
          return false; // Another letter exists without black square separation
        }
      }
    }
    
    return true;
  }

  /**
   * Validate that a letter placement creates valid perpendicular words
   */
  private isValidLetterPlacement(row: number, col: number, letter: string, placingDirection: 'across' | 'down'): boolean {
    const perpDirection = placingDirection === 'across' ? 'down' : 'across';
    
    // Check if this letter would be part of a perpendicular word
    const perpWord = this.getPerpendicularWordPattern(row, col, letter, perpDirection);
    
    if (perpWord.length >= MIN_WORD_LENGTH) {
      // Only reject if it would create a definitely invalid word
      const cleanWord = perpWord.replace(/_/g, '');
      if (cleanWord.length === perpWord.length) {
        // Complete word - must be in dictionary
        return DICTIONARY_WORDS.includes(cleanWord);
      } else {
        // Partial word - be more lenient, assume it can be completed later
        return true;
      }
    }
    
    return true; // Single letters or very short combinations are allowed
  }

  /**
   * Get the perpendicular word pattern that would be formed by placing a letter
   * Without black squares, we check for adjacent letters only
   */
  private getPerpendicularWordPattern(row: number, col: number, newLetter: string, direction: 'across' | 'down'): string {
    let pattern = '';
    
    if (direction === 'across') {
      // Find horizontal adjacent letters
      let startCol = col;
      let endCol = col;
      
      // Find start - look for adjacent letters to the left
      while (startCol > 0 && this.grid[row][startCol - 1].letter) {
        startCol--;
      }
      
      // Find end - look for adjacent letters to the right
      while (endCol < GRID_SIZE - 1 && this.grid[row][endCol + 1].letter) {
        endCol++;
      }
      
      // Build pattern only if there are adjacent letters
      if (startCol < col || endCol > col) {
        for (let c = startCol; c <= endCol; c++) {
          if (c === col) {
            pattern += newLetter;
          } else {
            pattern += this.grid[row][c].letter || '_';
          }
        }
      } else {
        pattern = newLetter; // Just the single letter
      }
    } else {
      // Find vertical adjacent letters
      let startRow = row;
      let endRow = row;
      
      // Find start - look for adjacent letters above
      while (startRow > 0 && this.grid[startRow - 1][col].letter) {
        startRow--;
      }
      
      // Find end - look for adjacent letters below
      while (endRow < GRID_SIZE - 1 && this.grid[endRow + 1][col].letter) {
        endRow++;
      }
      
      // Build pattern only if there are adjacent letters
      if (startRow < row || endRow > row) {
        for (let r = startRow; r <= endRow; r++) {
          if (r === row) {
            pattern += newLetter;
          } else {
            pattern += this.grid[r][col].letter || '_';
          }
        }
      } else {
        pattern = newLetter; // Just the single letter
      }
    }
    
    return pattern;
  }

  /**
   * Place a word on the grid with proper tracking - place black squares at beginning and end of word
   */
  private placeWord(word: string, row: number, col: number, direction: 'across' | 'down'): void {
    const intersections = [];
    let placements = [];

    // Place each letter - NEVER CHANGE EXISTING LETTERS
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      
      const wasIntersection = !!this.grid[r][c].letter;
      
      if (wasIntersection) {
        // Verify the existing letter matches (should have been validated already)
        if (this.grid[r][c].letter !== word[i]) {
          throw new Error(`Letter mismatch at (${r},${c}): existing '${this.grid[r][c].letter}' vs placing '${word[i]}'`);
        }
        intersections.push({ row: r, col: c, letter: word[i] });
      } else {
        placements.push({ row: r, col: c, letter: word[i] });
      }
    }
    
    // Add word to tracking
    const placement = { word, row, col, direction, intersections };
    for (let i = 0; i < placements.length; i++) {
      const r = placements[i];
      this.grid[r.row][r.col].letter = r.letter;
    }
    this.placedWords.push(placement);
    this.usedWords.add(word);

    
    // Update connection points for future intersections
    this.updateConnectionPoints(placement);
    
    // Update constraint engine with new grid state
    this.constraintEngine = new AdvancedConstraintEngine(this.grid, this.placedWords, DICTIONARY_TRIE);
        
    console.log(`✅ Placed "${word}" ${direction} at (${row},${col}) with ${intersections.length} intersections`);
  }

  /**
   * Add all black squares at the end of generation to maintain proper word separation
   */
  private addAllBlackSquares(): void {
    console.log('🔲 Adding black squares for proper word separation...');
    
    for (const placement of this.placedWords) {
      const { word, row, col, direction } = placement;
      
      if (direction === 'across') {
        // Black square before word
        if (col > 0 && !this.grid[row][col - 1].letter && !this.grid[row][col - 1].isBlocked) {
          this.grid[row][col - 1].isBlocked = true;
        }
        
        // Black square after word
        const endCol = col + word.length;
        if (endCol < GRID_SIZE && !this.grid[row][endCol].letter && !this.grid[row][endCol].isBlocked) {
          this.grid[row][endCol].isBlocked = true;
        }
      } else {
        // Black square before word
        if (row > 0 && !this.grid[row - 1][col].letter && !this.grid[row - 1][col].isBlocked) {
          this.grid[row - 1][col].isBlocked = true;
        }
        
        // Black square after word
        const endRow = row + word.length;
        if (endRow < GRID_SIZE && !this.grid[endRow][col].letter && !this.grid[endRow][col].isBlocked) {
          this.grid[endRow][col].isBlocked = true;
        }
      }
    }
  }

  /**
   * Update connection points for future word intersections
   */
  private updateConnectionPoints(placement: WordPlacement): void {
    for (let i = 0; i < placement.word.length; i++) {
      const row = placement.direction === 'across' ? placement.row : placement.row + i;
      const col = placement.direction === 'across' ? placement.col + i : placement.col;
      const letter = placement.word[i];
      
      // Find or create connection point
      let connectionPoint = this.connectionPoints.find(cp => cp.row === row && cp.col === col);
      if (!connectionPoint) {
        connectionPoint = { row, col, letter };
        this.connectionPoints.push(connectionPoint);
      }
      
      // Update with word reference
      if (placement.direction === 'across') {
        connectionPoint.acrossWord = placement;
      } else {
        connectionPoint.downWord = placement;
      }
    }
  }

  /**
   * Find the best connection points for placing new words in a specific direction
   */
  private findBestConnectionPoints(targetDirection: 'across' | 'down'): ConnectionPoint[] {
    return this.connectionPoints
      .filter(cp => {
        // Filter for points that can accept the target direction
        if (targetDirection === 'across') {
          return !cp.acrossWord; // Can place across word here
        } else {
          return !cp.downWord;   // Can place down word here
        }
      })
      .sort((a, b) => {
        // Prefer points closer to center
        const centerRow = GRID_SIZE / 2;
        const centerCol = GRID_SIZE / 2;
        const distA = Math.abs(a.row - centerRow) + Math.abs(a.col - centerCol);
        const distB = Math.abs(b.row - centerRow) + Math.abs(b.col - centerCol);
        return distA - distB;
      });
  }

  /**
   * Attempt to place a word using backtracking with retry logic
   */
  private attemptWordPlacement(word: string, connectionPoint: ConnectionPoint, direction: 'across' | 'down'): boolean {
    const letterPositions = [];
    
    // Find all positions where the connection letter appears in the word
    for (let i = 0; i < word.length; i++) {
      if (word[i] === connectionPoint.letter) {
        letterPositions.push(i);
      }
    }
    
    console.log(`     Word "${word}" has letter '${connectionPoint.letter}' at positions: [${letterPositions.join(', ')}]`);
    
    if (letterPositions.length === 0) {
      console.log(`     ❌ Word "${word}" doesn't contain letter '${connectionPoint.letter}'`);
      return false;
    }
    
    // Try each possible position
    for (const letterPos of letterPositions) {
      let wordRow, wordCol;
      
      if (direction === 'across') {
        wordRow = connectionPoint.row;
        wordCol = connectionPoint.col - letterPos;
      } else {
        wordRow = connectionPoint.row - letterPos;
        wordCol = connectionPoint.col;
      }
      
      console.log(`     🎯 Trying to place "${word}" ${direction} at (${wordRow},${wordCol}) intersecting at position ${letterPos}`);
      
      if (this.canPlaceWordStrict(word, wordRow, wordCol, direction)) {
        console.log(`     ✅ Placement validation passed!`);
        this.placeWord(word, wordRow, wordCol, direction);
        return true;
      } else {
        console.log(`     ❌ Placement validation failed`);
      }
    }
    
    return false;
  }

  /**
   * Generate crossword using enhanced backtracking algorithm
   */
  private generateCrosswordWithBacktracking(): boolean {
    console.log('🚀 Starting enhanced backtracking crossword generation...');
    console.log(`📋 Targets: ${MIN_ACROSS_WORDS}+ across, ${MIN_DOWN_WORDS}+ down, max ${MAX_TOTAL_WORDS} total`);
    
    // Step 1: Place initial seed word
    const seedWords = ['GALAXY', 'STELLAR', 'COSMIC', 'NEBULA', 'PLANET'];
    const seedWord = seedWords[Math.floor(this.rng() * seedWords.length)];
    
    const centerRow = Math.floor(GRID_SIZE / 2);
    const centerCol = Math.floor(GRID_SIZE / 2) - Math.floor(seedWord.length / 2);
    
    this.placeWord(seedWord, centerRow, centerCol, 'across');
    console.log(`🌟 Placed seed word: "${seedWord}"`);
    
    // Step 2: Use backtracking to add more words
    let failedWordCount = 0;
    
    while (this.placedWords.length < MAX_TOTAL_WORDS && failedWordCount < MAX_FAILED_WORDS) {
      const acrossCount = this.placedWords.filter(w => w.direction === 'across').length;
      const downCount = this.placedWords.filter(w => w.direction === 'down').length;
      
      // Determine next direction - prioritize creating intersections first
      let targetDirection: 'across' | 'down';
      
      // After placing seed word, prioritize the opposite direction for intersections
      if (this.placedWords.length === 1) {
        // We have only the seed word (across), prioritize down words for intersections
        targetDirection = 'down';
      } else if (acrossCount < 4 && downCount < 4) {
        // Early stage - alternate to create intersections
        targetDirection = acrossCount <= downCount ? 'down' : 'across';
      } else if (downCount < MIN_DOWN_WORDS) {
        targetDirection = 'down';
      } else if (acrossCount < MIN_ACROSS_WORDS) {
        targetDirection = 'across';
      } else {
        // Both minimums met, choose based on balance
        targetDirection = acrossCount <= downCount ? 'across' : 'down';
      }
      
      console.log(`📊 Current counts: ${acrossCount} across, ${downCount} down - targeting ${targetDirection}`);
      
      const placed = this.attemptToPlaceNewWord(targetDirection);
      if (!placed) {
        failedWordCount++;
        console.log(`❌ Failed placement attempt ${failedWordCount}/${MAX_FAILED_WORDS}`);
      } else {
        failedWordCount = 0; // Reset on success
      }
    }
    
    const finalAcross = this.placedWords.filter(w => w.direction === 'across').length;
    const finalDown = this.placedWords.filter(w => w.direction === 'down').length;
    
    console.log(`🏁 Generation complete: ${finalAcross} across, ${finalDown} down (${this.placedWords.length} total)`);
    
    // Add black squares at the end
    this.addAllBlackSquares();
    
    return finalAcross >= MIN_ACROSS_WORDS && finalDown >= MIN_DOWN_WORDS;
  }

  /**
   * Attempt to place a new word in the specified direction
   */
  private attemptToPlaceNewWord(direction: 'across' | 'down'): boolean {
    const connectionPoints = this.findBestConnectionPoints(direction);
    console.log(`🔍 Found ${connectionPoints.length} connection points for ${direction} words`);
    
    for (let i = 0; i < connectionPoints.length; i++) {
      const connectionPoint = connectionPoints[i];
      console.log(`   Connection ${i+1}: letter '${connectionPoint.letter}' at (${connectionPoint.row},${connectionPoint.col})`);
      
      // Connection points are pre-filtered, so no need to skip
      
      // Try multiple words for this connection point
      const candidateWords = this.getRandomWordsWithLetter(connectionPoint.letter);
      console.log(`   🎯 Found ${candidateWords.length} candidate words with letter '${connectionPoint.letter}'`);
      
      if (candidateWords.length === 0) {
        console.log(`   ❌ No words available with letter '${connectionPoint.letter}'`);
        continue;
      }
      
      for (let attempt = 0; attempt < MAX_WORD_ATTEMPTS && attempt < candidateWords.length; attempt++) {
        const word = candidateWords[attempt];
        console.log(`   🔤 Trying word "${word}" (attempt ${attempt + 1})`);
        
        if (this.attemptWordPlacement(word, connectionPoint, direction)) {
          console.log(`   ✅ Successfully placed "${word}"!`);
          return true;
        } else {
          console.log(`   ❌ Failed to place "${word}"`);
        }
      }
    }
    
    console.log(`❌ Could not place any ${direction} words`);
    return false;
  }

  /**
   * Get random words containing a specific letter, prioritizing good crossword words
   */
  private getRandomWordsWithLetter(letter: string): string[] {
    const wordsWithLetter = WORDS_WITH_LETTER.get(letter) || [];
    const availableWords = wordsWithLetter.filter(word => !this.usedWords.has(word));
    
    // Use more words from dictionary - don't over-limit
    return this.shuffleArray(availableWords).sort(() => Math.random() - 0.5).slice(0, 50);
  }

  /**
   * Shuffle array using seeded random
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Validate the final crossword meets all constraints
   */
  private validateFinalCrossword(): boolean {
    console.log('🔍 Validating final crossword...');
    let isValid = true;
    
    // Check minimum word counts
    const acrossCount = this.placedWords.filter(w => w.direction === 'across').length;
    const downCount = this.placedWords.filter(w => w.direction === 'down').length;
    
    if (acrossCount < MIN_ACROSS_WORDS || downCount < MIN_DOWN_WORDS) {
      console.log(`❌ Insufficient words: ${acrossCount} across (need ${MIN_ACROSS_WORDS}), ${downCount} down (need ${MIN_DOWN_WORDS})`);
      isValid = false;
    }
    
    // Check that all letters are part of valid intersections
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (this.grid[row][col].letter && !this.grid[row][col].isBlocked) {
          const acrossWord = this.findWordAtPosition(row, col, 'across');
          const downWord = this.findWordAtPosition(row, col, 'down');
          
          if (!acrossWord || !downWord) {
            console.log(`❌ Letter '${this.grid[row][col].letter}' at (${row},${col}) not part of both directions`);
            isValid = false;
          }
        }
      }
    }
    
    if (isValid) {
      console.log('✅ Crossword validation passed!');
    }
    
    return isValid;
  }

  /**
   * Find word placement at a specific position and direction
   */
  private findWordAtPosition(row: number, col: number, direction: 'across' | 'down'): WordPlacement | null {
    return this.placedWords.find(placement => {
      if (placement.direction !== direction) return false;
      
      if (direction === 'across') {
        return placement.row === row && 
               col >= placement.col && 
               col < placement.col + placement.word.length;
      } else {
        return placement.col === col && 
               row >= placement.row && 
               row < placement.row + placement.word.length;
      }
    }) || null;
  }

  /**
   * Generate clues for all placed words
   */
  private generateClues(): CrosswordClue[] {
    // Number the grid
    const startPositions = new Map<string, number>();
    const wordStarts = this.placedWords.map(w => ({ row: w.row, col: w.col }));
    
    // Remove duplicates and sort by position
    const uniquePositions = Array.from(
      new Set(wordStarts.map(pos => `${pos.row},${pos.col}`))
    ).map(key => {
      const [row, col] = key.split(',').map(Number);
      return { row, col };
    }).sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
    
    // Assign numbers
    uniquePositions.forEach((pos, index) => {
      const key = `${pos.row},${pos.col}`;
      startPositions.set(key, index + 1);
      this.grid[pos.row][pos.col].number = index + 1;
    });
    
    // Generate clues
    const clues: CrosswordClue[] = [];
    for (const placement of this.placedWords) {
      const key = `${placement.row},${placement.col}`;
      const number = startPositions.get(key);
      if (number) {
        clues.push({
          number,
          clue: this.generateClueForWord(placement.word),
          answer: placement.word,
          direction: placement.direction,
          startRow: placement.row,
          startCol: placement.col,
          length: placement.word.length
        });
      }
    }
    
    return clues.sort((a, b) => {
      if (a.direction !== b.direction) {
        return a.direction === 'across' ? -1 : 1;
      }
      return a.number - b.number;
    });
  }

  /**
   * Generate clue for a word
   */
  private generateClueForWord(word: string): string {
    const clues: { [key: string]: string } = {
      // Space/cosmic theme
      'GALAXY': 'Milky Way, for one',
      'STELLAR': 'Outstanding',
      'COSMIC': 'Universal',
      'NEBULA': 'Star nursery',
      'PLANET': 'Earth or Mars',
      'COMET': 'Celestial visitor',
      'METEOR': 'Shooting star',
      'SATURN': 'Ringed planet',
      'SPACE': 'Final frontier',
      'STAR': 'Night light',
      'MOON': 'Earth\'s satellite',
      'ORBIT': 'Circular path',
    };
    
    return clues[word.toUpperCase()] || `Word: ${word}`;
  }

  /**
   * Main generation method
   */
  generate(): GeneratedPuzzle {
    console.log('🎯 Starting proper crossword generation with strict constraints...');
    
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Attempt ${attempt}/${maxAttempts}`);
      
      // Reset state
      this.initializeGrid();
      this.placedWords = [];
      this.connectionPoints = [];
      this.usedWords.clear();
      
      // Reset constraint engine
      this.constraintEngine = new AdvancedConstraintEngine(this.grid, this.placedWords, DICTIONARY_TRIE);
      
      // Generate crossword
      const success = this.generateCrosswordWithBacktracking();
      
      if (success) {
        const isValid = this.validateFinalCrossword();
        
        if (isValid || this.placedWords.length >= 10) { // Accept if reasonably complete
          const clues = this.generateClues();
          console.log(`🎉 Successfully generated crossword with ${clues.length} clues!`);
          
          return {
            grid: this.grid,
            clues,
            size: { rows: GRID_SIZE, cols: GRID_SIZE }
          };
        }
      }
      
      console.log(`❌ Attempt ${attempt} failed validation`);
    }
    
    // Return whatever we managed to generate - no fallback
    console.warn('⚠️  Could not meet minimum requirements, returning partial crossword');
    const clues = this.generateClues();
    return {
      grid: this.grid,
      clues,
      size: { rows: GRID_SIZE, cols: GRID_SIZE }
    };
  }

  /**
   * Create a minimal valid crossword as fallback
   */
  private createMinimalCrossword(): GeneratedPuzzle {
    // COMPLETELY reset everything for fallback
    this.grid = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      this.grid[i] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        this.grid[i][j] = {
          letter: '',
          isBlocked: false,
          number: null
        };
      }
    }
    
    this.placedWords = [];
    this.connectionPoints = [];
    this.usedWords.clear();
    
    console.log('🔧 Creating fallback minimal crossword...');
    
    // Create a simple cross pattern - just use manual placement
    const centerRow = Math.floor(GRID_SIZE / 2);
    const centerCol = Math.floor(GRID_SIZE / 2);
    
    // Manually place SPACE horizontally
    const spaceWord = 'SPACE';
    const spaceRow = centerRow;
    const spaceStartCol = centerCol - 2;
    
    for (let i = 0; i < spaceWord.length; i++) {
      this.grid[spaceRow][spaceStartCol + i].letter = spaceWord[i];
    }
    this.placedWords.push({
      word: spaceWord,
      row: spaceRow,
      col: spaceStartCol,
      direction: 'across',
      intersections: []
    });
    
    // Manually place SUN vertically intersecting at S
    const sunWord = 'SUN';
    const sunCol = spaceStartCol; // Same as S position
    const sunStartRow = spaceRow - 1;
    
    for (let i = 0; i < sunWord.length; i++) {
      const r = sunStartRow + i;
      if (r === spaceRow) continue; // Skip intersection - already placed
      this.grid[r][sunCol].letter = sunWord[i];
    }
    this.placedWords.push({
      word: sunWord,
      row: sunStartRow,
      col: sunCol,
      direction: 'down',
      intersections: [{ row: spaceRow, col: sunCol, letter: 'S' }]
    });
    
    // Manually place ART vertically intersecting at A
    const artWord = 'ART';
    const artCol = spaceStartCol + 2; // A position in SPACE
    const artStartRow = spaceRow - 1;
    
    for (let i = 0; i < artWord.length; i++) {
      const r = artStartRow + i;
      if (r === spaceRow) continue; // Skip intersection - already placed
      this.grid[r][artCol].letter = artWord[i];
    }
    this.placedWords.push({
      word: artWord,
      row: artStartRow,
      col: artCol,
      direction: 'down',
      intersections: [{ row: spaceRow, col: artCol, letter: 'A' }]
    });
    
    // Add black squares manually
    for (const placement of this.placedWords) {
      const { word, row, col, direction } = placement;
      
      if (direction === 'across') {
        if (col > 0) this.grid[row][col - 1].isBlocked = true;
        if (col + word.length < GRID_SIZE) this.grid[row][col + word.length].isBlocked = true;
      } else {
        if (row > 0) this.grid[row - 1][col].isBlocked = true;
        if (row + word.length < GRID_SIZE) this.grid[row + word.length][col].isBlocked = true;
      }
    }
    
    const clues = this.generateClues();
    
    console.log(`✅ Created fallback crossword with ${clues.length} clues`);
    
    return {
      grid: this.grid,
      clues,
      size: { rows: GRID_SIZE, cols: GRID_SIZE }
    };
  }
}

export function generateProperDailyPuzzle(date: string): GeneratedPuzzle {
  const puzzleSecret = process.env.PUZZLE_SECRET || 'galactic-puzzle-secret';
  const seed = crypto.createHash('sha256').update(`${puzzleSecret}-${date}`).digest('hex');
  
  const generator = new ProperCrosswordGenerator(seed);
  return generator.generate();
}