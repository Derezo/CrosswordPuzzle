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
exports.ConstraintCrosswordGenerator = void 0;
exports.generateConstraintPuzzle = generateConstraintPuzzle;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const sync_1 = require("csv-parse/sync");
const GRID_SIZE = 15;
const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 15;
class ConstraintCrosswordGenerator {
    constructor(seed) {
        this.dictionary = [];
        this.wordsByLength = new Map();
        this.wordSet = new Set();
        this.grid = [];
        this.slots = [];
        const hash = crypto.createHash('sha256').update(seed).digest();
        let seedInt = hash.readUInt32BE(0);
        this.rng = () => {
            seedInt = (seedInt * 1103515245 + 12345) & 0x7fffffff;
            return seedInt / 0x7fffffff;
        };
        this.loadDictionary();
    }
    loadDictionary() {
        const csvPath = path.join(__dirname, '../../../src/data/crossword_dictionary_with_clues.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const records = (0, sync_1.parse)(csvContent, {
            columns: true,
            skip_empty_lines: true
        });
        this.dictionary = records
            .filter((record) => {
            const word = record.word?.toUpperCase();
            return word &&
                word.length >= MIN_WORD_LENGTH &&
                word.length <= MAX_WORD_LENGTH &&
                /^[A-Z]+$/.test(word) &&
                record.clue;
        })
            .map((record) => ({
            word: record.word.toUpperCase(),
            clue: record.clue,
            is_common_english: record.is_common_english === 'True'
        }));
        // Remove duplicates, prioritizing common words
        const wordMap = new Map();
        for (const entry of this.dictionary) {
            const existing = wordMap.get(entry.word);
            if (!existing || (entry.is_common_english && !existing.is_common_english)) {
                wordMap.set(entry.word, entry);
            }
            this.wordSet.add(entry.word);
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
        console.log(`📚 Loaded ${this.dictionary.length} words`);
    }
    initializeGrid() {
        this.grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null).map(() => ({
            letter: '',
            number: null,
            isBlocked: false
        })));
    }
    createSymmetricBlackPattern() {
        // Create a symmetric pattern of black squares
        const patterns = [
            // Pattern 1: Classic symmetric
            [[0, 4], [0, 10], [1, 4], [1, 10], [3, 6], [3, 8], [4, 0], [4, 1], [4, 13], [4, 14],
                [6, 3], [6, 11], [8, 3], [8, 11], [10, 0], [10, 1], [10, 13], [10, 14],
                [11, 6], [11, 8], [13, 4], [13, 10], [14, 4], [14, 10]],
            // Pattern 2: Open center
            [[0, 3], [0, 11], [1, 3], [1, 7], [1, 11], [2, 5], [2, 9], [3, 0], [3, 1], [3, 13], [3, 14],
                [5, 2], [5, 12], [7, 1], [7, 6], [7, 8], [7, 13], [9, 2], [9, 12],
                [11, 0], [11, 1], [11, 13], [11, 14], [12, 5], [12, 9], [13, 3], [13, 7], [13, 11], [14, 3], [14, 11]],
            // Pattern 3: Diamond
            [[0, 6], [0, 8], [2, 4], [2, 10], [4, 2], [4, 12], [6, 0], [6, 14],
                [8, 0], [8, 14], [10, 2], [10, 12], [12, 4], [12, 10], [14, 6], [14, 8]]
        ];
        // Choose a pattern based on seed
        const pattern = patterns[Math.floor(this.rng() * patterns.length)];
        for (const [r, c] of pattern) {
            if (r < GRID_SIZE && c < GRID_SIZE) {
                this.grid[r][c].isBlocked = true;
            }
        }
    }
    findWordSlots() {
        this.slots = [];
        // Find all horizontal slots
        for (let r = 0; r < GRID_SIZE; r++) {
            let startCol = -1;
            for (let c = 0; c <= GRID_SIZE; c++) {
                const isBlocked = c === GRID_SIZE || this.grid[r][c].isBlocked;
                if (!isBlocked && startCol === -1) {
                    startCol = c;
                }
                else if (isBlocked && startCol !== -1) {
                    const length = c - startCol;
                    if (length >= MIN_WORD_LENGTH) {
                        this.slots.push({
                            row: r,
                            col: startCol,
                            direction: 'across',
                            length,
                            pattern: '.'.repeat(length),
                            intersections: []
                        });
                    }
                    startCol = -1;
                }
            }
        }
        // Find all vertical slots
        for (let c = 0; c < GRID_SIZE; c++) {
            let startRow = -1;
            for (let r = 0; r <= GRID_SIZE; r++) {
                const isBlocked = r === GRID_SIZE || this.grid[r][c].isBlocked;
                if (!isBlocked && startRow === -1) {
                    startRow = r;
                }
                else if (isBlocked && startRow !== -1) {
                    const length = r - startRow;
                    if (length >= MIN_WORD_LENGTH) {
                        this.slots.push({
                            row: startRow,
                            col: c,
                            direction: 'down',
                            length,
                            pattern: '.'.repeat(length),
                            intersections: []
                        });
                    }
                    startRow = -1;
                }
            }
        }
        // Find intersections between slots
        for (let i = 0; i < this.slots.length; i++) {
            for (let j = i + 1; j < this.slots.length; j++) {
                const slot1 = this.slots[i];
                const slot2 = this.slots[j];
                if (slot1.direction === slot2.direction)
                    continue;
                // Check for intersection
                if (slot1.direction === 'across') {
                    // slot1 is horizontal, slot2 is vertical
                    if (slot2.col >= slot1.col && slot2.col < slot1.col + slot1.length &&
                        slot1.row >= slot2.row && slot1.row < slot2.row + slot2.length) {
                        const pos1 = slot2.col - slot1.col;
                        const pos2 = slot1.row - slot2.row;
                        slot1.intersections.push({
                            position: pos1,
                            otherSlot: slot2,
                            otherPosition: pos2
                        });
                        slot2.intersections.push({
                            position: pos2,
                            otherSlot: slot1,
                            otherPosition: pos1
                        });
                    }
                }
                else {
                    // slot1 is vertical, slot2 is horizontal
                    if (slot1.col >= slot2.col && slot1.col < slot2.col + slot2.length &&
                        slot2.row >= slot1.row && slot2.row < slot1.row + slot1.length) {
                        const pos1 = slot2.row - slot1.row;
                        const pos2 = slot1.col - slot2.col;
                        slot1.intersections.push({
                            position: pos1,
                            otherSlot: slot2,
                            otherPosition: pos2
                        });
                        slot2.intersections.push({
                            position: pos2,
                            otherSlot: slot1,
                            otherPosition: pos1
                        });
                    }
                }
            }
        }
        // Sort slots by number of intersections (most constrained first)
        this.slots.sort((a, b) => b.intersections.length - a.intersections.length);
    }
    getMatchingWords(slot) {
        const words = this.wordsByLength.get(slot.length) || [];
        const pattern = slot.pattern;
        return words.filter(entry => {
            // Check if word matches the pattern
            for (let i = 0; i < pattern.length; i++) {
                if (pattern[i] !== '.' && pattern[i] !== entry.word[i]) {
                    return false;
                }
            }
            // Check if word hasn't been used yet
            for (const s of this.slots) {
                if (s !== slot && s.word && s.word.word === entry.word) {
                    return false;
                }
            }
            return true;
        });
    }
    updatePattern(slot, word) {
        const newPattern = word.split('');
        slot.pattern = word;
        // Update intersecting slots' patterns
        for (const intersection of slot.intersections) {
            const otherSlot = intersection.otherSlot;
            const letter = word[intersection.position];
            const otherPattern = otherSlot.pattern.split('');
            otherPattern[intersection.otherPosition] = letter;
            otherSlot.pattern = otherPattern.join('');
        }
    }
    revertPattern(slot) {
        // Reset this slot's pattern
        const oldPattern = '.'.repeat(slot.length).split('');
        // Restore letters from intersecting filled slots
        for (const intersection of slot.intersections) {
            const otherSlot = intersection.otherSlot;
            if (otherSlot.word) {
                oldPattern[intersection.position] = otherSlot.word.word[intersection.otherPosition];
            }
        }
        slot.pattern = oldPattern.join('');
        // Update patterns of intersecting unfilled slots
        for (const intersection of slot.intersections) {
            const otherSlot = intersection.otherSlot;
            if (!otherSlot.word) {
                const otherPattern = otherSlot.pattern.split('');
                otherPattern[intersection.otherPosition] = '.';
                // Restore from other intersections
                for (const otherIntersection of otherSlot.intersections) {
                    if (otherIntersection.otherSlot.word) {
                        otherPattern[otherIntersection.position] =
                            otherIntersection.otherSlot.word.word[otherIntersection.otherPosition];
                    }
                }
                otherSlot.pattern = otherPattern.join('');
            }
        }
    }
    fillSlots() {
        // Use backtracking to fill all slots
        return this.backtrackFill(0);
    }
    backtrackFill(slotIndex) {
        if (slotIndex >= this.slots.length) {
            // All slots filled successfully
            return true;
        }
        const slot = this.slots[slotIndex];
        const candidates = this.getMatchingWords(slot);
        // Shuffle candidates for variety
        const shuffled = [...candidates].sort(() => this.rng() - 0.5);
        for (const candidate of shuffled) {
            // Try this word
            slot.word = candidate;
            this.updatePattern(slot, candidate.word);
            // Check if this creates valid patterns for all intersecting slots
            let valid = true;
            for (const intersection of slot.intersections) {
                const otherSlot = intersection.otherSlot;
                if (!otherSlot.word) {
                    const otherCandidates = this.getMatchingWords(otherSlot);
                    if (otherCandidates.length === 0) {
                        valid = false;
                        break;
                    }
                }
            }
            if (valid) {
                // Continue with next slot
                if (this.backtrackFill(slotIndex + 1)) {
                    return true;
                }
            }
            // Backtrack
            slot.word = undefined;
            this.revertPattern(slot);
        }
        return false;
    }
    fillGrid() {
        // Fill the grid with the words from slots
        for (const slot of this.slots) {
            if (slot.word) {
                for (let i = 0; i < slot.word.word.length; i++) {
                    const r = slot.direction === 'across' ? slot.row : slot.row + i;
                    const c = slot.direction === 'across' ? slot.col + i : slot.col;
                    this.grid[r][c].letter = slot.word.word[i];
                }
            }
        }
    }
    assignNumbers() {
        let number = 1;
        const numberMap = new Map();
        // Scan grid systematically
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.grid[r][c].isBlocked || !this.grid[r][c].letter)
                    continue;
                let needsNumber = false;
                // Check if it's the start of an across word
                if ((c === 0 || this.grid[r][c - 1].isBlocked || !this.grid[r][c - 1].letter) &&
                    c < GRID_SIZE - 1 && !this.grid[r][c + 1].isBlocked && this.grid[r][c + 1].letter) {
                    needsNumber = true;
                }
                // Check if it's the start of a down word
                if ((r === 0 || this.grid[r - 1][c].isBlocked || !this.grid[r - 1][c].letter) &&
                    r < GRID_SIZE - 1 && !this.grid[r + 1][c].isBlocked && this.grid[r + 1][c].letter) {
                    needsNumber = true;
                }
                if (needsNumber) {
                    this.grid[r][c].number = number;
                    numberMap.set(`${r},${c}`, number);
                    number++;
                }
            }
        }
        // Update slots with numbers
        for (const slot of this.slots) {
            const key = `${slot.row},${slot.col}`;
            if (numberMap.has(key)) {
                slot.number = numberMap.get(key);
            }
        }
    }
    generateClues() {
        const clues = [];
        for (const slot of this.slots) {
            if (slot.word && slot.number) {
                clues.push({
                    number: slot.number,
                    clue: slot.word.clue,
                    answer: slot.word.word,
                    direction: slot.direction,
                    startRow: slot.row,
                    startCol: slot.col,
                    length: slot.word.word.length
                });
            }
        }
        // Sort by number, then direction
        clues.sort((a, b) => {
            if (a.number !== b.number)
                return a.number - b.number;
            return a.direction === 'across' ? -1 : 1;
        });
        return clues;
    }
    validatePuzzle() {
        // Validate that every sequence of letters forms a valid word
        // Check all horizontal sequences
        for (let r = 0; r < GRID_SIZE; r++) {
            let word = '';
            let startCol = -1;
            for (let c = 0; c <= GRID_SIZE; c++) {
                const isEnd = c === GRID_SIZE || this.grid[r][c].isBlocked || !this.grid[r][c].letter;
                if (!isEnd) {
                    if (word === '')
                        startCol = c;
                    word += this.grid[r][c].letter;
                }
                else if (word.length > 0) {
                    if (word.length >= 2) { // Check any sequence of 2+ letters
                        if (!this.wordSet.has(word)) {
                            console.error(`Invalid horizontal word at row ${r}, col ${startCol}: "${word}"`);
                            return false;
                        }
                    }
                    word = '';
                    startCol = -1;
                }
            }
        }
        // Check all vertical sequences
        for (let c = 0; c < GRID_SIZE; c++) {
            let word = '';
            let startRow = -1;
            for (let r = 0; r <= GRID_SIZE; r++) {
                const isEnd = r === GRID_SIZE || this.grid[r][c].isBlocked || !this.grid[r][c].letter;
                if (!isEnd) {
                    if (word === '')
                        startRow = r;
                    word += this.grid[r][c].letter;
                }
                else if (word.length > 0) {
                    if (word.length >= 2) { // Check any sequence of 2+ letters
                        if (!this.wordSet.has(word)) {
                            console.error(`Invalid vertical word at row ${startRow}, col ${c}: "${word}"`);
                            return false;
                        }
                    }
                    word = '';
                    startRow = -1;
                }
            }
        }
        return true;
    }
    generate() {
        const maxAttempts = 50;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            console.log(`Attempt ${attempt + 1}...`);
            // Initialize grid
            this.initializeGrid();
            // Create black square pattern
            this.createSymmetricBlackPattern();
            // Find word slots
            this.findWordSlots();
            if (this.slots.length < 20) {
                console.log(`Not enough slots (${this.slots.length}), retrying...`);
                continue;
            }
            // Reset all slots
            for (const slot of this.slots) {
                slot.word = undefined;
                slot.pattern = '.'.repeat(slot.length);
            }
            // Try to fill all slots
            if (this.fillSlots()) {
                // Fill grid with words
                this.fillGrid();
                // Validate the puzzle
                if (this.validatePuzzle()) {
                    // Assign numbers
                    this.assignNumbers();
                    // Generate clues
                    const clues = this.generateClues();
                    const acrossCount = clues.filter(c => c.direction === 'across').length;
                    const downCount = clues.filter(c => c.direction === 'down').length;
                    console.log(`✅ Valid puzzle generated: ${acrossCount} across, ${downCount} down`);
                    return {
                        grid: this.grid,
                        clues,
                        size: { rows: GRID_SIZE, cols: GRID_SIZE }
                    };
                }
                else {
                    console.log('Puzzle validation failed, retrying...');
                }
            }
            else {
                console.log('Could not fill all slots, retrying...');
            }
        }
        throw new Error('Failed to generate valid puzzle after maximum attempts');
    }
}
exports.ConstraintCrosswordGenerator = ConstraintCrosswordGenerator;
function generateConstraintPuzzle(date) {
    const generator = new ConstraintCrosswordGenerator(date);
    return generator.generate();
}
//# sourceMappingURL=constraintCrosswordGenerator.js.map