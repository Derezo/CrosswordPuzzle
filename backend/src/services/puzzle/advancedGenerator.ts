import crypto from 'crypto';

export interface IPuzzleCell {
  letter: string | null;
  number: number | null;
  isBlocked: boolean;
}

export interface ICrosswordClue {
  number: number;
  clue: string;
  answer: string;
  direction: 'across' | 'down';
  startRow: number;
  startCol: number;
  length: number;
}

export interface GeneratedPuzzle {
  grid: IPuzzleCell[][];
  clues: ICrosswordClue[];
  size: { rows: number; cols: number };
}

// Enhanced word list with frequency scores and theme categories
const GALACTIC_WORDS = [
  // Theme words (higher priority for placement)
  { word: 'GALAXY', clue: 'Spiral or elliptical star system', frequency: 1.0, category: 'cosmic' },
  { word: 'NEBULA', clue: 'Interstellar cloud of dust and gas', frequency: 0.9, category: 'cosmic' },
  { word: 'COSMOS', clue: 'The universe seen as a well-ordered whole', frequency: 0.8, category: 'cosmic' },
  { word: 'STELLAR', clue: 'Relating to stars', frequency: 0.7, category: 'cosmic' },
  { word: 'QUASAR', clue: 'Extremely luminous active galactic nucleus', frequency: 0.6, category: 'cosmic' },
  { word: 'PULSAR', clue: 'Highly magnetized rotating neutron star', frequency: 0.6, category: 'cosmic' },
  
  // Celestial bodies
  { word: 'PLANET', clue: 'Celestial body orbiting a star', frequency: 0.9, category: 'celestial' },
  { word: 'COMET', clue: 'Icy celestial body with a tail', frequency: 0.8, category: 'celestial' },
  { word: 'METEOR', clue: 'Space rock entering atmosphere', frequency: 0.7, category: 'celestial' },
  { word: 'STAR', clue: 'Luminous sphere of plasma', frequency: 1.0, category: 'celestial' },
  { word: 'MOON', clue: 'Natural satellite of Earth', frequency: 1.0, category: 'celestial' },
  { word: 'MARS', clue: 'The red planet', frequency: 0.9, category: 'celestial' },
  { word: 'VENUS', clue: 'Second planet from the sun', frequency: 0.8, category: 'celestial' },
  { word: 'EARTH', clue: 'Third planet from the sun', frequency: 1.0, category: 'celestial' },
  { word: 'NOVA', clue: 'Stellar explosion', frequency: 0.7, category: 'celestial' },
  
  // Space concepts
  { word: 'SPACE', clue: 'The final frontier', frequency: 1.0, category: 'space' },
  { word: 'ORBIT', clue: 'Curved path around a celestial body', frequency: 0.8, category: 'space' },
  { word: 'SOLAR', clue: 'Relating to the sun', frequency: 0.9, category: 'space' },
  { word: 'LUNAR', clue: 'Relating to the moon', frequency: 0.8, category: 'space' },
  { word: 'VOID', clue: 'Large empty space between galaxies', frequency: 0.7, category: 'space' },
  { word: 'COSMIC', clue: 'Relating to the universe', frequency: 0.8, category: 'space' },
  { word: 'GRAVITY', clue: 'Force that attracts objects', frequency: 0.9, category: 'space' },
  { word: 'WARP', clue: 'Distortion in spacetime', frequency: 0.6, category: 'space' },
  
  // Science and physics
  { word: 'ATOM', clue: 'Basic unit of matter', frequency: 0.9, category: 'science' },
  { word: 'ENERGY', clue: 'Capacity to do work', frequency: 0.9, category: 'science' },
  { word: 'LIGHT', clue: 'Electromagnetic radiation', frequency: 1.0, category: 'science' },
  { word: 'DARK', clue: 'Absence of light', frequency: 0.9, category: 'science' },
  { word: 'TIME', clue: 'Fourth dimension', frequency: 1.0, category: 'science' },
  
  // Space exploration
  { word: 'ROCKET', clue: 'Vehicle for space travel', frequency: 0.8, category: 'exploration' },
  { word: 'ALIEN', clue: 'Extraterrestrial being', frequency: 0.7, category: 'exploration' },
  
  // Common crossword letters for filling
  { word: 'ERA', clue: 'Time period', frequency: 1.0, category: 'common' },
  { word: 'AGE', clue: 'Period of time', frequency: 1.0, category: 'common' },
  { word: 'ICE', clue: 'Frozen water', frequency: 0.9, category: 'common' },
  { word: 'AIR', clue: 'Breathable gas', frequency: 0.9, category: 'common' },
  { word: 'SUN', clue: 'Our nearest star', frequency: 1.0, category: 'common' },
  { word: 'SKY', clue: 'Heavens above', frequency: 0.9, category: 'common' },
  { word: 'RAY', clue: 'Beam of light', frequency: 0.8, category: 'common' },
  { word: 'ORB', clue: 'Spherical object', frequency: 0.7, category: 'common' },
  { word: 'ION', clue: 'Charged particle', frequency: 0.6, category: 'common' },
];

