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

// Word lists for puzzle generation
const WORD_LIST = [
  { word: 'GALAXY', clue: 'Spiral or elliptical star system' },
  { word: 'NEBULA', clue: 'Interstellar cloud of dust and gas' },
  { word: 'COSMOS', clue: 'The universe seen as a well-ordered whole' },
  { word: 'STELLAR', clue: 'Relating to stars' },
  { word: 'ORBIT', clue: 'Curved path around a celestial body' },
  { word: 'COMET', clue: 'Icy celestial body with a tail' },
  { word: 'PLANET', clue: 'Celestial body orbiting a star' },
  { word: 'SOLAR', clue: 'Relating to the sun' },
  { word: 'LUNAR', clue: 'Relating to the moon' },
  { word: 'METEOR', clue: 'Space rock entering atmosphere' },
  { word: 'QUASAR', clue: 'Extremely luminous active galactic nucleus' },
  { word: 'PULSAR', clue: 'Highly magnetized rotating neutron star' },
  { word: 'VOID', clue: 'Large empty space between galaxies' },
  { word: 'STAR', clue: 'Luminous sphere of plasma' },
  { word: 'MOON', clue: 'Natural satellite of Earth' },
  { word: 'MARS', clue: 'The red planet' },
  { word: 'VENUS', clue: 'Second planet from the sun' },
  { word: 'EARTH', clue: 'Third planet from the sun' },
  { word: 'SPACE', clue: 'The final frontier' },
  { word: 'COSMIC', clue: 'Relating to the universe' },
  { word: 'ATOM', clue: 'Basic unit of matter' },
  { word: 'ENERGY', clue: 'Capacity to do work' },
  { word: 'LIGHT', clue: 'Electromagnetic radiation' },
  { word: 'DARK', clue: 'Absence of light' },
  { word: 'NOVA', clue: 'Stellar explosion' },
  { word: 'ALIEN', clue: 'Extraterrestrial being' },
  { word: 'ROCKET', clue: 'Vehicle for space travel' },
  { word: 'GRAVITY', clue: 'Force that attracts objects' },
  { word: 'TIME', clue: 'Fourth dimension' },
  { word: 'WARP', clue: 'Distortion in spacetime' }
];

const GRID_SIZE = 15;

export interface GeneratedPuzzle {
  grid: IPuzzleCell[][];
  clues: ICrosswordClue[];
  size: { rows: number; cols: number };
}

class CrosswordGenerator {
  private grid: IPuzzleCell[][];
  private clues: ICrosswordClue[];
  private usedWords: Set<string>;
  private rng: () => number;

  constructor(seed: string) {
    this.grid = this.initializeGrid();
    this.clues = [];
    this.usedWords = new Set();
    this.rng = this.createSeededRNG(seed);
  }

  private createSeededRNG(seed: string): () => number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use hash as seed for a simple LCG
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

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private canPlaceWord(word: string, row: number, col: number, direction: 'across' | 'down'): boolean {
    const length = word.length;
    
    // Check if word fits in grid
    if (direction === 'across' && col + length > GRID_SIZE) return false;
    if (direction === 'down' && row + length > GRID_SIZE) return false;

    // Check for conflicts and intersections
    for (let i = 0; i < length; i++) {
      const currentRow = direction === 'across' ? row : row + i;
      const currentCol = direction === 'across' ? col + i : col;
      const cell = this.grid[currentRow][currentCol];

      if (cell.isBlocked) return false;
      
      if (cell.letter && cell.letter !== word[i]) return false;
    }

    return true;
  }

  private placeWord(word: string, clue: string, row: number, col: number, direction: 'across' | 'down', number: number): void {
    for (let i = 0; i < word.length; i++) {
      const currentRow = direction === 'across' ? row : row + i;
      const currentCol = direction === 'across' ? col + i : col;
      
      this.grid[currentRow][currentCol].letter = word[i];
      if (i === 0) {
        this.grid[currentRow][currentCol].number = number;
      }
    }

    this.clues.push({
      number,
      clue,
      answer: word,
      direction,
      startRow: row,
      startCol: col,
      length: word.length
    });

    this.usedWords.add(word);
  }

  private addBlocks(): void {
    // Add some strategic blocked cells to make the puzzle more interesting
    const numBlocks = Math.floor(this.rng() * 20) + 10; // 10-30 blocks
    
    for (let i = 0; i < numBlocks; i++) {
      const row = Math.floor(this.rng() * GRID_SIZE);
      const col = Math.floor(this.rng() * GRID_SIZE);
      
      // Don't block cells that already have letters
      if (!this.grid[row][col].letter) {
        this.grid[row][col].isBlocked = true;
      }
    }
  }

  generate(): GeneratedPuzzle {
    const shuffledWords = this.shuffleArray(WORD_LIST);
    let clueNumber = 1;
    let placedWords = 0;
    const maxWords = 20; // Limit number of words for reasonable puzzle size

    // Try to place words
    for (const wordData of shuffledWords) {
      if (placedWords >= maxWords) break;
      
      const { word, clue } = wordData;
      if (this.usedWords.has(word)) continue;

      // Try different positions and directions
      const directions: ('across' | 'down')[] = ['across', 'down'];
      const shuffledDirections = this.shuffleArray(directions);

      let placed = false;
      for (const direction of shuffledDirections) {
        if (placed) break;

        // Try multiple random positions
        for (let attempt = 0; attempt < 100; attempt++) {
          const maxRow = direction === 'down' ? GRID_SIZE - word.length : GRID_SIZE - 1;
          const maxCol = direction === 'across' ? GRID_SIZE - word.length : GRID_SIZE - 1;
          
          const row = Math.floor(this.rng() * (maxRow + 1));
          const col = Math.floor(this.rng() * (maxCol + 1));

          if (this.canPlaceWord(word, row, col, direction)) {
            this.placeWord(word, clue, row, col, direction, clueNumber);
            clueNumber++;
            placedWords++;
            placed = true;
            break;
          }
        }
      }
    }

    // Add blocked cells
    this.addBlocks();

    // Sort clues by number
    this.clues.sort((a, b) => a.number - b.number);

    return {
      grid: this.grid,
      clues: this.clues,
      size: { rows: GRID_SIZE, cols: GRID_SIZE }
    };
  }
}

export function generateDailyPuzzle(date: string): GeneratedPuzzle {
  const puzzleSecret = process.env.PUZZLE_SECRET || 'default-secret';
  const seed = crypto.createHash('sha256').update(`${puzzleSecret}-${date}`).digest('hex');
  
  const generator = new CrosswordGenerator(seed);
  return generator.generate();
}