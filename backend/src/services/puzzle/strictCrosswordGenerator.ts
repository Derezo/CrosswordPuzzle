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

// Adaptive strategy configuration
const ADAPTIVE_STRATEGIES = [
  { gridSize: 21, maxWordLength: 15, targetWords: 65, minWords: 45 },
  { gridSize: 21, maxWordLength: 15, targetWords: 35, minWords: 35 },
  { gridSize: 15, maxWordLength: 13, targetWords: 30, minWords: 22 },
  { gridSize: 15, maxWordLength: 12, targetWords: 24, minWords: 20 },
  { gridSize: 10, maxWordLength: 10, targetWords: 20, minWords: 13 },
  { gridSize: 10, maxWordLength: 8, targetWords: 14, minWords: 10 },
  { gridSize: 9, maxWordLength: 7, targetWords: 12, minWords: 8 },
  { gridSize: 8, maxWordLength: 6, targetWords: 9, minWords: 5 },
];

export class StrictCrosswordGenerator {
  private dictionary: DictionaryEntry[] = [];
  private wordsByLength: Map<number, DictionaryEntry[]> = new Map();
  private wordSet: Set<string> = new Set();
  private grid: PuzzleCell[][] = [];
  private placedWords: WordPlacement[] = [];
  private usedWords: Set<string> = new Set();
  private rng: () => number;
  private categoryFilters: string[] = [];
  private currentGridSize: number = GRID_SIZE;
  private currentMaxWordLength: number = MAX_WORD_LENGTH;

