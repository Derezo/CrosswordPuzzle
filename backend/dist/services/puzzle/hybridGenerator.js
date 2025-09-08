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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHybridDailyPuzzle = generateHybridDailyPuzzle;
const crypto_1 = __importDefault(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Load comprehensive dictionary 
let DICTIONARY_WORDS = [];
let WORDS_BY_LENGTH = new Map();
let WORDS_BY_FIRST_LETTER = new Map();
let WORDS_BY_LAST_LETTER = new Map();
try {
    const dictPath = path.join(__dirname, '../../data/crossword_dictionary.txt');
    if (fs.existsSync(dictPath)) {
        DICTIONARY_WORDS = fs.readFileSync(dictPath, 'utf-8')
            .split('\n')
            .map(word => word.trim())
            .filter(word => word.length >= 3 && word.length <= 15);
        // Build optimized lookup tables
        for (const word of DICTIONARY_WORDS) {
            const len = word.length;
            const firstLetter = word[0];
            const lastLetter = word[word.length - 1];
            if (!WORDS_BY_LENGTH.has(len))
                WORDS_BY_LENGTH.set(len, []);
            if (!WORDS_BY_FIRST_LETTER.has(firstLetter))
                WORDS_BY_FIRST_LETTER.set(firstLetter, []);
            if (!WORDS_BY_LAST_LETTER.has(lastLetter))
                WORDS_BY_LAST_LETTER.set(lastLetter, []);
            WORDS_BY_LENGTH.get(len).push(word);
            WORDS_BY_FIRST_LETTER.get(firstLetter).push(word);
            WORDS_BY_LAST_LETTER.get(lastLetter).push(word);
        }
    }
}
catch (error) {
    console.warn('Could not load dictionary file:', error);
}
// Single theme word options
const THEME_WORDS = [
    { word: 'GALAXY', clue: 'Spiral or elliptical star system' },
    { word: 'STELLAR', clue: 'Relating to stars' },
    { word: 'COSMOS', clue: 'The universe seen as a well-ordered whole' },
    { word: 'GRAVITY', clue: 'Force that attracts objects' },
    { word: 'NEBULA', clue: 'Interstellar cloud of dust and gas' }
];
const GRID_SIZE = 15;
/**
 * Advanced Crossword Generator using constraint satisfaction with dictionary
 */
class AdvancedCrosswordGenerator {
    constructor(seed) {
        this.grid = this.initializeGrid();
        this.slots = [];
        this.assignments = new Map();
        this.rng = this.createSeededRNG(seed);
        // Pick one theme word randomly
        const themeIndex = Math.floor(this.rng() * THEME_WORDS.length);
        this.themeWord = THEME_WORDS[themeIndex];
    }
    createSeededRNG(seed) {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        let current = Math.abs(hash) % 2147483647;
        return () => {
            current = (current * 16807) % 2147483647;
            return current / 2147483647;
        };
    }
    initializeGrid() {
        const grid = [];
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
    createSymmetricPattern() {
        // Create a simple symmetric pattern
        const numBlocks = 30 + Math.floor(this.rng() * 20); // 30-50 blocks
        const placed = new Set();
        for (let i = 0; i < numBlocks; i++) {
            const row = Math.floor(this.rng() * GRID_SIZE);
            const col = Math.floor(this.rng() * GRID_SIZE);
            const key = `${row},${col}`;
            if (!placed.has(key)) {
                // Place block and its symmetric counterpart
                this.grid[row][col].isBlocked = true;
                const symRow = GRID_SIZE - 1 - row;
                const symCol = GRID_SIZE - 1 - col;
                this.grid[symRow][symCol].isBlocked = true;
                placed.add(key);
                placed.add(`${symRow},${symCol}`);
            }
        }
    }
    findWordSlots() {
        const slots = [];
        let slotId = 0;
        // Find horizontal slots (across)
        for (let row = 0; row < GRID_SIZE; row++) {
            let start = -1;
            for (let col = 0; col <= GRID_SIZE; col++) {
                if (col === GRID_SIZE || this.grid[row][col].isBlocked) {
                    if (start !== -1 && col - start >= 3) {
                        slots.push({
                            id: `across_${slotId++}`,
                            row,
                            col: start,
                            direction: 'across',
                            length: col - start,
                            constraints: Array(col - start).fill(null),
                            intersections: []
                        });
                    }
                    start = -1;
                }
                else if (start === -1) {
                    start = col;
                }
            }
        }
        // Find vertical slots (down)
        for (let col = 0; col < GRID_SIZE; col++) {
            let start = -1;
            for (let row = 0; row <= GRID_SIZE; row++) {
                if (row === GRID_SIZE || this.grid[row][col].isBlocked) {
                    if (start !== -1 && row - start >= 3) {
                        slots.push({
                            id: `down_${slotId++}`,
                            row: start,
                            col,
                            direction: 'down',
                            length: row - start,
                            constraints: Array(row - start).fill(null),
                            intersections: []
                        });
                    }
                    start = -1;
                }
                else if (start === -1) {
                    start = row;
                }
            }
        }
        this.computeIntersections(slots);
        return slots;
    }
    computeIntersections(slots) {
        for (let i = 0; i < slots.length; i++) {
            for (let j = i + 1; j < slots.length; j++) {
                const slot1 = slots[i];
                const slot2 = slots[j];
                if (slot1.direction === slot2.direction)
                    continue;
                const intersection = this.findIntersection(slot1, slot2);
                if (intersection) {
                    slot1.intersections.push({
                        slotId: slot2.id,
                        myIndex: intersection.index1,
                        theirIndex: intersection.index2
                    });
                    slot2.intersections.push({
                        slotId: slot1.id,
                        myIndex: intersection.index2,
                        theirIndex: intersection.index1
                    });
                }
            }
        }
    }
    findIntersection(slot1, slot2) {
        if (slot1.direction === 'across' && slot2.direction === 'down') {
            const row = slot1.row;
            const col = slot2.col;
            if (row >= slot2.row && row < slot2.row + slot2.length &&
                col >= slot1.col && col < slot1.col + slot1.length) {
                return {
                    index1: col - slot1.col,
                    index2: row - slot2.row
                };
            }
        }
        else if (slot1.direction === 'down' && slot2.direction === 'across') {
            const row = slot2.row;
            const col = slot1.col;
            if (row >= slot1.row && row < slot1.row + slot1.length &&
                col >= slot2.col && col < slot2.col + slot2.length) {
                return {
                    index1: row - slot1.row,
                    index2: col - slot2.col
                };
            }
        }
        return null;
    }
    findValidWords(slot) {
        const constraints = slot.constraints;
        const length = slot.length;
        // Start with words of correct length
        let candidates = WORDS_BY_LENGTH.get(length) || [];
        // Apply constraint filtering
        candidates = candidates.filter(word => {
            for (let i = 0; i < constraints.length; i++) {
                if (constraints[i] !== null && word[i] !== constraints[i]) {
                    return false;
                }
            }
            return true;
        });
        // If we need specific starting/ending letters from intersections
        const firstConstraint = constraints[0];
        const lastConstraint = constraints[constraints.length - 1];
        if (firstConstraint) {
            const wordsWithFirst = WORDS_BY_FIRST_LETTER.get(firstConstraint) || [];
            candidates = candidates.filter(word => wordsWithFirst.includes(word));
        }
        if (lastConstraint) {
            const wordsWithLast = WORDS_BY_LAST_LETTER.get(lastConstraint) || [];
            candidates = candidates.filter(word => wordsWithLast.includes(word));
        }
        // Exclude already assigned words
        candidates = candidates.filter(word => !Array.from(this.assignments.values()).includes(word));
        // Additional validation: Check if this word would create valid intersections
        // This helps prevent getting stuck in invalid configurations
        // Temporarily disabled for performance - re-enable if needed
        // candidates = candidates.filter(word => this.wouldCreateValidIntersections(slot, word));
        return candidates;
    }
    wouldCreateValidIntersections(slot, word) {
        // For each intersection this slot has, check if the letter would be valid
        for (const intersection of slot.intersections) {
            const letter = word[intersection.myIndex];
            // Find the intersecting slot
            const otherSlot = this.slots.find(s => s.id === intersection.slotId);
            if (!otherSlot)
                continue;
            // If the other slot is already assigned, check consistency
            const otherWord = this.assignments.get(otherSlot.id);
            if (otherWord) {
                if (otherWord[intersection.theirIndex] !== letter) {
                    return false;
                }
            }
            else {
                // Check if there are enough valid words with this letter at that position
                const otherConstraints = [...otherSlot.constraints];
                otherConstraints[intersection.theirIndex] = letter;
                const potentialWords = WORDS_BY_LENGTH.get(otherSlot.length) || [];
                const validOptions = potentialWords.filter(otherCandidate => {
                    // Check all constraints
                    for (let i = 0; i < otherConstraints.length; i++) {
                        if (otherConstraints[i] !== null && otherCandidate[i] !== otherConstraints[i]) {
                            return false;
                        }
                    }
                    return !Array.from(this.assignments.values()).includes(otherCandidate);
                });
                // If there are no valid options for the intersecting slot, this word won't work
                if (validOptions.length === 0) {
                    return false;
                }
            }
        }
        return true;
    }
    assignWord(slot, word) {
        this.assignments.set(slot.id, word);
        // Update constraints for intersecting slots
        for (const intersection of slot.intersections) {
            const otherSlot = this.slots.find(s => s.id === intersection.slotId);
            if (otherSlot && !this.assignments.has(otherSlot.id)) {
                otherSlot.constraints[intersection.theirIndex] = word[intersection.myIndex];
            }
        }
    }
    unassignWord(slot) {
        const word = this.assignments.get(slot.id);
        if (!word)
            return;
        this.assignments.delete(slot.id);
        // Remove constraints from intersecting slots
        for (const intersection of slot.intersections) {
            const otherSlot = this.slots.find(s => s.id === intersection.slotId);
            if (otherSlot && !this.assignments.has(otherSlot.id)) {
                otherSlot.constraints[intersection.theirIndex] = null;
            }
        }
    }
    selectNextSlot() {
        const unassigned = this.slots.filter(slot => !this.assignments.has(slot.id));
        if (unassigned.length === 0)
            return null;
        // MRV: Choose slot with minimum remaining values
        let bestSlot = unassigned[0];
        let minValues = this.findValidWords(bestSlot).length;
        for (const slot of unassigned) {
            const validWords = this.findValidWords(slot).length;
            if (validWords < minValues) {
                minValues = validWords;
                bestSlot = slot;
            }
        }
        return bestSlot;
    }
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    solveCSP() {
        const slot = this.selectNextSlot();
        if (!slot)
            return true; // All slots assigned
        let validWords = this.findValidWords(slot);
        // Randomize word selection starting from random index
        const startIndex = Math.floor(this.rng() * validWords.length);
        const orderedWords = [...validWords.slice(startIndex), ...validWords.slice(0, startIndex)];
        for (const word of orderedWords) {
            // Try assigning this word
            this.assignWord(slot, word);
            // Check if assignment maintains consistency
            if (this.isConsistent()) {
                if (this.solveCSP()) {
                    return true; // Found solution
                }
            }
            // Backtrack
            this.unassignWord(slot);
        }
        return false; // No solution found
    }
    isConsistent() {
        // Check that all assigned intersections are consistent
        for (const slot of this.slots) {
            const word = this.assignments.get(slot.id);
            if (!word)
                continue;
            for (const intersection of slot.intersections) {
                const otherWord = this.assignments.get(intersection.slotId);
                if (otherWord) {
                    if (word[intersection.myIndex] !== otherWord[intersection.theirIndex]) {
                        return false;
                    }
                }
            }
        }
        // For now, return true to test basic generation
        // TODO: Re-enable validation once basic generation is working
        return true;
    }
    validateAllWordSequences() {
        // Create a temporary grid to track which positions need letters
        const tempGrid = [];
        const hasWordSlot = [];
        for (let i = 0; i < GRID_SIZE; i++) {
            tempGrid[i] = new Array(GRID_SIZE).fill(null);
            hasWordSlot[i] = new Array(GRID_SIZE).fill(false);
        }
        // Mark all positions that should have letters (part of any word slot)
        for (const slot of this.slots) {
            for (let i = 0; i < slot.length; i++) {
                const row = slot.direction === 'across' ? slot.row : slot.row + i;
                const col = slot.direction === 'across' ? slot.col + i : slot.col;
                hasWordSlot[row][col] = true;
            }
        }
        // Fill grid with assigned words
        for (const slot of this.slots) {
            const word = this.assignments.get(slot.id);
            if (!word)
                continue;
            for (let i = 0; i < word.length; i++) {
                const row = slot.direction === 'across' ? slot.row : slot.row + i;
                const col = slot.direction === 'across' ? slot.col + i : slot.col;
                tempGrid[row][col] = word[i];
            }
        }
        // Find all letter sequences and validate them
        return this.validateGridSequences(tempGrid, hasWordSlot);
    }
    validateGridSequences(tempGrid, hasWordSlot) {
        // Check all horizontal sequences
        for (let row = 0; row < GRID_SIZE; row++) {
            let sequence = '';
            let sequenceStart = -1;
            for (let col = 0; col <= GRID_SIZE; col++) {
                const isEndOfSequence = col === GRID_SIZE ||
                    this.grid[row][col].isBlocked ||
                    !hasWordSlot[row][col] ||
                    tempGrid[row][col] === null;
                if (isEndOfSequence) {
                    // Validate sequence if it has 2+ letters
                    if (sequence.length >= 2) {
                        const matchingSlot = this.findMatchingSlot(row, sequenceStart, sequence, 'across');
                        if (!matchingSlot) {
                            // This sequence doesn't correspond to a defined word slot
                            // For 2 letter sequences, we're more lenient (common prefixes/suffixes)
                            // For 3+ letter sequences, they must be valid dictionary words
                            if (sequence.length >= 3 && !DICTIONARY_WORDS.includes(sequence)) {
                                return false;
                            }
                            // For 2-letter sequences, check if they're common/valid combinations
                            if (sequence.length === 2 && !this.isValidTwoLetterSequence(sequence)) {
                                return false;
                            }
                        }
                    }
                    sequence = '';
                    sequenceStart = -1;
                }
                else {
                    if (sequenceStart === -1)
                        sequenceStart = col;
                    sequence += tempGrid[row][col];
                }
            }
        }
        // Check all vertical sequences
        for (let col = 0; col < GRID_SIZE; col++) {
            let sequence = '';
            let sequenceStart = -1;
            for (let row = 0; row <= GRID_SIZE; row++) {
                const isEndOfSequence = row === GRID_SIZE ||
                    this.grid[row][col].isBlocked ||
                    !hasWordSlot[row][col] ||
                    tempGrid[row][col] === null;
                if (isEndOfSequence) {
                    // Validate sequence if it has 2+ letters
                    if (sequence.length >= 2) {
                        const matchingSlot = this.findMatchingSlot(sequenceStart, col, sequence, 'down');
                        if (!matchingSlot) {
                            // This sequence doesn't correspond to a defined word slot
                            // For 2 letter sequences, we're more lenient (common prefixes/suffixes)
                            // For 3+ letter sequences, they must be valid dictionary words
                            if (sequence.length >= 3 && !DICTIONARY_WORDS.includes(sequence)) {
                                return false;
                            }
                            // For 2-letter sequences, check if they're common/valid combinations
                            if (sequence.length === 2 && !this.isValidTwoLetterSequence(sequence)) {
                                return false;
                            }
                        }
                    }
                    sequence = '';
                    sequenceStart = -1;
                }
                else {
                    if (sequenceStart === -1)
                        sequenceStart = row;
                    sequence += tempGrid[row][col];
                }
            }
        }
        return true;
    }
    findMatchingSlot(row, col, sequence, direction) {
        for (const slot of this.slots) {
            if (slot.direction !== direction)
                continue;
            if (direction === 'across') {
                if (slot.row === row && slot.col === col && slot.length === sequence.length) {
                    const word = this.assignments.get(slot.id);
                    if (word && word === sequence) {
                        return slot;
                    }
                }
            }
            else {
                if (slot.row === row && slot.col === col && slot.length === sequence.length) {
                    const word = this.assignments.get(slot.id);
                    if (word && word === sequence) {
                        return slot;
                    }
                }
            }
        }
        return null;
    }
    isValidTwoLetterSequence(sequence) {
        // Allow common 2-letter combinations that appear in English
        const validTwoLetterCombos = new Set([
            // Common prefixes
            'AD', 'AL', 'AM', 'AN', 'AR', 'AS', 'AT', 'BE', 'BY', 'DE', 'DO', 'EL', 'EN', 'EX',
            'GO', 'HE', 'IN', 'IS', 'IT', 'LA', 'LO', 'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'OX',
            'SO', 'TO', 'UP', 'US', 'WE',
            // Common suffixes and letter combinations
            'ED', 'ER', 'ES', 'ET', 'IC', 'ID', 'IF', 'IG', 'IL', 'IM', 'IP', 'IR', 'LE', 'LY',
            'ND', 'NG', 'NT', 'NU', 'OD', 'OG', 'OK', 'OL', 'OM', 'OP', 'OT', 'OW', 'OY',
            'RE', 'RY', 'ST', 'TH', 'UN', 'UR', 'UT', 'YE', 'YO',
            // Additional common letter combinations
            'AH', 'AI', 'AU', 'AW', 'AY', 'EH', 'EY', 'HI', 'HO', 'HM', 'OH', 'OO', 'UH', 'UM',
            'AB', 'AC', 'AF', 'AG', 'AK', 'AP', 'AQ', 'AV', 'AZ', 'EB', 'EF', 'EG', 'EK', 'EP',
            'IB', 'IF', 'IG', 'IK', 'IP', 'IQ', 'IV', 'IZ', 'OB', 'OF', 'OG', 'OK', 'OP', 'OQ',
            'UB', 'UF', 'UG', 'UK', 'UP', 'UQ', 'UV', 'UZ'
        ]);
        return validTwoLetterCombos.has(sequence.toUpperCase());
    }
    placeThemeWordFirst() {
        // Find a good slot for the theme word
        const suitableSlots = this.slots.filter(slot => slot.length === this.themeWord.word.length);
        if (suitableSlots.length === 0)
            return false;
        // Pick a random suitable slot
        const slotIndex = Math.floor(this.rng() * suitableSlots.length);
        const slot = suitableSlots[slotIndex];
        this.assignWord(slot, this.themeWord.word);
        return true;
    }
    generateClues() {
        const clues = [];
        let number = 1;
        // Sort slots by position for numbering
        const sortedSlots = [...this.slots].sort((a, b) => {
            if (a.row !== b.row)
                return a.row - b.row;
            return a.col - b.col;
        });
        const positionToNumber = new Map();
        for (const slot of sortedSlots) {
            const word = this.assignments.get(slot.id);
            if (!word)
                continue;
            const posKey = `${slot.row},${slot.col}`;
            if (!positionToNumber.has(posKey)) {
                positionToNumber.set(posKey, number++);
            }
            const clueNumber = positionToNumber.get(posKey);
            const isThemeWord = word === this.themeWord.word;
            clues.push({
                number: clueNumber,
                clue: isThemeWord ? this.themeWord.clue : 'Placeholder clue',
                answer: word,
                direction: slot.direction,
                startRow: slot.row,
                startCol: slot.col,
                length: word.length
            });
        }
        return clues.sort((a, b) => a.number - b.number);
    }
    fillGrid() {
        // Clear grid letters and numbers
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (!this.grid[row][col].isBlocked) {
                    this.grid[row][col].letter = null;
                    this.grid[row][col].number = null;
                }
            }
        }
        // Fill letters from assignments
        for (const slot of this.slots) {
            const word = this.assignments.get(slot.id);
            if (!word)
                continue;
            for (let i = 0; i < word.length; i++) {
                const row = slot.direction === 'across' ? slot.row : slot.row + i;
                const col = slot.direction === 'across' ? slot.col + i : slot.col;
                this.grid[row][col].letter = word[i];
            }
        }
        // Add clue numbers to starting positions
        this.addClueNumbers();
    }
    addClueNumbers() {
        // Sort slots by position for numbering (same logic as generateClues)
        const sortedSlots = [...this.slots].sort((a, b) => {
            if (a.row !== b.row)
                return a.row - b.row;
            return a.col - b.col;
        });
        const positionToNumber = new Map();
        let number = 1;
        for (const slot of sortedSlots) {
            const word = this.assignments.get(slot.id);
            if (!word)
                continue;
            const posKey = `${slot.row},${slot.col}`;
            if (!positionToNumber.has(posKey)) {
                positionToNumber.set(posKey, number);
                this.grid[slot.row][slot.col].number = number;
                number++;
            }
        }
    }
    generate() {
        // Step 1: Create symmetric block pattern
        this.createSymmetricPattern();
        // Step 2: Find all word slots
        this.slots = this.findWordSlots();
        // Step 3: Place theme word first
        if (!this.placeThemeWordFirst()) {
            console.warn('Could not place theme word');
        }
        // Step 4: Solve the constraint satisfaction problem with post-validation
        const maxAttempts = 10;
        let attempt = 0;
        let solved = false;
        while (attempt < maxAttempts && !solved) {
            console.log(`Puzzle generation attempt ${attempt + 1}/${maxAttempts}`);
            if (this.solveCSP()) {
                // Step 5: Fill grid with letters
                this.fillGrid();
                // Step 6: Validate all word sequences in the completed puzzle
                if (this.validateAllWordSequences()) {
                    console.log('✅ Puzzle generation successful with valid word sequences');
                    solved = true;
                    break;
                }
                else {
                    console.log('❌ Generated puzzle has invalid word sequences, retrying...');
                }
            }
            if (!solved) {
                console.log(`❌ Attempt ${attempt + 1} failed, retrying...`);
                // Reset and try again
                this.assignments.clear();
                for (const slot of this.slots) {
                    slot.constraints = Array(slot.length).fill(null);
                }
                // Reset the grid
                this.initializeGrid();
                this.createSymmetricPattern();
                if (!this.placeThemeWordFirst()) {
                    console.warn('Could not place theme word on attempt', attempt + 1);
                }
            }
            attempt++;
        }
        if (!solved) {
            console.warn(`⚠️  Could not generate valid puzzle after ${maxAttempts} attempts, using best attempt`);
            // If we couldn't get a perfect puzzle, use the last attempt
            this.fillGrid();
        }
        // Step 7: Generate clues
        const clues = this.generateClues();
        return {
            grid: this.grid,
            clues,
            size: { rows: GRID_SIZE, cols: GRID_SIZE }
        };
    }
}
function generateHybridDailyPuzzle(date) {
    const puzzleSecret = process.env.PUZZLE_SECRET || 'galactic-puzzle-secret';
    const seed = crypto_1.default.createHash('sha256').update(`${puzzleSecret}-${date}`).digest('hex');
    const generator = new AdvancedCrosswordGenerator(seed);
    return generator.generate();
}
//# sourceMappingURL=hybridGenerator.js.map