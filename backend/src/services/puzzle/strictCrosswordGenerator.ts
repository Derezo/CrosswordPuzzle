import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { parse } from "csv-parse/sync";

export interface PuzzleCell {
  letter: string;
  number: number | null;
  isBlocked: boolean;
}

export interface CrosswordClue {
  number: number;
  clue: string;
  answer: string;
  direction: "across" | "down";
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
  is_common_english: boolean;
  obscure: boolean;
  categories?: string;
}

interface WordPlacement {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "across" | "down";
  intersections: Array<{ row: number; col: number }>;
}

const GRID_SIZE = 15;
const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 15;
const TARGET_BLACK_PERCENTAGE = 15; // Aim for ~15% black squares

export class StrictCrosswordGenerator {
  private dictionary: DictionaryEntry[] = [];
  private wordsByLength: Map<number, DictionaryEntry[]> = new Map();
  private wordSet: Set<string> = new Set();
  private grid: PuzzleCell[][] = [];
  private placedWords: WordPlacement[] = [];
  private usedWords: Set<string> = new Set();
  private rng: () => number;
  private categoryFilter: string | null = null;

  constructor(seed: string, categoryFilter?: string) {
    const hash = crypto.createHash("sha256").update(seed).digest();
    let seedInt = hash.readUInt32BE(0);
    this.rng = () => {
      seedInt = (seedInt * 11035155 + 12345) & 0x7fffffff;
      return seedInt / 0x7fffffff;
    };

    this.categoryFilter = categoryFilter || null;
    this.loadDictionary();
  }