  constructor(seed: string, categoryFilter?: string | string[]) {
    const hash = crypto.createHash("sha256").update(seed).digest();
    let seedInt = hash.readUInt32BE(0);
    this.rng = () => {
      seedInt = (seedInt * 11035155 + 12345) & 0x7fffffff;
      return seedInt / 0x7fffffff;
    };

    // Handle both single category and multiple categories
    if (categoryFilter) {
      this.categoryFilters = Array.isArray(categoryFilter)
        ? categoryFilter
        : [categoryFilter];
    } else {
      this.categoryFilters = [];
    }
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

        // If category filters are provided, check if word belongs to any of them
        if (this.categoryFilters.length > 0 && record.categories) {
          const categories = record.categories
            .toLowerCase()
            .split(",")
            .map((cat: string) => cat.trim());
          // Word should match at least one of the selected categories
          matchesCategory = this.categoryFilters.some((filter) =>
            categories.includes(filter.toLowerCase()),
          );
        } else if (this.categoryFilters.length > 0) {
          // If we have filters but word has no categories, exclude it
          matchesCategory = false;
        }

        return (
          word &&
          word.length >= MIN_WORD_LENGTH &&
          word.length <= this.currentMaxWordLength &&
          /^[A-Z]+$/.test(word) &&
          record.clue &&
          record.obscure !== "True" &&
          record.obscure !== true && // Exclude obscure words
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

    console.log(
      `📚 Loaded ${this.dictionary.length} words${this.categoryFilters.length > 0 ? ` for categories: ${this.categoryFilters.join(", ")}` : ""}`,
    );
  }

  private initializeGrid(): void {
    this.grid = Array(this.currentGridSize)
      .fill(null)
      .map(() =>
        Array(this.currentGridSize)
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
    if (direction === "across" && col + word.length > this.currentGridSize)
      return { valid: false, intersections: [] };
    if (direction === "down" && row + word.length > this.currentGridSize)
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
        col + word.length < this.currentGridSize &&
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
        row + word.length < this.currentGridSize &&
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
        col + entry.word.length < this.currentGridSize &&
        !this.grid[row][col + entry.word.length].letter
      ) {
        this.grid[row][col + entry.word.length].isBlocked = true;
      }
    } else {
      if (row > 0 && !this.grid[row - 1][col].letter) {
        this.grid[row - 1][col].isBlocked = true;
      }
      if (
        row + entry.word.length < this.currentGridSize &&
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

    for (let r = 0; r < this.currentGridSize; r++) {
      for (let c = 0; c < this.currentGridSize; c++) {
        for (const direction of ["across", "down"] as const) {
          const result = this.canPlaceWord(entry.word, r, c, direction);
          if (result.valid) {
            // Calculate placement score
            let score = result.intersections.length * 10; // Prefer more intersections

            // Prefer central positions for first words
            if (this.placedWords.length < 5) {
              const centerDist =
                Math.abs(r - this.currentGridSize / 2) +
                Math.abs(c - this.currentGridSize / 2);
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
          endR < this.currentGridSize - 1 &&
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
          endC < this.currentGridSize - 1 &&
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

  private buildPuzzleAdaptive(
    targetWords: number,
    maxConsecutiveFailures: number = 30,
  ): boolean {
    // More lenient failure threshold for adaptive strategy
    return this.buildPuzzle(targetWords, maxConsecutiveFailures);
  }

  private buildPuzzle(
    targetWords: number = 45,
    maxConsecutiveFailures: number = 175,
  ): boolean {
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
    const centerRow = Math.floor(this.currentGridSize / 2);
    const startCol = Math.floor(
      (this.currentGridSize - firstWord.word.length) / 2,
    );

    this.placeWord(firstWord, centerRow, startCol, "across", []);

    // Iteratively add crossing words
    let consecutiveFailures = 0;

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
    const center = Math.floor(this.currentGridSize / 2);

    for (let r = 0; r < this.currentGridSize; r++) {
      for (let c = 0; c < this.currentGridSize; c++) {
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
            if (
              nr >= 0 &&
              nr < this.currentGridSize &&
              nc >= 0 &&
              nc < this.currentGridSize
            ) {
              if (this.grid[nr][nc].letter) adjacentLetters++;
            }
          }

          // Make it black if it's isolated or would help word boundaries
          if (adjacentLetters <= 1) {
            this.grid[r][c].isBlocked = true;

            // Add symmetric black square
            const symR = this.currentGridSize - 1 - r;
            const symC = this.currentGridSize - 1 - c;
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

    for (let r = 0; r < this.currentGridSize; r++) {
      for (let c = 0; c < this.currentGridSize; c++) {
        if (this.grid[r][c].isBlocked || !this.grid[r][c].letter) continue;

        let needsNumber = false;

        // Check if it's the start of an across word
        if (
          (c === 0 ||
            this.grid[r][c - 1].isBlocked ||
            !this.grid[r][c - 1].letter) &&
          c < this.currentGridSize - 1 &&
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
          r < this.currentGridSize - 1 &&
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
    for (let r = 0; r < this.currentGridSize; r++) {
      let word = "";
      let startCol = -1;

      for (let c = 0; c <= this.currentGridSize; c++) {
        const isEnd =
          c === this.currentGridSize ||
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
    for (let c = 0; c < this.currentGridSize; c++) {
      let word = "";
      let startRow = -1;

      for (let r = 0; r <= this.currentGridSize; r++) {
        const isEnd =
          r === this.currentGridSize ||
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
    for (let r = 0; r < this.currentGridSize; r++) {
      let word = "";

      for (let c = 0; c <= this.currentGridSize; c++) {
        const isEnd =
          c === this.currentGridSize ||
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
    for (let c = 0; c < this.currentGridSize; c++) {
      let word = "";

      for (let r = 0; r <= this.currentGridSize; r++) {
        const isEnd =
          r === this.currentGridSize ||
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
    return this.generateWithAdaptiveStrategy();
  }

  public generateWithCallback(
    progressCallback?: (
      stage: string,
      attempt: number,
      targetWords: number,
      phase: "normal" | "fallback",
    ) => void,
  ): GeneratedPuzzle {
    return this.generateWithAdaptiveStrategy(progressCallback);
  }

  public async generateWithCallbackAsync(
    progressCallback?: (
      stage: string,
      attempt: number,
      targetWords: number,
      phase: "normal" | "fallback",
    ) => Promise<void>,
  ): Promise<GeneratedPuzzle> {
    return this.generateWithAdaptiveStrategyAsync(progressCallback);
  }

  private generateWithAdaptiveStrategy(
    progressCallback?: (
      stage: string,
      attempt: number,
      targetWords: number,
      phase: "normal" | "fallback",
    ) => void,
  ): GeneratedPuzzle {
    const maxAttemptsPerStrategy = 100;
    const maxWordReductionAttempts = 50;
    let strategyIndex = 0;
    let totalAttempts = 0;

    // Try each strategy in sequence
    while (strategyIndex < ADAPTIVE_STRATEGIES.length) {
      const strategy = ADAPTIVE_STRATEGIES[strategyIndex];
      this.currentGridSize = strategy.gridSize;
      this.currentMaxWordLength = strategy.maxWordLength;
      let targetWords = strategy.targetWords;
      const minWords = strategy.minWords;

      console.log(
        `🎯 Strategy ${strategyIndex + 1}/${ADAPTIVE_STRATEGIES.length}: ${this.currentGridSize}x${this.currentGridSize} grid, target ${targetWords} words`,
      );

      // Reload dictionary with new word length constraints
      this.loadDictionary();

      // Try with progressive word reduction
      for (
        let wordReduction = 0;
        wordReduction <= maxWordReductionAttempts;
        wordReduction += 10
      ) {
        const currentTargetWords = Math.max(
          minWords,
          targetWords - Math.floor(wordReduction / 10) * 3,
        );

        for (let attempt = 0; attempt < maxAttemptsPerStrategy; attempt++) {
          totalAttempts++;

          // Progress callback
          if (progressCallback) {
            const phase = strategyIndex < 3 ? "normal" : "fallback";
            progressCallback(
              "generation",
              totalAttempts,
              currentTargetWords,
              phase,
            );
          }

          // Log progress periodically
          if (attempt % 25 === 0 && attempt > 0) {
            console.log(
              `  Attempt ${attempt}/${maxAttemptsPerStrategy} with ${currentTargetWords} target words`,
            );
          }

          this.initializeGrid();

          if (this.buildPuzzleAdaptive(currentTargetWords)) {
            this.finalizeBlackSquares();

            if (this.validatePuzzle()) {
              this.assignNumbers();
              const clues = this.generateClues();

              // More lenient clue count requirement for smaller grids
              const requiredClues = Math.max(
                10,
                Math.floor(currentTargetWords * 0.6),
              );

              if (clues.length >= requiredClues) {
                const acrossCount = clues.filter(
                  (c) => c.direction === "across",
                ).length;
                const downCount = clues.filter(
                  (c) => c.direction === "down",
                ).length;

                console.log(
                  `✅ Valid puzzle generated: ${acrossCount} across, ${downCount} down on ${this.currentGridSize}x${this.currentGridSize} grid (strategy ${strategyIndex + 1}, attempt ${totalAttempts})`,
                );

                return {
                  grid: this.grid,
                  clues,
                  size: {
                    rows: this.currentGridSize,
                    cols: this.currentGridSize,
                  },
                };
              }
            }
          }
        }
      }

      strategyIndex++;
    }

    console.log(
      `❌ Failed to generate puzzle after ${totalAttempts} total attempts across all strategies`,
    );

    throw new Error(
      `Failed to generate valid puzzle after ${totalAttempts} attempts across ${ADAPTIVE_STRATEGIES.length} strategies`,
    );
  }

  private async generateWithAdaptiveStrategyAsync(
    progressCallback?: (
      stage: string,
      attempt: number,
      targetWords: number,
      phase: "normal" | "fallback",
    ) => Promise<void>,
  ): Promise<GeneratedPuzzle> {
    const maxAttemptsPerStrategy = 100;
    const maxWordReductionAttempts = 50;
    let strategyIndex = 0;
    let totalAttempts = 0;

    // Try each strategy in sequence
    while (strategyIndex < ADAPTIVE_STRATEGIES.length) {
      const strategy = ADAPTIVE_STRATEGIES[strategyIndex];
      this.currentGridSize = strategy.gridSize;
      this.currentMaxWordLength = strategy.maxWordLength;
      let targetWords = strategy.targetWords;
      const minWords = strategy.minWords;

      console.log(
        `🎯 Async Strategy ${strategyIndex + 1}/${ADAPTIVE_STRATEGIES.length}: ${this.currentGridSize}x${this.currentGridSize} grid, target ${targetWords} words`,
      );

      // Reload dictionary with new word length constraints
      this.loadDictionary();

      // Try with progressive word reduction
      for (
        let wordReduction = 0;
        wordReduction <= maxWordReductionAttempts;
        wordReduction += 10
      ) {
        const currentTargetWords = Math.max(
          minWords,
          targetWords - Math.floor(wordReduction / 10) * 3,
        );

        for (let attempt = 0; attempt < maxAttemptsPerStrategy; attempt++) {
          totalAttempts++;

          // Yield every 5 attempts to prevent blocking
          if (totalAttempts % 5 === 0) {
            await new Promise((resolve) => setImmediate(resolve));
          }

          // Progress callback
          if (progressCallback) {
            const phase = strategyIndex < 3 ? "normal" : "fallback";
            await progressCallback(
              "generation",
              totalAttempts,
              currentTargetWords,
              phase,
            );
          }

          // Log progress periodically
          if (attempt % 25 === 0 && attempt > 0) {
            console.log(
              `  Async Attempt ${attempt}/${maxAttemptsPerStrategy} with ${currentTargetWords} target words`,
            );
          }

          this.initializeGrid();

          if (await this.buildPuzzleAdaptiveAsync(currentTargetWords)) {
            this.finalizeBlackSquares();

            if (this.validatePuzzle()) {
              this.assignNumbers();
              const clues = this.generateClues();

              // More lenient clue count requirement for smaller grids
              const requiredClues = Math.max(
                10,
                Math.floor(currentTargetWords * 0.6),
              );

              if (clues.length >= requiredClues) {
                const acrossCount = clues.filter(
                  (c) => c.direction === "across",
                ).length;
                const downCount = clues.filter(
                  (c) => c.direction === "down",
                ).length;

                console.log(
                  `✅ Valid async puzzle generated: ${acrossCount} across, ${downCount} down on ${this.currentGridSize}x${this.currentGridSize} grid (strategy ${strategyIndex + 1}, attempt ${totalAttempts})`,
                );

                return {
                  grid: this.grid,
                  clues,
                  size: {
                    rows: this.currentGridSize,
                    cols: this.currentGridSize,
                  },
                };
              }
            }
          }
        }
      }

      strategyIndex++;
    }

    console.log(
      `❌ Failed to generate async puzzle after ${totalAttempts} total attempts across all strategies`,
    );

    throw new Error(
      `Failed to generate valid async puzzle after ${totalAttempts} attempts across ${ADAPTIVE_STRATEGIES.length} strategies`,
    );
  }

  private async buildPuzzleAdaptiveAsync(
    targetWords: number,
    maxConsecutiveFailures: number = 30,
  ): Promise<boolean> {
    // More lenient failure threshold for adaptive strategy
    return this.buildPuzzleAsync(targetWords, maxConsecutiveFailures);
  }

  private async buildPuzzleAsync(
    targetWords: number = 35,
    maxConsecutiveFailures: number = 175,
  ): Promise<boolean> {
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
    const centerRow = Math.floor(this.currentGridSize / 2);
    const startCol = Math.floor(
      (this.currentGridSize - firstWord.word.length) / 2,
    );

    this.placeWord(firstWord, centerRow, startCol, "across", []);

    // Iteratively add crossing words
    let consecutiveFailures = 0;

    while (
      this.placedWords.length < targetWords &&
      consecutiveFailures < maxConsecutiveFailures
    ) {
      // Yield every 10 iterations to prevent blocking
      if (consecutiveFailures % 10 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }

      const candidates = this.findBestCandidates();
      let placed = false;

      // Try each candidate (limit processing)
      for (const entry of candidates.slice(0, 50)) {
        // Reduced from 200 to 50
        const placements = this.findAllPlacements(entry);

        // Try best placements (reduced from 5 to 3)
        for (const placement of placements.slice(0, 3)) {
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
}

export function generateStrictPuzzle(
  date: string,
  categoryFilter?: string,
): GeneratedPuzzle {
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
