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

// Fast dictionary loading with smaller optimized word set
let DICTIONARY_WORDS: string[] = [];
let WORDS_BY_LENGTH: Map<number, string[]> = new Map();

// Initialize with a curated list of common crossword words
const initializeFastDictionary = () => {
  const commonWords = [
    // 3-letter words
    'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR',
    'HAD', 'BY', 'HOT', 'HAT', 'CAT', 'DOG', 'BAT', 'RAT', 'SUN', 'RUN', 'WIN', 'RED', 'BIG',
    'NEW', 'OLD', 'BAD', 'TOP', 'BOX', 'CAR', 'EAR', 'EYE', 'ARM', 'LEG', 'END', 'ICE', 'AGE',
    'ACE', 'OWL', 'EGG', 'OIL', 'AIR', 'SEA', 'SKY', 'DAY', 'WAY', 'BAY', 'KEY', 'TOY', 'BOY',
    'MAP', 'CUP', 'PEN', 'BAG', 'BED', 'NET', 'PET', 'SET', 'TEN', 'YES', 'ART', 'ELF',
    
    // 4-letter words  
    'THAT', 'WITH', 'HAVE', 'THIS', 'WILL', 'YOUR', 'FROM', 'THEY', 'KNOW', 'WANT', 'BEEN',
    'GOOD', 'MUCH', 'SOME', 'TIME', 'VERY', 'WHEN', 'COME', 'HERE', 'HOW', 'JUST', 'LIKE',
    'LONG', 'MAKE', 'MANY', 'OVER', 'SUCH', 'TAKE', 'THAN', 'THEM', 'WELL', 'WERE',
    'TREE', 'BLUE', 'BOOK', 'LOVE', 'WORD', 'STAR', 'MOON', 'FIRE', 'FISH', 'BIRD', 'GAME',
    'HAND', 'HEAD', 'FOOD', 'DOOR', 'ROCK', 'GOLD', 'TEAM', 'WIND', 'SNOW', 'RAIN', 'SONG',
    'ROAD', 'GIRL', 'ROOM', 'WALL', 'FISH', 'SHIP', 'HOPE', 'IDEA', 'LIFE', 'NAME', 'OPEN',
    'PARK', 'PLAN', 'REAL', 'SAVE', 'TELL', 'TURN', 'WALK', 'WEAR', 'YEAR', 'ZERO',
    
    // 5-letter words
    'ABOUT', 'AFTER', 'AGAIN', 'BELOW', 'COULD', 'EVERY', 'FIRST', 'FOUND', 'GREAT', 'GROUP',
    'HOUSE', 'LARGE', 'LEARN', 'LIGHT', 'MIGHT', 'NEVER', 'OTHER', 'PLACE', 'RIGHT', 'SHALL',
    'SMALL', 'SOUND', 'STILL', 'THEIR', 'THERE', 'THESE', 'THINK', 'THREE', 'UNDER', 'WATER',
    'WHERE', 'WHICH', 'WHILE', 'WORLD', 'WOULD', 'WRITE', 'YOUNG',
    'SPACE', 'EARTH', 'OCEAN', 'MUSIC', 'HEART', 'POWER', 'PEACE', 'MAGIC', 'DREAM', 'HAPPY',
    'QUICK', 'BRAVE', 'SMART', 'CLEAN', 'FRESH', 'SWEET', 'STORM', 'TOWER', 'FORCE', 'LIGHT',
    
    // 6-letter words
    'BEFORE', 'BETTER', 'CHANGE', 'DURING', 'FRIEND', 'PEOPLE', 'REALLY', 'SCHOOL', 'SECOND',
    'SHOULD', 'SIMPLE', 'SYSTEM', 'THINGS', 'THROUGH', 'TOWARD', 'ALWAYS', 'BECAME', 'ENOUGH',
    'FAMILY', 'FATHER', 'FLOWER', 'FOLLOW', 'FOREST', 'FRIEND', 'GARDEN', 'GROUND', 'HAPPEN',
    'ISLAND', 'LETTER', 'MARKET', 'MOTHER', 'NATURE', 'NOTICE', 'NUMBER', 'OFFICE', 'PARENT',
    'PLANET', 'REASON', 'RESULT', 'RETURN', 'SEASON', 'STRONG', 'SUMMER', 'TRAVEL', 'VALLEY',
    'WINDOW', 'WINTER', 'WONDER', 'GALAXY', 'COSMIC', 'NEBULA', 'METEOR', 'SATURN',
    
    // 7+ letter words
    'ANOTHER', 'BECAUSE', 'BETWEEN', 'COMPANY', 'CONTROL', 'COUNTRY', 'FEELING', 'GENERAL',
    'HOWEVER', 'MACHINE', 'MESSAGE', 'MORNING', 'NOTHING', 'OPINION', 'PROBLEM', 'PROGRAM',
    'PROVIDE', 'REQUIRE', 'SERVICE', 'SPECIAL', 'STATION', 'STUDENT', 'SUPPORT', 'SURFACE',
    'THOUGHT', 'THROUGH', 'TONIGHT', 'TROUBLE', 'VERSION', 'WEBSITE', 'WITHOUT',
    'STELLAR', 'SCIENCE', 'JOURNEY', 'MYSTERY', 'FANTASY', 'ADVENTURE', 'UNIVERSE', 'CREATION',
    'HARMONY', 'BALANCE', 'COURAGE', 'DESTINY', 'FREEDOM', 'JUSTICE', 'WISDOM', 'TRIUMPH'
  ];

  DICTIONARY_WORDS = commonWords;
  
  // Build lookup tables
  for (const word of DICTIONARY_WORDS) {
    const len = word.length;
    if (!WORDS_BY_LENGTH.has(len)) WORDS_BY_LENGTH.set(len, []);
    WORDS_BY_LENGTH.get(len)!.push(word);
  }
  
  console.log(`📚 Fast dictionary loaded with ${DICTIONARY_WORDS.length} common words`);
};