  private loadDictionary(): void {
    const csvPath = path.join(
      __dirname,
      "../../../src/data/crossword_dictionary_with_clues.csv",
    );
    const csvContent = fs.readFileSync(csvPath, "utf-8");

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true, // Allow records with different column counts
    });

    this.dictionary = records
      .filter((record: any) => {
        const word = record.word?.toUpperCase();
        let matchesCategory = true;
        
        // If category filter is provided, check if word belongs to that category
        if (this.categoryFilter && record.categories) {
          const categories = record.categories.toLowerCase().split(',').map((cat: string) => cat.trim());
          matchesCategory = categories.includes(this.categoryFilter.toLowerCase());
        }
        
        return (
          word &&
          word.length >= MIN_WORD_LENGTH &&
          word.length <= MAX_WORD_LENGTH &&
          /^[A-Z]+$/.test(word) &&
          record.clue &&
          record.obscure !== "True" && record.obscure !== true && // Exclude obscure words
          matchesCategory // Include category filter
        );
      })
      .map((record: any) => ({
        word: record.word.toUpperCase(),
        clue: record.clue,
        is_common_english: record.is_common_english === "True",
        obscure: record.obscure === "True" || record.obscure === true,
        categories: record.categories,
      }));

    // Remove duplicates, prioritizing common words
    const wordMap = new Map<string, DictionaryEntry>();
    for (const entry of this.dictionary) {
      const existing = wordMap.get(entry.word);
      if (
        !existing ||
        (entry.is_common_english && !existing.is_common_english)
      ) {
        wordMap.set(entry.word, entry);
      }
      this.wordSet.add(entry.word);
    }
    this.dictionary = Array.from(wordMap.values());

    // Build index by length and prioritize common words
    for (const entry of this.dictionary) {
      const len = entry.word.length;
      if (!this.wordsByLength.has(len)) {
        this.wordsByLength.set(len, []);
      }
      this.wordsByLength.get(len)!.push(entry);
    }

    // Sort by commonality
    for (const [len, words] of this.wordsByLength) {
      words.sort((a, b) => {
        if (a.is_common_english && !b.is_common_english) return -1;
        if (!a.is_common_english && b.is_common_english) return 1;
        return 0;
      });
    }

    console.log(`📚 Loaded ${this.dictionary.length} words${this.categoryFilter ? ` for category: ${this.categoryFilter}` : ''}`);
  }

  private initializeGrid(): void {
    this.grid = Array(GRID_SIZE)
      .fill(null)
      .map(() =>
        Array(GRID_SIZE)
          .fill(null)
          .map(() => ({
            letter: "",
            number: null,
            isBlocked: false,
          })),
      );
    this.placedWords = [];
    this.usedWords.clear();
  }

  private canPlaceWord(
    word: string,
    row: number,
    col: number,
    direction: "across" | "down",
  ): { valid: boolean; intersections: Array<{ row: number; col: number }> } {
    // Check bounds
    if (row < 0 || col < 0) return { valid: false, intersections: [] };
    if (direction === "across" && col + word.length > GRID_SIZE)
      return { valid: false, intersections: [] };
    if (direction === "down" && row + word.length > GRID_SIZE)
      return { valid: false, intersections: [] };

    const intersections: Array<{ row: number; col: number }> = [];

    // Check each letter position
    for (let i = 0; i < word.length; i++) {
      const r = direction === "across" ? row : row + i;
      const c = direction === "across" ? col + i : col;

      // Can't place on black square
      if (this.grid[r][c].isBlocked) return { valid: false, intersections: [] };

      // Check for letter conflicts
      if (this.grid[r][c].letter) {
        if (this.grid[r][c].letter !== word[i]) {
          return { valid: false, intersections: [] };
        }
        intersections.push({ row: r, col: c });
      }
    }

    // Check word boundaries - must have black squares or edges
    if (direction === "across") {
      // Check before
      if (
        col > 0 &&
        !this.grid[row][col - 1].isBlocked &&
        this.grid[row][col - 1].letter
      ) {
        return { valid: false, intersections: [] };
      }
      // Check after
      if (
        col + word.length < GRID_SIZE &&
        !this.grid[row][col + word.length].isBlocked &&
        this.grid[row][col + word.length].letter
      ) {
        return { valid: false, intersections: [] };
      }
    } else {
      // Check before
      if (
        row > 0 &&
        !this.grid[row - 1][col].isBlocked &&
        this.grid[row - 1][col].letter
      ) {
        return { valid: false, intersections: [] };
      }
      // Check after
      if (
        row + word.length < GRID_SIZE &&
        !this.grid[row + word.length][col].isBlocked &&
        this.grid[row + word.length][col].letter
      ) {
        return { valid: false, intersections: [] };
      }
    }

    // First word doesn't need intersections
    if (this.placedWords.length === 0) {
      return { valid: true, intersections };
    }

    // Other words must have at least one intersection
    if (intersections.length === 0) {
      return { valid: false, intersections: [] };
    }

    return { valid: true, intersections };
  }

  private placeWord(
    entry: DictionaryEntry,
    row: number,
    col: number,
    direction: "across" | "down",
    intersections: Array<{ row: number; col: number }>,
  ): void {
    // Place letters
    for (let i = 0; i < entry.word.length; i++) {
      const r = direction === "across" ? row : row + i;
      const c = direction === "across" ? col + i : col;
      this.grid[r][c].letter = entry.word[i];
    }

    // Add word boundaries (black squares)
    if (direction === "across") {
      if (col > 0 && !this.grid[row][col - 1].letter) {
        this.grid[row][col - 1].isBlocked = true;
      }
      if (
        col + entry.word.length < GRID_SIZE &&
        !this.grid[row][col + entry.word.length].letter
      ) {
        this.grid[row][col + entry.word.length].isBlocked = true;
      }
    } else {
      if (row > 0 && !this.grid[row - 1][col].letter) {
        this.grid[row - 1][col].isBlocked = true;
      }
      if (
        row + entry.word.length < GRID_SIZE &&
        !this.grid[row + entry.word.length][col].letter
      ) {
        this.grid[row + entry.word.length][col].isBlocked = true;
      }
    }

    this.placedWords.push({
      word: entry.word,
      clue: entry.clue,
      row,
      col,
      direction,
      intersections,
    });

    this.usedWords.add(entry.word);
  }

  private findBestCandidates(targetLength?: number): DictionaryEntry[] {
    const candidates: DictionaryEntry[] = [];

    if (targetLength && this.wordsByLength.has(targetLength)) {
      candidates.push(...this.wordsByLength.get(targetLength)!);
    } else {
      // Get words of various lengths
      for (let len = 4; len <= 10; len++) {
        const words = this.wordsByLength.get(len) || [];
        candidates.push(...words.slice(0, 100)); // Take top 100 of each length
      }
    }

    // Filter out used words and shuffle
    return candidates
      .filter((entry) => !this.usedWords.has(entry.word))
      .sort(() => this.rng() - 0.5);
  }

  private findAllPlacements(entry: DictionaryEntry): Array<{
    row: number;
    col: number;
    direction: "across" | "down";
    intersections: Array<{ row: number; col: number }>;
    score: number;
  }> {
    const placements: Array<{
      row: number;
      col: number;
      direction: "across" | "down";
      intersections: Array<{ row: number; col: number }>;
      score: number;
    }> = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        for (const direction of ["across", "down"] as const) {
          const result = this.canPlaceWord(entry.word, r, c, direction);
          if (result.valid) {
            // Calculate placement score
            let score = result.intersections.length * 10; // Prefer more intersections

            // Prefer central positions for first words
            if (this.placedWords.length < 5) {
              const centerDist =
                Math.abs(r - GRID_SIZE / 2) + Math.abs(c - GRID_SIZE / 2);
              score -= centerDist;
            }

            placements.push({
              row: r,
              col: c,
              direction,
              intersections: result.intersections,
              score,
            });
          }
        }
      }
    }

    return placements.sort((a, b) => b.score - a.score);
  }

  private wouldCreateInvalidWord(
    entry: DictionaryEntry,
    row: number,
    col: number,
    direction: "across" | "down",
  ): boolean {
    // Temporarily place the word
    const tempGrid = this.grid.map((row) => row.map((cell) => ({ ...cell })));

    for (let i = 0; i < entry.word.length; i++) {
      const r = direction === "across" ? row : row + i;
      const c = direction === "across" ? col + i : col;
      tempGrid[r][c].letter = entry.word[i];
    }

    // Check all perpendicular words that would be created
    if (direction === "across") {
      // Check each letter for vertical words
      for (let i = 0; i < entry.word.length; i++) {
        const c = col + i;

        // Find vertical word boundaries
        let startR = row;
        let endR = row;

        // Find start
        while (
          startR > 0 &&
          !tempGrid[startR - 1][c].isBlocked &&
          tempGrid[startR - 1][c].letter
        ) {
          startR--;
        }

        // Find end
        while (
          endR < GRID_SIZE - 1 &&
          !tempGrid[endR + 1][c].isBlocked &&
          tempGrid[endR + 1][c].letter
        ) {
          endR++;
        }

        // Extract word
        if (endR > startR) {
          let word = "";
          for (let r = startR; r <= endR; r++) {
            word += tempGrid[r][c].letter;
          }

          if (word.length >= 2 && !this.wordSet.has(word)) {
            return true; // Would create invalid word
          }
        }
      }
    } else {
      // Check each letter for horizontal words
      for (let i = 0; i < entry.word.length; i++) {
        const r = row + i;

        // Find horizontal word boundaries
        let startC = col;
        let endC = col;

        // Find start
        while (
          startC > 0 &&
          !tempGrid[r][startC - 1].isBlocked &&
          tempGrid[r][startC - 1].letter
        ) {
          startC--;
        }

        // Find end
        while (
          endC < GRID_SIZE - 1 &&
          !tempGrid[r][endC + 1].isBlocked &&
          tempGrid[r][endC + 1].letter
        ) {
          endC++;
        }

        // Extract word
        if (endC > startC) {
          let word = "";
          for (let c = startC; c <= endC; c++) {
            word += tempGrid[r][c].letter;
          }

          if (word.length >= 2 && !this.wordSet.has(word)) {
            return true; // Would create invalid word
          }
        }
      }
    }

    return false;
  }

  private buildPuzzle(): boolean {
    // Start with a seed word in the center
    const seedWords =
      this.wordsByLength.get(7) ||
      this.wordsByLength.get(6) ||
      this.wordsByLength.get(8) ||
      [];
    if (seedWords.length === 0) return false;

    // Place first word
    const firstWord =
      seedWords[Math.floor(this.rng() * Math.min(50, seedWords.length))];
    const centerRow = Math.floor(GRID_SIZE / 2);
    const startCol = Math.floor((GRID_SIZE - firstWord.word.length) / 2);

    this.placeWord(firstWord, centerRow, startCol, "across", []);

    // Iteratively add crossing words
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 50;
    const targetWords = 30;

    while (
      this.placedWords.length < targetWords &&
      consecutiveFailures < maxConsecutiveFailures
    ) {
      const candidates = this.findBestCandidates();
      let placed = false;

      // Try each candidate
      for (const entry of candidates.slice(0, 200)) {
        // Try top 200 candidates
        const placements = this.findAllPlacements(entry);

        // Try best placements
        for (const placement of placements.slice(0, 5)) {
          // Check if this would create invalid words
          if (
            !this.wouldCreateInvalidWord(
              entry,
              placement.row,
              placement.col,
              placement.direction,
            )
          ) {
            this.placeWord(
              entry,
              placement.row,
              placement.col,
              placement.direction,
              placement.intersections,
            );
            placed = true;
            break;
          }
        }

        if (placed) break;
      }

      if (placed) {
        consecutiveFailures = 0;
      } else {
        consecutiveFailures++;
      }
    }

    return this.placedWords.length >= 20; // Minimum viable puzzle
  }

  private finalizeBlackSquares(): void {
    // Add symmetric black squares where appropriate
    const center = Math.floor(GRID_SIZE / 2);

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!this.grid[r][c].letter && !this.grid[r][c].isBlocked) {
          // Check if this should be black
          let adjacentLetters = 0;
          const directions = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ];

          for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              if (this.grid[nr][nc].letter) adjacentLetters++;
            }
          }

          // Make it black if it's isolated or would help word boundaries
          if (adjacentLetters <= 1) {
            this.grid[r][c].isBlocked = true;

            // Add symmetric black square
            const symR = GRID_SIZE - 1 - r;
            const symC = GRID_SIZE - 1 - c;
            if (!this.grid[symR][symC].letter) {
              this.grid[symR][symC].isBlocked = true;
            }
          }
        }
      }
    }
  }

  private assignNumbers(): void {
    let number = 1;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.grid[r][c].isBlocked || !this.grid[r][c].letter) continue;

        let needsNumber = false;

        // Check if it's the start of an across word
        if (
          (c === 0 ||
            this.grid[r][c - 1].isBlocked ||
            !this.grid[r][c - 1].letter) &&
          c < GRID_SIZE - 1 &&
          !this.grid[r][c + 1].isBlocked &&
          this.grid[r][c + 1].letter
        ) {
          needsNumber = true;
        }

        // Check if it's the start of a down word
        if (
          (r === 0 ||
            this.grid[r - 1][c].isBlocked ||
            !this.grid[r - 1][c].letter) &&
          r < GRID_SIZE - 1 &&
          !this.grid[r + 1][c].isBlocked &&
          this.grid[r + 1][c].letter
        ) {
          needsNumber = true;
        }

        if (needsNumber) {
          this.grid[r][c].number = number++;
        }
      }
    }
  }

  private generateClues(): CrosswordClue[] {
    const clues: CrosswordClue[] = [];
    const processedWords = new Set<string>();

    // Find all words in the grid and match with placed words
    // Horizontal words
    for (let r = 0; r < GRID_SIZE; r++) {
      let word = "";
      let startCol = -1;

      for (let c = 0; c <= GRID_SIZE; c++) {
        const isEnd =
          c === GRID_SIZE ||
          this.grid[r][c].isBlocked ||
          !this.grid[r][c].letter;

        if (!isEnd) {
          if (word === "") startCol = c;
          word += this.grid[r][c].letter;
        } else if (word.length >= MIN_WORD_LENGTH) {
          const key = `${r}-${startCol}-across-${word}`;
          if (!processedWords.has(key)) {
            processedWords.add(key);

            // Find matching placed word
            const placedWord = this.placedWords.find(
              (w) =>
                w.row === r &&
                w.col === startCol &&
                w.direction === "across" &&
                w.word === word,
            );

            if (placedWord) {
              clues.push({
                number: this.grid[r][startCol].number || 0,
                clue: placedWord.clue,
                answer: word,
                direction: "across",
                startRow: r,
                startCol: startCol,
                length: word.length,
              });
            }
          }
          word = "";
        } else {
          word = "";
        }
      }
    }

    // Vertical words
    for (let c = 0; c < GRID_SIZE; c++) {
      let word = "";
      let startRow = -1;

      for (let r = 0; r <= GRID_SIZE; r++) {
        const isEnd =
          r === GRID_SIZE ||
          this.grid[r][c].isBlocked ||
          !this.grid[r][c].letter;

        if (!isEnd) {
          if (word === "") startRow = r;
          word += this.grid[r][c].letter;
        } else if (word.length >= MIN_WORD_LENGTH) {
          const key = `${startRow}-${c}-down-${word}`;
          if (!processedWords.has(key)) {
            processedWords.add(key);

            // Find matching placed word
            const placedWord = this.placedWords.find(
              (w) =>
                w.row === startRow &&
                w.col === c &&
                w.direction === "down" &&
                w.word === word,
            );

            if (placedWord) {
              clues.push({
                number: this.grid[startRow][c].number || 0,
                clue: placedWord.clue,
                answer: word,
                direction: "down",
                startRow: startRow,
                startCol: c,
                length: word.length,
              });
            }
          }
          word = "";
        } else {
          word = "";
        }
      }
    }

    // Sort by number, then direction
    clues.sort((a, b) => {
      if (a.number !== b.number) return a.number - b.number;
      return a.direction === "across" ? -1 : 1;
    });

    return clues;
  }

  private validatePuzzle(): boolean {
    // Check all horizontal sequences
    for (let r = 0; r < GRID_SIZE; r++) {
      let word = "";

      for (let c = 0; c <= GRID_SIZE; c++) {
        const isEnd =
          c === GRID_SIZE ||
          this.grid[r][c].isBlocked ||
          !this.grid[r][c].letter;

        if (!isEnd) {
          word += this.grid[r][c].letter;
        } else if (word.length > 0) {
          if (word.length >= 2 && !this.wordSet.has(word)) {
            return false;
          }
          word = "";
        }
      }
    }

    // Check all vertical sequences
    for (let c = 0; c < GRID_SIZE; c++) {
      let word = "";

      for (let r = 0; r <= GRID_SIZE; r++) {
        const isEnd =
          r === GRID_SIZE ||
          this.grid[r][c].isBlocked ||
          !this.grid[r][c].letter;

        if (!isEnd) {
          word += this.grid[r][c].letter;
        } else if (word.length > 0) {
          if (word.length >= 2 && !this.wordSet.has(word)) {
            return false;
          }
          word = "";
        }
      }
    }

    return true;
  }

  public generate(): GeneratedPuzzle {
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      this.initializeGrid();

      if (this.buildPuzzle()) {
        this.finalizeBlackSquares();

        if (this.validatePuzzle()) {
          this.assignNumbers();
          const clues = this.generateClues();

          if (clues.length >= 20) {
            const acrossCount = clues.filter(
              (c) => c.direction === "across",
            ).length;
            const downCount = clues.filter(
              (c) => c.direction === "down",
            ).length;

            console.log(
              `✅ Valid puzzle generated (attempt ${attempt + 1}): ${acrossCount} across, ${downCount} down`,
            );

            return {
              grid: this.grid,
              clues,
              size: { rows: GRID_SIZE, cols: GRID_SIZE },
            };
          }
        }
      }
    }

    throw new Error("Failed to generate valid puzzle after maximum attempts");
  }
}

export function generateStrictPuzzle(date: string, categoryFilter?: string): GeneratedPuzzle {
  const generator = new StrictCrosswordGenerator(date + time(), categoryFilter);
  return generator.generate();
}

function time(): string {
  const now = new Date();
  const pad = (n: number, width = 2) => n.toString().padStart(width, "0");
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds()) +
    pad(now.getMilliseconds(), 3)
  );
}