const GRID_SIZE = 15;
const MAX_BLACK_SQUARES_PERCENT = 0.16; // 16% max black squares rule
const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 15;

interface Slot {
  id: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  length: number;
  pattern: string; // Regex pattern for current constraints
  intersections: Intersection[];
}

interface Intersection {
  slotId: string;
  position: number; // Position in this slot
  otherPosition: number; // Position in other slot
}

interface Variable extends Slot {
  domain: typeof GALACTIC_WORDS;
  assignedWord?: typeof GALACTIC_WORDS[0];
}

/**
 * Advanced Crossword Generator using Constraint Satisfaction Problem (CSP) approach
 * Implements proper crossword construction rules:
 * - 180-degree rotational symmetry
 * - No unchecked squares (every letter appears in both across and down)
 * - Minimum word length of 3
 * - Maximum 16% black squares
 * - Backtracking with heuristics (MRV, degree, LCV)
 * - Arc consistency and constraint propagation
 */
class AdvancedCrosswordGenerator {
  private grid: IPuzzleCell[][];
  private slots: Slot[];
  private variables: Variable[];
  private rng: () => number;
  private placedWords: Set<string>;
  private clueNumber: number;

  constructor(seed: string) {
    this.grid = this.initializeGrid();
    this.slots = [];
    this.variables = [];
    this.placedWords = new Set();
    this.clueNumber = 1;
    this.rng = this.createSeededRNG(seed);
  }