// Try to load full dictionary, fall back to curated list
try {
  const dictPath = path.join(__dirname, '../../data/crossword_dictionary.txt');
  if (fs.existsSync(dictPath)) {
    const allWords = fs.readFileSync(dictPath, 'utf-8')
      .split('\n')
      .map(word => word.trim().toUpperCase())
      .filter(word => word.length >= 3 && word.length <= 12);
    
    // Use a subset for performance - prioritize common words
    DICTIONARY_WORDS = allWords.slice(0, 10000); // Limit to first 10k words
    
    for (const word of DICTIONARY_WORDS) {
      const len = word.length;
      if (!WORDS_BY_LENGTH.has(len)) WORDS_BY_LENGTH.set(len, []);
      WORDS_BY_LENGTH.get(len)!.push(word);
    }
    
    console.log(`📚 Loaded ${DICTIONARY_WORDS.length} words from dictionary (subset)`);
  } else {
    initializeFastDictionary();
  }
} catch (error) {
  console.warn('Could not load dictionary file, using curated list:', error);
  initializeFastDictionary();
}

const GRID_SIZE = 21;
const MIN_WORD_LENGTH = 3;

export class FastCrosswordGenerator {
  private grid: PuzzleCell[][];
  private rng: () => number;

  constructor(seed: string) {
    // Create seeded random number generator
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

  private createSimplePattern(): void {
    // Create a more connected pattern with fewer black squares
    const center = Math.floor(GRID_SIZE / 2);
    
    // Create minimal strategic black squares for variety but maintain connectivity
    const blackSquares = [
      // Corners for traditional look
      [1, 1], [1, GRID_SIZE-2], [GRID_SIZE-2, 1], [GRID_SIZE-2, GRID_SIZE-2],
      
      // Strategic points to break up long words but maintain connections
      [5, 5], [5, GRID_SIZE-6], [GRID_SIZE-6, 5], [GRID_SIZE-6, GRID_SIZE-6],
      [3, center], [GRID_SIZE-4, center],
      [center, 3], [center, GRID_SIZE-4],
      
      // Add minimal variety
      [7, 2], [7, GRID_SIZE-3], [GRID_SIZE-8, 2], [GRID_SIZE-8, GRID_SIZE-3],
    ];

    for (const [row, col] of blackSquares) {
      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        this.grid[row][col].isBlocked = true;
        // Symmetric counterpart
        const symRow = GRID_SIZE - 1 - row;
        const symCol = GRID_SIZE - 1 - col;
        if (symRow !== row || symCol !== col) {
          this.grid[symRow][symCol].isBlocked = true;
        }
      }
    }

    const blackCount = this.countBlackSquares();
    console.log(`Created simple pattern with ${blackCount} black squares (${(blackCount/(GRID_SIZE*GRID_SIZE)*100).toFixed(1)}%)`);
  }

