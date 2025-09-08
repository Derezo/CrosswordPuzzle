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
exports.StandardCrosswordGenerator = void 0;
exports.generateStandardDailyPuzzle = generateStandardDailyPuzzle;
const crypto = __importStar(require("crypto"));
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
        console.log(`📚 Loaded ${DICTIONARY_WORDS.length} words from dictionary`);
    }
    else {
        console.warn('Dictionary file not found, using fallback words');
        // Fallback word list
        DICTIONARY_WORDS = [
            'GALAXY', 'PLANET', 'STELLAR', 'COSMIC', 'NEBULA', 'METEOR', 'ORBIT', 'SATURN', 'COMET', 'SPACE',
            'STAR', 'MOON', 'MARS', 'VENUS', 'EARTH', 'SOLAR', 'SYSTEM', 'ASTRO', 'LIGHT', 'DARK',
            'TIME', 'LIFE', 'WORLD', 'LOVE', 'PEACE', 'POWER', 'FORCE', 'ENERGY', 'MAGIC', 'DREAM'
        ];
        for (const word of DICTIONARY_WORDS) {
            const len = word.length;
            if (!WORDS_BY_LENGTH.has(len))
                WORDS_BY_LENGTH.set(len, []);
            WORDS_BY_LENGTH.get(len).push(word);
        }
    }
}
catch (error) {
    console.warn('Could not load dictionary file:', error);
    // Use minimal fallback
    DICTIONARY_WORDS = ['GALAXY', 'PLANET', 'STAR', 'SPACE', 'COSMIC'];
    for (const word of DICTIONARY_WORDS) {
        const len = word.length;
        if (!WORDS_BY_LENGTH.has(len))
            WORDS_BY_LENGTH.set(len, []);
        WORDS_BY_LENGTH.get(len).push(word);
    }
}
const GRID_SIZE = 21; // Standard Sunday crossword size
const MIN_WORD_LENGTH = 3;
const MAX_BLACK_SQUARE_PERCENTAGE = 0.25; // 25% max black squares
class StandardCrosswordGenerator {
    constructor(seed) {
        // Create seeded random number generator
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        let seedValue = Math.abs(hash);
        this.rng = () => {
            seedValue = (seedValue * 9301 + 49297) % 233280;
            return seedValue / 233280;
        };
        this.grid = [];
        this.slots = [];
        this.assignments = new Map();
        this.themeWords = this.selectThemeWords();
        this.initializeGrid();
    }
    initializeGrid() {
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
    selectThemeWords() {
        const themes = [
            { word: 'GALAXY', clue: 'Star system' },
            { word: 'PLANET', clue: 'Celestial body' },
            { word: 'COSMIC', clue: 'Universal in scope' },
            { word: 'STELLAR', clue: 'Outstanding' },
            { word: 'NEBULA', clue: 'Interstellar cloud' },
            { word: 'METEOR', clue: 'Shooting star' },
            { word: 'ORBIT', clue: 'Circular path' },
            { word: 'SATURN', clue: 'Ringed planet' },
            { word: 'COMET', clue: 'Celestial visitor' },
            { word: 'SPACE', clue: 'Final frontier' }
        ];
        // Select 3-5 theme words
        const count = 3 + Math.floor(this.rng() * 3);
        const selected = [];
        for (let i = 0; i < count; i++) {
            const index = Math.floor(this.rng() * themes.length);
            selected.push(themes.splice(index, 1)[0]);
        }
        return selected;
    }
    createSymmetricPattern() {
        const center = Math.floor(GRID_SIZE / 2);
        const totalCells = GRID_SIZE * GRID_SIZE;
        const maxBlackSquares = Math.floor(totalCells * MAX_BLACK_SQUARE_PERCENTAGE);
        let blackSquareCount = 0;
        // Create a symmetric pattern
        for (let row = 0; row <= center; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                // Skip if we've reached max black squares
                if (blackSquareCount >= maxBlackSquares) {
                    continue;
                }
                // Randomly place black squares with some structure
                const shouldBlock = this.shouldPlaceBlackSquare(row, col);
                if (shouldBlock) {
                    // Place black square and its symmetric counterpart
                    this.grid[row][col].isBlocked = true;
                    this.grid[GRID_SIZE - 1 - row][GRID_SIZE - 1 - col].isBlocked = true;
                    blackSquareCount += (row === GRID_SIZE - 1 - row && col === GRID_SIZE - 1 - col) ? 1 : 2;
                }
            }
        }
        console.log(`Created symmetric pattern with ${blackSquareCount} black squares (${(blackSquareCount / totalCells * 100).toFixed(1)}%)`);
    }
    shouldPlaceBlackSquare(row, col) {
        // Avoid edges to ensure connectivity
        if (row === 0 || row === GRID_SIZE - 1 || col === 0 || col === GRID_SIZE - 1) {
            return this.rng() < 0.05; // Very low chance on edges
        }
        // Create some structure with clusters
        const distanceFromCenter = Math.abs(row - GRID_SIZE / 2) + Math.abs(col - GRID_SIZE / 2);
        const centerBias = 1 - (distanceFromCenter / (GRID_SIZE * 0.7));
        // Base probability adjusted by position
        let probability = 0.12 + (centerBias * 0.08);
        // Check surrounding area to avoid too many adjacent black squares
        let adjacentBlacks = 0;
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                const r = row + dr;
                const c = col + dc;
                if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && this.grid[r][c].isBlocked) {
                    adjacentBlacks++;
                }
            }
        }
        // Reduce probability if there are many nearby black squares
        probability *= Math.max(0.3, 1 - (adjacentBlacks * 0.2));
        return this.rng() < probability;
    }
    findWordSlots() {
        const slots = [];
        let slotId = 0;
        // Find horizontal slots (across)
        for (let row = 0; row < GRID_SIZE; row++) {
            let start = -1;
            for (let col = 0; col <= GRID_SIZE; col++) {
                if (col === GRID_SIZE || this.grid[row][col].isBlocked) {
                    if (start !== -1 && col - start >= MIN_WORD_LENGTH) {
                        slots.push({
                            id: `slot_${slotId++}`,
                            row,
                            col: start,
                            length: col - start,
                            direction: 'across',
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
                    if (start !== -1 && row - start >= MIN_WORD_LENGTH) {
                        slots.push({
                            id: `slot_${slotId++}`,
                            row: start,
                            col,
                            length: row - start,
                            direction: 'down',
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
        console.log(`Found ${slots.length} word slots (${slots.filter(s => s.direction === 'across').length} across, ${slots.filter(s => s.direction === 'down').length} down)`);
        this.computeIntersections(slots);
        // If structure was fixed, regenerate slots
        if (!this.validateCrosswordStructure(slots)) {
            console.log('🔄 Regenerating slots after structure fix');
            return this.findWordSlots(); // Recursive call after fixing structure
        }
        return slots;
    }
    computeIntersections(slots) {
        for (let i = 0; i < slots.length; i++) {
            for (let j = i + 1; j < slots.length; j++) {
                const slot1 = slots[i];
                const slot2 = slots[j];
                // Only across and down can intersect
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
        // Validate that every white square is part of exactly one across and one down word
        this.validateCrosswordStructure(slots);
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
    validateCrosswordStructure(slots) {
        // Create a grid to track coverage
        const acrossCoverage = [];
        const downCoverage = [];
        for (let i = 0; i < GRID_SIZE; i++) {
            acrossCoverage[i] = new Array(GRID_SIZE).fill(false);
            downCoverage[i] = new Array(GRID_SIZE).fill(false);
        }
        // Mark all slots
        for (const slot of slots) {
            for (let i = 0; i < slot.length; i++) {
                const row = slot.direction === 'across' ? slot.row : slot.row + i;
                const col = slot.direction === 'across' ? slot.col + i : slot.col;
                if (slot.direction === 'across') {
                    acrossCoverage[row][col] = true;
                }
                else {
                    downCoverage[row][col] = true;
                }
            }
        }
        // Fix violations by making uncovered squares black
        let fixed = 0;
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (!this.grid[row][col].isBlocked) {
                    if (!acrossCoverage[row][col] || !downCoverage[row][col]) {
                        // Make this square black to fix the structure
                        this.grid[row][col].isBlocked = true;
                        // Also make its symmetric counterpart black
                        const symRow = GRID_SIZE - 1 - row;
                        const symCol = GRID_SIZE - 1 - col;
                        if (symRow !== row || symCol !== col) {
                            this.grid[symRow][symCol].isBlocked = true;
                        }
                        fixed++;
                    }
                }
            }
        }
        if (fixed > 0) {
            console.log(`🔧 Fixed crossword structure by making ${fixed} squares black`);
            return false; // Need to regenerate slots
        }
        console.log('✅ Crossword structure validated - every white square has both across and down words');
        return true;
    }
    selectWordsForSlots() {
        // Sort slots by constraint level (most constrained first)
        const sortedSlots = [...this.slots].sort((a, b) => {
            // Prioritize theme words
            const aIsTheme = this.themeWords.some(t => t.word.length === a.length);
            const bIsTheme = this.themeWords.some(t => t.word.length === b.length);
            if (aIsTheme && !bIsTheme)
                return -1;
            if (!aIsTheme && bIsTheme)
                return 1;
            // Then by number of intersections (more constrained first)
            if (a.intersections.length !== b.intersections.length) {
                return b.intersections.length - a.intersections.length;
            }
            // Then by available word count (fewer options first)
            const aWords = WORDS_BY_LENGTH.get(a.length)?.length || 0;
            const bWords = WORDS_BY_LENGTH.get(b.length)?.length || 0;
            return aWords - bWords;
        });
        return this.fillSlots(sortedSlots, 0);
    }
    fillSlots(slots, index) {
        if (index >= slots.length) {
            return true; // All slots filled
        }
        const slot = slots[index];
        const candidates = this.getCandidateWords(slot);
        if (candidates.length === 0) {
            return false; // No candidates available
        }
        // Limit candidates for performance (take best matches)
        const limitedCandidates = candidates.slice(0, Math.min(50, candidates.length));
        const shuffledCandidates = this.shuffleArray(limitedCandidates);
        for (const word of shuffledCandidates) {
            if (this.canAssignWord(slot, word)) {
                this.assignWord(slot, word);
                if (this.fillSlots(slots, index + 1)) {
                    return true; // Success
                }
                this.unassignWord(slot);
            }
        }
        return false; // No valid assignment found
    }
    getCandidateWords(slot) {
        const length = slot.length;
        let candidates = WORDS_BY_LENGTH.get(length) || [];
        // Check for theme word opportunity
        const themeWord = this.themeWords.find(t => t.word.length === length && !this.assignments.has(slot.id));
        if (themeWord && !Array.from(this.assignments.values()).includes(themeWord.word)) {
            candidates = [themeWord.word, ...candidates.filter(w => w !== themeWord.word)];
        }
        // Apply intersection constraints
        const constraints = this.getConstraints(slot);
        candidates = candidates.filter(word => {
            for (let i = 0; i < constraints.length; i++) {
                if (constraints[i] !== null && word[i] !== constraints[i]) {
                    return false;
                }
            }
            return true;
        });
        // Remove already used words
        candidates = candidates.filter(word => !Array.from(this.assignments.values()).includes(word));
        return candidates;
    }
    getConstraints(slot) {
        const constraints = new Array(slot.length).fill(null);
        for (const intersection of slot.intersections) {
            const otherSlot = this.slots.find(s => s.id === intersection.slotId);
            const otherWord = otherSlot ? this.assignments.get(otherSlot.id) : null;
            if (otherWord) {
                constraints[intersection.myIndex] = otherWord[intersection.theirIndex];
            }
        }
        return constraints;
    }
    canAssignWord(slot, word) {
        const constraints = this.getConstraints(slot);
        for (let i = 0; i < word.length; i++) {
            if (constraints[i] !== null && word[i] !== constraints[i]) {
                return false;
            }
        }
        return !Array.from(this.assignments.values()).includes(word);
    }
    assignWord(slot, word) {
        this.assignments.set(slot.id, word);
        slot.word = word;
    }
    unassignWord(slot) {
        this.assignments.delete(slot.id);
        delete slot.word;
    }
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    fillGridWithWords() {
        for (const slot of this.slots) {
            const word = this.assignments.get(slot.id);
            if (word) {
                for (let i = 0; i < word.length; i++) {
                    const row = slot.direction === 'across' ? slot.row : slot.row + i;
                    const col = slot.direction === 'across' ? slot.col + i : slot.col;
                    this.grid[row][col].letter = word[i];
                }
            }
        }
    }
    addClueNumbers() {
        const numberedPositions = new Set();
        const cluePositions = [];
        // Collect all starting positions
        for (const slot of this.slots) {
            const posKey = `${slot.row},${slot.col}`;
            if (!numberedPositions.has(posKey)) {
                numberedPositions.add(posKey);
                cluePositions.push({ row: slot.row, col: slot.col, number: 0 });
            }
        }
        // Sort positions for numbering (left-to-right, top-to-bottom)
        cluePositions.sort((a, b) => {
            if (a.row !== b.row)
                return a.row - b.row;
            return a.col - b.col;
        });
        // Assign numbers
        cluePositions.forEach((pos, index) => {
            pos.number = index + 1;
            this.grid[pos.row][pos.col].number = index + 1;
        });
    }
    generateClues() {
        const clues = [];
        // First assign numbers to starting positions
        this.addClueNumbers();
        for (const slot of this.slots) {
            const word = this.assignments.get(slot.id);
            const number = this.grid[slot.row][slot.col].number;
            if (word && number) {
                // Check if this is a theme word
                const themeWord = this.themeWords.find(t => t.word === word);
                const clue = themeWord ? themeWord.clue : this.generateClueForWord(word);
                clues.push({
                    number,
                    clue,
                    answer: word,
                    direction: slot.direction,
                    startRow: slot.row,
                    startCol: slot.col,
                    length: word.length
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
    generateClueForWord(word) {
        // Simple clue generation - in a real implementation you'd have a clue database
        const clues = {
            // Common short words
            'THE': 'Article',
            'AND': 'Plus',
            'ARE': 'Exist',
            'ERA': 'Period',
            'EAR': 'Hearing organ',
            'EAT': 'Consume',
            'END': 'Finish',
            'ART': 'Creative work',
            'AGE': 'Years lived',
            'ACE': 'Expert',
            'ICE': 'Frozen water',
            'OWL': 'Night bird',
            'ELF': 'Mythical being',
            'EGG': 'Oval item',
            'ARM': 'Body part',
            'CAR': 'Vehicle',
            'CAT': 'Feline',
            'DOG': 'Canine',
            'HAT': 'Head covering',
            'BAT': 'Flying mammal',
            'RAT': 'Rodent',
            'SUN': 'Star',
            'RUN': 'Sprint',
            'WIN': 'Victory',
            'RED': 'Color',
            'TREE': 'Woody plant',
            'BLUE': 'Sky color',
            'BOOK': 'Reading material',
            'LOVE': 'Affection',
            'TIME': 'Duration',
            'WORD': 'Vocabulary unit',
            'STAR': 'Celestial body',
            'MOON': 'Earth\'s satellite',
            'FIRE': 'Flame',
            'WATER': 'H2O',
            'LIGHT': 'Illumination',
            'MUSIC': 'Sounds in harmony',
            'OCEAN': 'Large body of water',
            'RIVER': 'Flowing water',
            'HOUSE': 'Dwelling',
            'EARTH': 'Our planet'
        };
        return clues[word.toUpperCase()] || `Word: ${word}`;
    }
    generate() {
        const maxAttempts = 5;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`🎯 Generation attempt ${attempt}/${maxAttempts}`);
            // Step 1: Initialize
            this.initializeGrid();
            this.slots = [];
            this.assignments.clear();
            // Step 2: Create block pattern
            this.createSymmetricPattern();
            // Step 3: Find word slots (this will auto-fix structure)
            this.slots = this.findWordSlots();
            if (this.slots.length === 0) {
                console.warn('No valid word slots found');
                continue;
            }
            // Step 4: Fill slots with words
            console.log(`🔤 Filling ${this.slots.length} slots with words...`);
            const fillStartTime = Date.now();
            if (this.selectWordsForSlots()) {
                const fillTime = Date.now() - fillStartTime;
                console.log(`✅ Filled all slots in ${fillTime}ms`);
                console.log('✅ Successfully filled all slots');
                // Step 5: Fill grid and generate clues
                this.fillGridWithWords();
                const clues = this.generateClues();
                console.log(`🎉 Generated puzzle with ${clues.length} clues`);
                return {
                    grid: this.grid,
                    clues,
                    size: { rows: GRID_SIZE, cols: GRID_SIZE }
                };
            }
            else {
                console.log(`❌ Could not fill all slots on attempt ${attempt}`);
            }
        }
        // Fallback: create a minimal valid puzzle
        console.warn('⚠️ Using fallback generation');
        return this.createFallbackPuzzle();
    }
    createFallbackPuzzle() {
        this.initializeGrid();
        // Create a simple pattern with a few words
        const words = ['GALAXY', 'STAR', 'PLANET', 'SPACE'];
        const clues = [];
        // Place words in a simple cross pattern
        let number = 1;
        // Horizontal word in middle
        const midRow = Math.floor(GRID_SIZE / 2);
        const midCol = Math.floor(GRID_SIZE / 2) - 2;
        const word1 = words[0];
        for (let i = 0; i < word1.length; i++) {
            this.grid[midRow][midCol + i].letter = word1[i];
        }
        this.grid[midRow][midCol].number = number;
        clues.push({
            number: number++,
            clue: 'Star system',
            answer: word1,
            direction: 'across',
            startRow: midRow,
            startCol: midCol,
            length: word1.length
        });
        return {
            grid: this.grid,
            clues,
            size: { rows: GRID_SIZE, cols: GRID_SIZE }
        };
    }
}
exports.StandardCrosswordGenerator = StandardCrosswordGenerator;
function generateStandardDailyPuzzle(date) {
    const puzzleSecret = process.env.PUZZLE_SECRET || 'galactic-puzzle-secret';
    const seed = crypto.createHash('sha256').update(`${puzzleSecret}-${date}`).digest('hex');
    const generator = new StandardCrosswordGenerator(seed);
    return generator.generate();
}
//# sourceMappingURL=standardGenerator.js.map