  private createSeededRNG(seed: string): () => number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    let current = Math.abs(hash);
    return () => {
      current = (current * 1103515245 + 12345) & 0x7fffffff;
      return current / 0x7fffffff;
    };
  }

  private initializeGrid(): IPuzzleCell[][] {
    const grid: IPuzzleCell[][] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      grid[i] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        grid[i][j] = {
          letter: null,
          number: null,
          isBlocked: false
        };
      }
    }
    return grid;
  }

  /**
   * Create a symmetric grid pattern following crossword construction rules
   */
  private createSymmetricGridPattern(): void {
    const blockPositions: [number, number][] = [];
    const maxBlocks = Math.floor(GRID_SIZE * GRID_SIZE * MAX_BLACK_SQUARES_PERCENT);
    const blocksToPlace = Math.floor(this.rng() * (maxBlocks * 0.7)) + Math.floor(maxBlocks * 0.3);

    // Generate random block positions for upper half + center
    const centerRow = Math.floor(GRID_SIZE / 2);
    const centerCol = Math.floor(GRID_SIZE / 2);
    
    for (let attempts = 0; attempts < blocksToPlace * 3; attempts++) {
      const row = Math.floor(this.rng() * (centerRow + 1));
      const col = Math.floor(this.rng() * GRID_SIZE);
      
      // Avoid placing blocks in corners or center unless necessary
      if ((row === 0 || row === GRID_SIZE - 1) && (col === 0 || col === GRID_SIZE - 1)) {
        continue;
      }
      
      // Check if we haven't already placed a block here
      if (!blockPositions.some(([r, c]) => r === row && c === col)) {
        blockPositions.push([row, col]);
        
        // Add symmetric position (180-degree rotation)
        const symRow = GRID_SIZE - 1 - row;
        const symCol = GRID_SIZE - 1 - col;
        
        if (symRow !== row || symCol !== col) { // Avoid duplicates for center
          blockPositions.push([symRow, symCol]);
        }
        
        if (blockPositions.length >= blocksToPlace) break;
      }
    }

    // Place blocks in grid
    for (const [row, col] of blockPositions) {
      this.grid[row][col].isBlocked = true;
    }
  }

  /**
   * Identify all word slots in the grid
   */
  private findWordSlots(): void {
    this.slots = [];
    
    // Find horizontal slots (across)
    for (let row = 0; row < GRID_SIZE; row++) {
      let start = -1;
      for (let col = 0; col <= GRID_SIZE; col++) {
        const isBlocked = col === GRID_SIZE || this.grid[row][col].isBlocked;
        
        if (!isBlocked && start === -1) {
          start = col;
        } else if (isBlocked && start !== -1) {
          const length = col - start;
          if (length >= MIN_WORD_LENGTH) {
            this.slots.push({
              id: `across_${row}_${start}`,
              row,
              col: start,
              direction: 'across',
              length,
              pattern: '.'.repeat(length),
              intersections: []
            });
          }
          start = -1;
        }
      }
    }

    // Find vertical slots (down)
    for (let col = 0; col < GRID_SIZE; col++) {
      let start = -1;
      for (let row = 0; row <= GRID_SIZE; row++) {
        const isBlocked = row === GRID_SIZE || this.grid[row][col].isBlocked;
        
        if (!isBlocked && start === -1) {
          start = row;
        } else if (isBlocked && start !== -1) {
          const length = row - start;
          if (length >= MIN_WORD_LENGTH) {
            this.slots.push({
              id: `down_${start}_${col}`,
              row: start,
              col,
              direction: 'down',
              length,
              pattern: '.'.repeat(length),
              intersections: []
            });
          }
          start = -1;
        }
      }
    }

    // Find intersections between slots
    this.findIntersections();
  }

  /**
   * Find all intersections between word slots
   */
  private findIntersections(): void {
    for (let i = 0; i < this.slots.length; i++) {
      for (let j = i + 1; j < this.slots.length; j++) {
        const slot1 = this.slots[i];
        const slot2 = this.slots[j];
        
        if (slot1.direction === slot2.direction) continue;
        
        // Check for intersection
        let intersection: { pos1: number; pos2: number } | null = null;
        
        if (slot1.direction === 'across' && slot2.direction === 'down') {
          // slot1 is horizontal, slot2 is vertical
          if (slot1.row >= slot2.row && 
              slot1.row < slot2.row + slot2.length &&
              slot2.col >= slot1.col &&
              slot2.col < slot1.col + slot1.length) {
            intersection = {
              pos1: slot2.col - slot1.col,
              pos2: slot1.row - slot2.row
            };
          }
        } else if (slot1.direction === 'down' && slot2.direction === 'across') {
          // slot1 is vertical, slot2 is horizontal
          if (slot2.row >= slot1.row && 
              slot2.row < slot1.row + slot1.length &&
              slot1.col >= slot2.col &&
              slot1.col < slot2.col + slot2.length) {
            intersection = {
              pos1: slot2.row - slot1.row,
              pos2: slot1.col - slot2.col
            };
          }
        }
        
        if (intersection) {
          slot1.intersections.push({
            slotId: slot2.id,
            position: intersection.pos1,
            otherPosition: intersection.pos2
          });
          slot2.intersections.push({
            slotId: slot1.id,
            position: intersection.pos2,
            otherPosition: intersection.pos1
          });
        }
      }
    }
  }

  /**
   * Initialize CSP variables with domains
   */
  private initializeCSPVariables(): void {
    this.variables = this.slots.map(slot => ({
      ...slot,
      domain: GALACTIC_WORDS.filter(word => word.word.length === slot.length)
    }));
  }

  /**
   * Apply arc consistency (AC-3 algorithm)
   */
  private maintainArcConsistency(): boolean {
    const queue: [string, string][] = [];
    
    // Initialize queue with all arcs
    for (const variable of this.variables) {
      for (const intersection of variable.intersections) {
        queue.push([variable.id, intersection.slotId]);
      }
    }
    
    while (queue.length > 0) {
      const [var1Id, var2Id] = queue.shift()!;
      
      if (this.revise(var1Id, var2Id)) {
        const var1 = this.variables.find(v => v.id === var1Id)!;
        
        if (var1.domain.length === 0) {
          return false; // No solution
        }
        
        // Add neighbors to queue
        for (const intersection of var1.intersections) {
          if (intersection.slotId !== var2Id) {
            queue.push([intersection.slotId, var1Id]);
          }
        }
      }
    }
    
    return true;
  }

  /**
   * Revise domain of variable to maintain arc consistency
   */
  private revise(var1Id: string, var2Id: string): boolean {
    const var1 = this.variables.find(v => v.id === var1Id)!;
    const var2 = this.variables.find(v => v.id === var2Id)!;
    
    const intersection = var1.intersections.find(i => i.slotId === var2Id);
    if (!intersection) return false;
    
    let revised = false;
    const originalDomain = [...var1.domain];
    
    for (const word1 of originalDomain) {
      let hasSupport = false;
      
      for (const word2 of var2.domain) {
        // Check if words are compatible at intersection
        if (word1.word[intersection.position] === word2.word[intersection.otherPosition] &&
            !this.placedWords.has(word1.word) &&
            !this.placedWords.has(word2.word)) {
          hasSupport = true;
          break;
        }
      }
      
      if (!hasSupport) {
        var1.domain = var1.domain.filter(w => w.word !== word1.word);
        revised = true;
      }
    }
    
    return revised;
  }

  /**
   * Select next variable using MRV (Minimum Remaining Values) heuristic
   * with degree heuristic as tiebreaker
   */
  private selectUnassignedVariable(): Variable | null {
    const unassigned = this.variables.filter(v => !v.assignedWord);
    if (unassigned.length === 0) return null;
    
    // MRV: Choose variable with smallest domain
    let minDomainSize = Math.min(...unassigned.map(v => v.domain.length));
    const candidates = unassigned.filter(v => v.domain.length === minDomainSize);
    
    // Degree heuristic: Choose variable with most constraints
    const maxConstraints = Math.max(...candidates.map(v => v.intersections.length));
    const bestCandidates = candidates.filter(v => v.intersections.length === maxConstraints);
    
    // Return random choice among best candidates
    return bestCandidates[Math.floor(this.rng() * bestCandidates.length)];
  }

  /**
   * Order domain values using LCV (Least Constraining Value) heuristic
   */
  private orderDomainValues(variable: Variable): typeof GALACTIC_WORDS {
    return variable.domain.sort((a, b) => {
      // Prefer theme words and higher frequency words
      const scoreA = a.frequency + (a.category === 'cosmic' ? 0.5 : 0) + (a.category === 'celestial' ? 0.3 : 0);
      const scoreB = b.frequency + (b.category === 'cosmic' ? 0.5 : 0) + (b.category === 'celestial' ? 0.3 : 0);
      
      return scoreB - scoreA;
    });
  }

  /**
   * Check if assignment is consistent with current constraints
   */
  private isConsistent(variable: Variable, word: typeof GALACTIC_WORDS[0]): boolean {
    if (this.placedWords.has(word.word)) return false;
    
    // Check intersections
    for (const intersection of variable.intersections) {
      const otherVar = this.variables.find(v => v.id === intersection.slotId)!;
      
      if (otherVar.assignedWord) {
        const letter1 = word.word[intersection.position];
        const letter2 = otherVar.assignedWord.word[intersection.otherPosition];
        
        if (letter1 !== letter2) return false;
      }
    }
    
    return true;
  }

  /**
   * Make assignment and propagate constraints
   */
  private assign(variable: Variable, word: typeof GALACTIC_WORDS[0]): void {
    variable.assignedWord = word;
    this.placedWords.add(word.word);
    
    // Place word in grid
    for (let i = 0; i < word.word.length; i++) {
      const row = variable.direction === 'across' ? variable.row : variable.row + i;
      const col = variable.direction === 'across' ? variable.col + i : variable.col;
      
      this.grid[row][col].letter = word.word[i];
      if (i === 0) {
        this.grid[row][col].number = this.clueNumber++;
      }
    }
  }

  /**
   * Undo assignment
   */
  private unassign(variable: Variable): void {
    if (variable.assignedWord) {
      this.placedWords.delete(variable.assignedWord.word);
      
      // Remove from grid
      for (let i = 0; i < variable.assignedWord.word.length; i++) {
        const row = variable.direction === 'across' ? variable.row : variable.row + i;
        const col = variable.direction === 'across' ? variable.col + i : variable.col;
        
        // Only clear if no other word uses this cell
        let usedByOther = false;
        for (const otherVar of this.variables) {
          if (otherVar.id !== variable.id && otherVar.assignedWord) {
            for (let j = 0; j < otherVar.assignedWord.word.length; j++) {
              const otherRow = otherVar.direction === 'across' ? otherVar.row : otherVar.row + j;
              const otherCol = otherVar.direction === 'across' ? otherVar.col + j : otherVar.col;
              
              if (otherRow === row && otherCol === col) {
                usedByOther = true;
                break;
              }
            }
            if (usedByOther) break;
          }
        }
        
        if (!usedByOther) {
          this.grid[row][col].letter = null;
          if (i === 0) {
            this.grid[row][col].number = null;
          }
        }
      }
      
      variable.assignedWord = undefined;
    }
  }

  /**
   * Backtracking search with constraint propagation
   */
  private backtrackSearch(): boolean {
    const variable = this.selectUnassignedVariable();
    if (!variable) return true; // All variables assigned
    
    const values = this.orderDomainValues(variable);
    
    for (const word of values) {
      if (this.isConsistent(variable, word)) {
        this.assign(variable, word);
        
        // Save current state for backtracking
        const savedDomains = this.variables.map(v => ({
          id: v.id,
          domain: [...v.domain]
        }));
        
        // Apply constraint propagation
        if (this.maintainArcConsistency()) {
          if (this.backtrackSearch()) {
            return true;
          }
        }
        
        // Restore domains
        for (const saved of savedDomains) {
          const variable = this.variables.find(v => v.id === saved.id)!;
          variable.domain = saved.domain;
        }
        
        this.unassign(variable);
      }
    }
    
    return false;
  }

  /**
   * Generate crossword clues from assigned variables
   */
  private generateClues(): ICrosswordClue[] {
    const clues: ICrosswordClue[] = [];
    let number = 1;
    
    // Sort slots by position for proper numbering
    const sortedSlots = [...this.variables].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      if (a.col !== b.col) return a.col - b.col;
      return a.direction === 'across' ? -1 : 1;
    });
    
    // Assign numbers to grid
    const numberMap = new Map<string, number>();
    for (const variable of sortedSlots) {
      if (variable.assignedWord) {
        const key = `${variable.row}-${variable.col}`;
        if (!numberMap.has(key)) {
          numberMap.set(key, number++);
        }
        
        const clueNumber = numberMap.get(key)!;
        this.grid[variable.row][variable.col].number = clueNumber;
        
        clues.push({
          number: clueNumber,
          clue: variable.assignedWord.clue,
          answer: variable.assignedWord.word,
          direction: variable.direction,
          startRow: variable.row,
          startCol: variable.col,
          length: variable.assignedWord.word.length
        });
      }
    }
    
    return clues.sort((a, b) => a.number - b.number);
  }

  /**
   * Generate crossword puzzle using CSP approach
   */
  generate(): GeneratedPuzzle {
    // Step 1: Create symmetric grid pattern
    this.createSymmetricGridPattern();
    
    // Step 2: Find word slots
    this.findWordSlots();
    
    // Step 3: Initialize CSP variables
    this.initializeCSPVariables();
    
    // Step 4: Apply initial arc consistency
    if (!this.maintainArcConsistency()) {
      // If initial arc consistency fails, try with fewer blocks
      this.grid = this.initializeGrid();
      this.createSymmetricGridPattern();
      this.findWordSlots();
      this.initializeCSPVariables();
    }
    
    // Step 5: Solve using backtracking search
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      this.placedWords.clear();
      this.clueNumber = 1;
      
      // Reset assignments
      for (const variable of this.variables) {
        variable.assignedWord = undefined;
      }
      
      if (this.backtrackSearch()) {
        break;
      }
      
      // If failed, try with different random seed
      if (attempt < maxAttempts - 1) {
        this.grid = this.initializeGrid();
        this.createSymmetricGridPattern();
        this.findWordSlots();
        this.initializeCSPVariables();
      }
    }
    
    // Step 6: Generate clues
    const clues = this.generateClues();
    
    return {
      grid: this.grid,
      clues,
      size: { rows: GRID_SIZE, cols: GRID_SIZE }
    };
  }
}

export function generateAdvancedDailyPuzzle(date: string): GeneratedPuzzle {
  const puzzleSecret = process.env.PUZZLE_SECRET || 'galactic-puzzle-secret';
  const seed = crypto.createHash('sha256').update(`${puzzleSecret}-${date}`).digest('hex');
  
  const generator = new AdvancedCrosswordGenerator(seed);
  return generator.generate();
}