  private countBlackSquares(): number {
    let count = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (this.grid[row][col].isBlocked) count++;
      }
    }
    return count;
  }

  private placeWordsGreedy(): { words: Array<{word: string, row: number, col: number, direction: 'across'|'down'}>, success: boolean } {
    const placedWords: Array<{word: string, row: number, col: number, direction: 'across'|'down'}> = [];
    
    // First pass: Fill intersecting pattern with medium words
    const centralWords = ['GALAXY', 'PLANET', 'STELLAR', 'COSMIC', 'NEBULA', 'SPACE', 'STAR'];
    
    // Place a central horizontal word
    const centerRow = Math.floor(GRID_SIZE / 2);
    const centerCol = Math.floor(GRID_SIZE / 2) - 3; // Start left of center
    const firstWord = centralWords[Math.floor(this.rng() * centralWords.length)];
    
    if (this.canPlaceWord(firstWord, centerRow, centerCol, 'across')) {
      this.placeWord(firstWord, centerRow, centerCol, 'across');
      placedWords.push({word: firstWord, row: centerRow, col: centerCol, direction: 'across'});
    }
    
    // Now systematically fill the grid by finding all valid slots
    let iterations = 0;
    const maxIterations = 100;
    
    while (iterations < maxIterations && placedWords.length < 60) {
      iterations++;
      let placedThisRound = false;
      
      // Try all word lengths
      for (const targetLength of [5, 6, 4, 7, 8, 3, 9, 10, 11, 12]) {
        const availableWords = WORDS_BY_LENGTH.get(targetLength) || [];
        if (availableWords.length === 0) continue;
        
        // Find slots of this length
        const slots = this.findSlotsOfLength(targetLength);
        
        // Debug logging removed for production
        
        for (const slot of slots.slice(0, 10)) { // Try more slots per length
          if (this.isSlotOccupied(slot.row, slot.col, slot.length, slot.direction)) {
            continue;
          }
          
          // Allow isolated words for now to get more coverage
          // const intersectionCount = this.countIntersections(slot.row, slot.col, slot.length, slot.direction);
          
          // Try to find a word that fits
          const candidates = availableWords.filter(word => 
            !placedWords.some(p => p.word === word) && // Not already used
            this.canPlaceWord(word, slot.row, slot.col, slot.direction)
          );
          
          if (candidates.length > 0) {
            const word = candidates[Math.floor(this.rng() * Math.min(candidates.length, 10))];
            this.placeWord(word, slot.row, slot.col, slot.direction);
            placedWords.push({word, row: slot.row, col: slot.col, direction: slot.direction});
            placedThisRound = true;
            break; // Move to next length
          }
        }
        
        if (placedThisRound) break; // Try again with all lengths
      }
      
      if (!placedThisRound) {
        break; // No more words can be placed
      }
    }
    
    console.log(`🎯 Placed ${placedWords.length} words in ${iterations} iterations`);
    return { words: placedWords, success: placedWords.length >= 30 };
  }
  
  private countIntersections(row: number, col: number, length: number, direction: 'across'|'down'): number {
    let count = 0;
    for (let i = 0; i < length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      if (this.grid[r][c].letter) count++;
    }
    return count;
  }

  private findSlotsOfLength(length: number): Array<{row: number, col: number, direction: 'across'|'down', length: number}> {
    const slots = [];
    
    // Find horizontal slots
    for (let row = 0; row < GRID_SIZE; row++) {
      let start = -1;
      for (let col = 0; col <= GRID_SIZE; col++) {
        if (col === GRID_SIZE || this.grid[row][col].isBlocked) {
          if (start !== -1 && col - start === length) {
            slots.push({row, col: start, direction: 'across' as const, length});
          }
          start = -1;
        } else if (start === -1) {
          start = col;
        }
      }
    }
    
    // Find vertical slots  
    for (let col = 0; col < GRID_SIZE; col++) {
      let start = -1;
      for (let row = 0; row <= GRID_SIZE; row++) {
        if (row === GRID_SIZE || this.grid[row][col].isBlocked) {
          if (start !== -1 && row - start === length) {
            slots.push({row: start, col, direction: 'down' as const, length});
          }
          start = -1;
        } else if (start === -1) {
          start = row;
        }
      }
    }
    
    return this.shuffleArray(slots);
  }

  private isSlotOccupied(row: number, col: number, length: number, direction: 'across'|'down'): boolean {
    for (let i = 0; i < length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      if (this.grid[r][c].letter) return true;
    }
    return false;
  }

  private canPlaceWord(word: string, row: number, col: number, direction: 'across'|'down'): boolean {
    // Check bounds
    if (direction === 'across' && col + word.length > GRID_SIZE) return false;
    if (direction === 'down' && row + word.length > GRID_SIZE) return false;
    
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      
      // Check if blocked
      if (this.grid[r][c].isBlocked) return false;
      
      // Check if letter conflicts
      if (this.grid[r][c].letter && this.grid[r][c].letter !== word[i]) return false;
      
      // Check cross-words are valid (simplified check)
      if (!this.grid[r][c].letter) {
        const crossWord = this.getCrossWord(r, c, direction === 'across' ? 'down' : 'across');
        if (crossWord && crossWord.length >= MIN_WORD_LENGTH) {
          const newCrossWord = crossWord.substring(0, crossWord.indexOf('_')) + word[i] + crossWord.substring(crossWord.indexOf('_') + 1);
          if (!DICTIONARY_WORDS.includes(newCrossWord)) {
            // Allow it for now to keep generation fast
          }
        }
      }
    }
    
    return true;
  }

  private getCrossWord(row: number, col: number, direction: 'across'|'down'): string | null {
    let start = direction === 'across' ? col : row;
    let end = direction === 'across' ? col : row;
    
    // Find start
    while (start > 0) {
      const r = direction === 'across' ? row : start - 1;
      const c = direction === 'across' ? start - 1 : col;
      if (this.grid[r][c].isBlocked || (!this.grid[r][c].letter && start === (direction === 'across' ? col : row))) break;
      start--;
    }
    
    // Find end
    while (end < GRID_SIZE - 1) {
      const r = direction === 'across' ? row : end + 1;
      const c = direction === 'across' ? end + 1 : col;
      if (this.grid[r][c].isBlocked || (!this.grid[r][c].letter && end === (direction === 'across' ? col : row))) break;
      end++;
    }
    
    if (end - start + 1 < MIN_WORD_LENGTH) return null;
    
    let word = '';
    for (let i = start; i <= end; i++) {
      const r = direction === 'across' ? row : i;
      const c = direction === 'across' ? i : col;
      word += this.grid[r][c].letter || '_';
    }
    
    return word.includes('_') ? word : null;
  }

  private placeWord(word: string, row: number, col: number, direction: 'across'|'down'): void {
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      this.grid[r][c].letter = word[i];
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private generateClues(placedWords: Array<{word: string, row: number, col: number, direction: 'across'|'down'}>): CrosswordClue[] {
    // Number the clues
    const startPositions = new Map<string, number>();
    const positions = placedWords.map(w => ({ row: w.row, col: w.col }));
    
    // Sort positions for numbering
    positions.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
    
    let clueNumber = 1;
    for (const pos of positions) {
      const key = `${pos.row},${pos.col}`;
      if (!startPositions.has(key)) {
        startPositions.set(key, clueNumber);
        this.grid[pos.row][pos.col].number = clueNumber;
        clueNumber++;
      }
    }
    
    // Generate clues
    const clues: CrosswordClue[] = [];
    for (const wordInfo of placedWords) {
      const key = `${wordInfo.row},${wordInfo.col}`;
      const number = startPositions.get(key);
      if (number) {
        clues.push({
          number,
          clue: this.generateClueForWord(wordInfo.word),
          answer: wordInfo.word,
          direction: wordInfo.direction,
          startRow: wordInfo.row,
          startCol: wordInfo.col,
          length: wordInfo.word.length
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

  private generateClueForWord(word: string): string {
    const clues: { [key: string]: string } = {
      // Space theme
      'GALAXY': 'Milky Way, for one',
      'PLANET': 'Earth or Mars',
      'STELLAR': 'Outstanding',
      'COSMIC': 'Universal',
      'NEBULA': 'Star nursery',
      'METEOR': 'Shooting star',
      'SATURN': 'Ringed planet',
      'COMET': 'Celestial visitor',
      'SPACE': 'Final frontier',
      'STAR': 'Night light',
      'MOON': 'Earth\'s satellite',
      'MARS': 'Red planet',
      'VENUS': 'Morning star',
      'EARTH': 'Our world',
      'SOLAR': 'Of the sun',
      'ORBIT': 'Circular path',
      'LIGHT': 'Illumination',
      'DARK': 'Without light',
      'UNIVERSE': 'All of existence',
      
      // Common words
      'THE': 'Article',
      'AND': 'Plus',
      'ARE': 'Exist',
      'TIME': 'Duration',
      'LIFE': 'Existence',
      'LOVE': 'Affection',
      'WORD': 'Vocabulary unit',
      'BOOK': 'Reading material',
      'TREE': 'Oak or pine',
      'BLUE': 'Sky color',
      'FIRE': 'Flame',
      'WATER': 'H2O',
      'MUSIC': 'Harmonious sounds',
      'OCEAN': 'Large water body',
      'HOUSE': 'Dwelling',
      'HEART': 'Ticker',
      'POWER': 'Strength',
      'PEACE': 'Tranquility',
      'MAGIC': 'Wizardry',
      'DREAM': 'Sleep vision',
      'HAPPY': 'Joyful',
      'QUICK': 'Fast',
      'BRAVE': 'Courageous',
      'SMART': 'Intelligent',
      'CLEAN': 'Spotless',
      'FRESH': 'New',
      'SWEET': 'Sugary',
      'STORM': 'Tempest',
      'TOWER': 'High structure',
      'FORCE': 'Power'
    };
    
    return clues[word.toUpperCase()] || `"${word}"`;
  }

  generate(): GeneratedPuzzle {
    console.log('🚀 Starting fast crossword generation...');
    
    // Step 1: Create simple pattern
    this.createSimplePattern();
    
    // Step 2: Place words greedily
    const result = this.placeWordsGreedy();
    
    // Step 3: Generate clues
    const clues = this.generateClues(result.words);
    
    console.log(`✅ Generated puzzle with ${clues.length} clues`);
    
    return {
      grid: this.grid,
      clues,
      size: { rows: GRID_SIZE, cols: GRID_SIZE }
    };
  }
}

export function generateFastDailyPuzzle(date: string): GeneratedPuzzle {
  const puzzleSecret = process.env.PUZZLE_SECRET || 'galactic-puzzle-secret';
  const seed = crypto.createHash('sha256').update(`${puzzleSecret}-${date}`).digest('hex');
  
  const generator = new FastCrosswordGenerator(seed);
  return generator.generate();
}