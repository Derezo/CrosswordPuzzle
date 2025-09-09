"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImprovedCrosswordGenerator = void 0;
exports.generateImprovedPuzzle = generateImprovedPuzzle;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const sync_1 = require("csv-parse/sync");
// Constants
const GRID_SIZE = 15;
const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 8; // Limit word length for better crossing
class ImprovedCrosswordGenerator {
    constructor(seed) {
        this.dictionary = [];
        this.wordsByLength = new Map();
        this.grid = [];
        this.placedWords = [];
        // Initialize seeded random
        const hash = crypto.createHash("sha256").update(seed).digest();
        let seedInt = hash.readUInt32BE(0);
        this.rng = () => {
            seedInt = (seedInt * 11035145 + 12345) & 0x7fffffff;
            return seedInt / 0x7fffffff;
        };
        this.loadDictionary();
        this.initializeGrid();
    }
    loadDictionary() {
        const csvPath = path.join(__dirname, "../../../src/data/crossword_dictionary_with_clues.csv");
        const csvContent = fs.readFileSync(csvPath, "utf-8");
        const records = (0, sync_1.parse)(csvContent, {
            columns: true,
            skip_empty_lines: true,
        });
        this.dictionary = records
            .filter((record) => {
            const word = record.word?.toUpperCase();
            return (word &&
                word.length >= MIN_WORD_LENGTH &&
                word.length <= MAX_WORD_LENGTH &&
                /^[A-Z]+$/.test(word) &&
                record.clue);
        })
            .map((record) => ({
            word: record.word.toUpperCase(),
            clue: record.clue,
            is_common_english: record.is_common_english === "True",
        }));
        // Remove duplicates
        const wordMap = new Map();
        for (const entry of this.dictionary) {
            const existing = wordMap.get(entry.word);
            if (!existing ||
                (entry.is_common_english && !existing.is_common_english)) {
                wordMap.set(entry.word, entry);
            }
        }
        this.dictionary = Array.from(wordMap.values());
        // Build index by length
        for (const entry of this.dictionary) {
            const len = entry.word.length;
            if (!this.wordsByLength.has(len)) {
                this.wordsByLength.set(len, []);
            }
            this.wordsByLength.get(len).push(entry);
        }
        console.log(`📚 Loaded ${this.dictionary.length} words (3-${MAX_WORD_LENGTH} letters)`);
    }
    initializeGrid() {
        this.grid = Array(GRID_SIZE)
            .fill(null)
            .map(() => Array(GRID_SIZE)
            .fill(null)
            .map(() => ({
            letter: "",
            number: null,
            isBlocked: false,
        })));
    }
    /**
     * Place a seed pattern with guaranteed crossings
     */
    placeSeedPattern() {
        // Place a medium-length word in the middle horizontally
        const centerRow = Math.floor(GRID_SIZE / 2);
        const seedWords = this.wordsByLength.get(7) || this.wordsByLength.get(6) || [];
        if (seedWords.length === 0)
            return;
        // Pick a random seed word
        const seedEntry = seedWords[Math.floor(this.rng() * seedWords.length)];
        const startCol = Math.floor((GRID_SIZE - seedEntry.word.length) / 2);
        // Place the seed word
        for (let i = 0; i < seedEntry.word.length; i++) {
            this.grid[centerRow][startCol + i].letter = seedEntry.word[i];
        }
        this.placedWords.push({
            word: seedEntry.word,
            clue: seedEntry.clue,
            row: centerRow,
            col: startCol,
            direction: "across",
        });
        // Add black squares before and after
        if (startCol > 0) {
            this.grid[centerRow][startCol - 1].isBlocked = true;
        }
        if (startCol + seedEntry.word.length < GRID_SIZE) {
            this.grid[centerRow][startCol + seedEntry.word.length].isBlocked = true;
        }
        // Add symmetric black squares
        const symRow = GRID_SIZE - 1 - centerRow;
        if (startCol > 0) {
            this.grid[symRow][GRID_SIZE - startCol].isBlocked = true;
        }
        if (startCol + seedEntry.word.length < GRID_SIZE) {
            this.grid[symRow][GRID_SIZE - 1 - (startCol + seedEntry.word.length)].isBlocked = true;
        }
    }
    /**
     * Find crossing opportunities
     */
    findCrossingOpportunities() {
        const opportunities = [];
        for (const word of this.placedWords) {
            for (let i = 0; i < word.word.length; i++) {
                const letter = word.word[i];
                if (word.direction === "across") {
                    const col = word.col + i;
                    // Check if we can place a down word here
                    // Check above
                    if (word.row > 0 &&
                        !this.grid[word.row - 1][col].isBlocked &&
                        !this.grid[word.row - 1][col].letter) {
                        opportunities.push({
                            letter,
                            row: word.row,
                            col,
                            direction: "down",
                        });
                    }
                    // Check below
                    if (word.row < GRID_SIZE - 1 &&
                        !this.grid[word.row + 1][col].isBlocked &&
                        !this.grid[word.row + 1][col].letter) {
                        opportunities.push({
                            letter,
                            row: word.row,
                            col,
                            direction: "down",
                        });
                    }
                }
                else {
                    const row = word.row + i;
                    // Check if we can place an across word here
                    // Check left
                    if (word.col > 0 &&
                        !this.grid[row][word.col - 1].isBlocked &&
                        !this.grid[row][word.col - 1].letter) {
                        opportunities.push({
                            letter,
                            row,
                            col: word.col,
                            direction: "across",
                        });
                    }
                    // Check right
                    if (word.col < GRID_SIZE - 1 &&
                        !this.grid[row][word.col + 1].isBlocked &&
                        !this.grid[row][word.col + 1].letter) {
                        opportunities.push({
                            letter,
                            row,
                            col: word.col,
                            direction: "across",
                        });
                    }
                }
            }
        }
        return opportunities;
    }
    /**
     * Try to place a word crossing at a specific point
     */
    tryPlaceCrossingWord(letter, crossRow, crossCol, direction) {
        // Find words containing this letter
        const candidates = [];
        for (const [length, entries] of this.wordsByLength) {
            if (length > MAX_WORD_LENGTH)
                continue;
            for (const entry of entries) {
                // Skip already used words
                if (this.placedWords.some((p) => p.word === entry.word))
                    continue;
                // Find positions of the letter
                for (let pos = 0; pos < entry.word.length; pos++) {
                    if (entry.word[pos] === letter) {
                        candidates.push({ entry, position: pos });
                    }
                }
            }
        }
        // Shuffle candidates
        candidates.sort(() => this.rng() - 0.5);
        // Try each candidate
        for (const { entry, position } of candidates.slice(0, 50)) {
            // Try top 50
            const word = entry.word;
            let startRow, startCol;
            if (direction === "across") {
                startRow = crossRow;
                startCol = crossCol - position;
            }
            else {
                startRow = crossRow - position;
                startCol = crossCol;
            }
            // Check bounds
            if (startRow < 0 || startCol < 0)
                continue;
            if (direction === "across" && startCol + word.length > GRID_SIZE)
                continue;
            if (direction === "down" && startRow + word.length > GRID_SIZE)
                continue;
            // Check if word can be placed
            let canPlace = true;
            for (let i = 0; i < word.length; i++) {
                const r = direction === "across" ? startRow : startRow + i;
                const c = direction === "across" ? startCol + i : startCol;
                if (this.grid[r][c].isBlocked) {
                    canPlace = false;
                    break;
                }
                if (this.grid[r][c].letter && this.grid[r][c].letter !== word[i]) {
                    canPlace = false;
                    break;
                }
            }
            if (!canPlace)
                continue;
            // Check word boundaries (must have black squares or edges at ends)
            if (direction === "across") {
                if (startCol > 0 &&
                    !this.grid[startRow][startCol - 1].isBlocked &&
                    this.grid[startRow][startCol - 1].letter)
                    continue;
                if (startCol + word.length < GRID_SIZE &&
                    !this.grid[startRow][startCol + word.length].isBlocked &&
                    this.grid[startRow][startCol + word.length].letter)
                    continue;
            }
            else {
                if (startRow > 0 &&
                    !this.grid[startRow - 1][startCol].isBlocked &&
                    this.grid[startRow - 1][startCol].letter)
                    continue;
                if (startRow + word.length < GRID_SIZE &&
                    !this.grid[startRow + word.length][startCol].isBlocked &&
                    this.grid[startRow + word.length][startCol].letter)
                    continue;
            }
            // Place the word
            for (let i = 0; i < word.length; i++) {
                const r = direction === "across" ? startRow : startRow + i;
                const c = direction === "across" ? startCol + i : startCol;
                this.grid[r][c].letter = word[i];
            }
            // Add boundary black squares
            if (direction === "across") {
                if (startCol > 0 && !this.grid[startRow][startCol - 1].letter) {
                    this.grid[startRow][startCol - 1].isBlocked = true;
                    // Add symmetric
                    this.grid[GRID_SIZE - 1 - startRow][GRID_SIZE - startCol].isBlocked =
                        true;
                }
                if (startCol + word.length < GRID_SIZE &&
                    !this.grid[startRow][startCol + word.length].letter) {
                    this.grid[startRow][startCol + word.length].isBlocked = true;
                    // Add symmetric
                    this.grid[GRID_SIZE - 1 - startRow][GRID_SIZE - 1 - (startCol + word.length)].isBlocked = true;
                }
            }
            else {
                if (startRow > 0 && !this.grid[startRow - 1][startCol].letter) {
                    this.grid[startRow - 1][startCol].isBlocked = true;
                    // Add symmetric
                    this.grid[GRID_SIZE - startRow][GRID_SIZE - 1 - startCol].isBlocked =
                        true;
                }
                if (startRow + word.length < GRID_SIZE &&
                    !this.grid[startRow + word.length][startCol].letter) {
                    this.grid[startRow + word.length][startCol].isBlocked = true;
                    // Add symmetric
                    this.grid[GRID_SIZE - 1 - (startRow + word.length)][GRID_SIZE - 1 - startCol].isBlocked = true;
                }
            }
            this.placedWords.push({
                word: word,
                clue: entry.clue,
                row: startRow,
                col: startCol,
                direction,
            });
            return true;
        }
        return false;
    }
    /**
     * Build puzzle iteratively
     */
    buildPuzzle() {
        // Place seed pattern
        this.placeSeedPattern();
        // Iteratively add crossing words
        let iterations = 0;
        const maxIterations = 50;
        while (iterations < maxIterations && this.placedWords.length < 30) {
            iterations++;
            // Find crossing opportunities
            const opportunities = this.findCrossingOpportunities();
            if (opportunities.length === 0)
                break;
            // Shuffle and try opportunities
            opportunities.sort(() => this.rng() - 0.5);
            let placed = false;
            for (const opp of opportunities.slice(0, 10)) {
                // Try top 10
                if (this.tryPlaceCrossingWord(opp.letter, opp.row, opp.col, opp.direction)) {
                    placed = true;
                    break;
                }
            }
            if (!placed)
                break;
        }
    }
    /**
     * Assign numbers to word starts
     */
    assignNumbers() {
        let number = 1;
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.grid[r][c].isBlocked || !this.grid[r][c].letter)
                    continue;
                const isAcrossStart = (c === 0 ||
                    this.grid[r][c - 1].isBlocked ||
                    !this.grid[r][c - 1].letter) &&
                    c < GRID_SIZE - 1 &&
                    !this.grid[r][c + 1].isBlocked &&
                    this.grid[r][c + 1].letter;
                const isDownStart = (r === 0 ||
                    this.grid[r - 1][c].isBlocked ||
                    !this.grid[r - 1][c].letter) &&
                    r < GRID_SIZE - 1 &&
                    !this.grid[r + 1][c].isBlocked &&
                    this.grid[r + 1][c].letter;
                if (isAcrossStart || isDownStart) {
                    this.grid[r][c].number = number;
                    // Update placed words
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
     * Generate clues
     */
    generateClues() {
        const clues = [];
        for (const word of this.placedWords) {
            if (word.number) {
                clues.push({
                    number: word.number,
                    clue: word.clue,
                    answer: word.word,
                    direction: word.direction,
                    startRow: word.row,
                    startCol: word.col,
                    length: word.word.length,
                });
            }
        }
        clues.sort((a, b) => {
            if (a.number !== b.number)
                return a.number - b.number;
            return a.direction === "across" ? -1 : 1;
        });
        return clues;
    }
    /**
     * Main generation method
     */
    generate() {
        const maxAttempts = 20;
        let bestPuzzle = null;
        let bestScore = 0;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Reset
            this.initializeGrid();
            this.placedWords = [];
            // Build puzzle
            this.buildPuzzle();
            // Assign numbers
            this.assignNumbers();
            // Generate clues
            const clues = this.generateClues();
            // Score puzzle
            const acrossCount = clues.filter((c) => c.direction === "across").length;
            const downCount = clues.filter((c) => c.direction === "down").length;
            const score = clues.length + Math.min(acrossCount, downCount) * 2; // Bonus for balance
            if (score > bestScore) {
                bestScore = score;
                bestPuzzle = {
                    grid: this.grid,
                    clues,
                    size: { rows: GRID_SIZE, cols: GRID_SIZE },
                };
                // Good enough?
                if (acrossCount >= 10 && downCount >= 10) {
                    console.log(`✅ Generated balanced puzzle: ${acrossCount} across, ${downCount} down (attempt ${attempt + 1})`);
                    return bestPuzzle;
                }
            }
        }
        if (bestPuzzle) {
            const clues = bestPuzzle.clues;
            const acrossCount = clues.filter((c) => c.direction === "across").length;
            const downCount = clues.filter((c) => c.direction === "down").length;
            console.log(`✅ Best puzzle: ${acrossCount} across, ${downCount} down`);
            return bestPuzzle;
        }
        throw new Error("Failed to generate puzzle");
    }
}
exports.ImprovedCrosswordGenerator = ImprovedCrosswordGenerator;
// Export function
function generateImprovedPuzzle(date) {
    const generator = new ImprovedCrosswordGenerator(date);
    return generator.generate();
}
//# sourceMappingURL=improvedCrosswordGenerator.js.map