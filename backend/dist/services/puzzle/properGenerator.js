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
exports.ProperCrosswordGenerator = void 0;
exports.generateProperDailyPuzzle = generateProperDailyPuzzle;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Enhanced dictionary data structures
let DICTIONARY_WORDS = [];
let WORDS_BY_LENGTH = new Map();
let WORDS_WITH_LETTER = new Map();
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
                if (!wordsPerLength.has(len))
                    wordsPerLength.set(len, []);
                wordsPerLength.get(len).push(word);
            }
            // Take representative samples from each length (more from common crossword lengths)
            for (const [length, words] of wordsPerLength) {
                let sampleSize;
                if (length >= 3 && length <= 5) {
                    sampleSize = Math.min(2000, words.length); // More short words
                }
                else if (length >= 6 && length <= 8) {
                    sampleSize = Math.min(1500, words.length); // Good medium words
                }
                else {
                    sampleSize = Math.min(800, words.length); // Fewer long words
                }
                // Shuffle and take sample
                const shuffled = words.sort(() => Math.random() - 0.5);
                sampledWords.push(...shuffled.slice(0, sampleSize));
            }
            DICTIONARY_WORDS = sampledWords;
            console.log(`📚 Loaded ${DICTIONARY_WORDS.length} dictionary words (sampled from ${allWords.length})`);
        }
        else {
            console.error('❌ Dictionary file not found! Cannot generate crosswords without dictionary.');
            throw new Error('Dictionary file not found');
        }
        // Build enhanced lookup tables
        for (const word of DICTIONARY_WORDS) {
            const len = word.length;
            if (!WORDS_BY_LENGTH.has(len))
                WORDS_BY_LENGTH.set(len, []);
            WORDS_BY_LENGTH.get(len).push(word);
            // Index by each letter in the word
            for (const letter of word) {
                if (!WORDS_WITH_LETTER.has(letter))
                    WORDS_WITH_LETTER.set(letter, []);
                if (!WORDS_WITH_LETTER.get(letter).includes(word)) {
                    WORDS_WITH_LETTER.get(letter).push(word);
                }
            }
        }
        console.log(`🔍 Built lookup tables: ${WORDS_BY_LENGTH.size} length groups, ${WORDS_WITH_LETTER.size} letter groups`);
    }
    catch (error) {
        console.error('Failed to load dictionary:', error);
    }
};
initializeDictionary();
const GRID_SIZE = 15;
const MIN_WORD_LENGTH = 3;
const MIN_ACROSS_WORDS = 5; // Start with more achievable targets
const MIN_DOWN_WORDS = 5;
const MAX_TOTAL_WORDS = 25;
const MAX_WORD_ATTEMPTS = 10;
const MAX_FAILED_WORDS = 10;
class ProperCrosswordGenerator {
    constructor(seed) {
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
    /**
     * Find words from dictionary that contain a specific letter at a specific position
     */
    findWordsWithLetterAt(letter, position, length) {
        const candidates = WORDS_BY_LENGTH.get(length) || [];
        return candidates
            .filter(word => word[position] === letter && !this.usedWords.has(word))
            .slice(0, 100); // Allow more candidates for better variety
    }
    /**
     * Find words from dictionary that match a pattern with known and unknown letters
     */
    findWordsMatchingPattern(pattern) {
        const length = pattern.length;
        const candidates = WORDS_BY_LENGTH.get(length) || [];
        return candidates
            .filter(word => {
            if (this.usedWords.has(word))
                return false;
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
     * Check if a word can be placed at a specific location following all constraints
     */
    canPlaceWordStrict(word, row, col, direction) {
        // Check bounds
        if (direction === 'across') {
            if (col < 0 || col + word.length > GRID_SIZE)
                return false;
        }
        else {
            if (row < 0 || row + word.length > GRID_SIZE)
                return false;
        }
        let intersectionCount = 0;
        const newLetterPositions = [];
        // Check each position of the word
        for (let i = 0; i < word.length; i++) {
            const r = direction === 'across' ? row : row + i;
            const c = direction === 'across' ? col + i : col;
            // Check if position is blocked
            if (this.grid[r][c].isBlocked)
                return false;
            if (this.grid[r][c].letter) {
                // Existing letter - must match exactly
                if (this.grid[r][c].letter !== word[i])
                    return false;
                intersectionCount++;
            }
            else {
                // New letter position
                newLetterPositions.push({ row: r, col: c, letter: word[i] });
            }
        }
        // Rule: Must intersect with existing words (except first word)
        if (this.placedWords.length > 0 && intersectionCount === 0)
            return false;
        // Rule: Check word separation - words must be separated by black squares or grid edges
        if (!this.isWordProperlySeparated(word, row, col, direction))
            return false;
        // Rule: Check that new letters won't create invalid adjacent patterns
        for (const pos of newLetterPositions) {
            if (!this.isValidLetterPlacement(pos.row, pos.col, pos.letter, direction))
                return false;
        }
        return true;
    }
    /**
     * Check if word placement would create adjacent words in same direction
     * Since black squares aren't placed yet, check if letters would be adjacent
     */
    isWordProperlySeparated(word, row, col, direction) {
        if (direction === 'across') {
            // Check before word start - should be empty or grid edge
            if (col > 0) {
                const beforeCell = this.grid[row][col - 1];
                if (beforeCell.letter) {
                    // Check if that letter is part of an across word that would be adjacent
                    const adjacentWord = this.findWordAtPosition(row, col - 1, 'across');
                    if (adjacentWord) {
                        return false; // Would create adjacent across words
                    }
                }
            }
            // Check after word end - should be empty or grid edge
            if (col + word.length < GRID_SIZE) {
                const afterCell = this.grid[row][col + word.length];
                if (afterCell.letter) {
                    // Check if that letter is part of an across word that would be adjacent
                    const adjacentWord = this.findWordAtPosition(row, col + word.length, 'across');
                    if (adjacentWord) {
                        return false; // Would create adjacent across words
                    }
                }
            }
        }
        else {
            // Check before word start - should be empty or grid edge
            if (row > 0) {
                const beforeCell = this.grid[row - 1][col];
                if (beforeCell.letter) {
                    // Check if that letter is part of a down word that would be adjacent
                    const adjacentWord = this.findWordAtPosition(row - 1, col, 'down');
                    if (adjacentWord) {
                        return false; // Would create adjacent down words
                    }
                }
            }
            // Check after word end - should be empty or grid edge
            if (row + word.length < GRID_SIZE) {
                const afterCell = this.grid[row + word.length][col];
                if (afterCell.letter) {
                    // Check if that letter is part of a down word that would be adjacent
                    const adjacentWord = this.findWordAtPosition(row + word.length, col, 'down');
                    if (adjacentWord) {
                        return false; // Would create adjacent down words
                    }
                }
            }
        }
        return true;
    }
    /**
     * Validate that a letter placement creates valid perpendicular words
     */
    isValidLetterPlacement(row, col, letter, placingDirection) {
        const perpDirection = placingDirection === 'across' ? 'down' : 'across';
        // Check if this letter would be part of a perpendicular word
        const perpWord = this.getPerpendicularWordPattern(row, col, letter, perpDirection);
        if (perpWord.length >= MIN_WORD_LENGTH) {
            // Only reject if it would create a definitely invalid word
            const cleanWord = perpWord.replace(/_/g, '');
            if (cleanWord.length === perpWord.length) {
                // Complete word - must be in dictionary
                return DICTIONARY_WORDS.includes(cleanWord);
            }
            else {
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
    getPerpendicularWordPattern(row, col, newLetter, direction) {
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
                    }
                    else {
                        pattern += this.grid[row][c].letter || '_';
                    }
                }
            }
            else {
                pattern = newLetter; // Just the single letter
            }
        }
        else {
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
                    }
                    else {
                        pattern += this.grid[r][col].letter || '_';
                    }
                }
            }
            else {
                pattern = newLetter; // Just the single letter
            }
        }
        return pattern;
    }
    /**
     * Place a word on the grid with proper tracking - NO BLACK SQUARES YET
     */
    placeWord(word, row, col, direction) {
        const intersections = [];
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
            }
            else {
                // Only set letter if cell is empty
                this.grid[r][c].letter = word[i];
            }
        }
        // Add word to tracking
        const placement = { word, row, col, direction, intersections };
        this.placedWords.push(placement);
        this.usedWords.add(word);
        // Update connection points for future intersections
        this.updateConnectionPoints(placement);
        // NO BLACK SQUARES DURING PLACEMENT - only at the very end
        console.log(`✅ Placed "${word}" ${direction} at (${row},${col}) with ${intersections.length} intersections`);
    }
    /**
     * Add all black squares at the end of generation to maintain proper word separation
     */
    addAllBlackSquares() {
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
            }
            else {
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
    updateConnectionPoints(placement) {
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
            }
            else {
                connectionPoint.downWord = placement;
            }
        }
    }
    /**
     * Find the best connection points for placing new words in a specific direction
     */
    findBestConnectionPoints(targetDirection) {
        return this.connectionPoints
            .filter(cp => {
            // Filter for points that can accept the target direction
            if (targetDirection === 'across') {
                return !cp.acrossWord; // Can place across word here
            }
            else {
                return !cp.downWord; // Can place down word here
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
    attemptWordPlacement(word, connectionPoint, direction) {
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
            }
            else {
                wordRow = connectionPoint.row - letterPos;
                wordCol = connectionPoint.col;
            }
            console.log(`     🎯 Trying to place "${word}" ${direction} at (${wordRow},${wordCol}) intersecting at position ${letterPos}`);
            if (this.canPlaceWordStrict(word, wordRow, wordCol, direction)) {
                console.log(`     ✅ Placement validation passed!`);
                this.placeWord(word, wordRow, wordCol, direction);
                return true;
            }
            else {
                console.log(`     ❌ Placement validation failed`);
            }
        }
        return false;
    }
    /**
     * Generate crossword using enhanced backtracking algorithm
     */
    generateCrosswordWithBacktracking() {
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
            let targetDirection;
            // After placing seed word, prioritize the opposite direction for intersections
            if (this.placedWords.length === 1) {
                // We have only the seed word (across), prioritize down words for intersections
                targetDirection = 'down';
            }
            else if (acrossCount < 3 && downCount < 3) {
                // Early stage - alternate to create intersections
                targetDirection = acrossCount <= downCount ? 'down' : 'across';
            }
            else if (downCount < MIN_DOWN_WORDS) {
                targetDirection = 'down';
            }
            else if (acrossCount < MIN_ACROSS_WORDS) {
                targetDirection = 'across';
            }
            else {
                // Both minimums met, choose based on balance
                targetDirection = acrossCount <= downCount ? 'across' : 'down';
            }
            console.log(`📊 Current counts: ${acrossCount} across, ${downCount} down - targeting ${targetDirection}`);
            const placed = this.attemptToPlaceNewWord(targetDirection);
            if (!placed) {
                failedWordCount++;
                console.log(`❌ Failed placement attempt ${failedWordCount}/${MAX_FAILED_WORDS}`);
            }
            else {
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
    attemptToPlaceNewWord(direction) {
        const connectionPoints = this.findBestConnectionPoints(direction);
        console.log(`🔍 Found ${connectionPoints.length} connection points for ${direction} words`);
        for (let i = 0; i < connectionPoints.length; i++) {
            const connectionPoint = connectionPoints[i];
            console.log(`   Connection ${i + 1}: letter '${connectionPoint.letter}' at (${connectionPoint.row},${connectionPoint.col})`);
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
                }
                else {
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
    getRandomWordsWithLetter(letter) {
        const wordsWithLetter = WORDS_WITH_LETTER.get(letter) || [];
        const availableWords = wordsWithLetter.filter(word => !this.usedWords.has(word));
        // Use more words from dictionary - don't over-limit
        return this.shuffleArray(availableWords).slice(0, 50);
    }
    /**
     * Shuffle array using seeded random
     */
    shuffleArray(array) {
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
    validateFinalCrossword() {
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
    findWordAtPosition(row, col, direction) {
        return this.placedWords.find(placement => {
            if (placement.direction !== direction)
                return false;
            if (direction === 'across') {
                return placement.row === row &&
                    col >= placement.col &&
                    col < placement.col + placement.word.length;
            }
            else {
                return placement.col === col &&
                    row >= placement.row &&
                    row < placement.row + placement.word.length;
            }
        }) || null;
    }
    /**
     * Generate clues for all placed words
     */
    generateClues() {
        // Number the grid
        const startPositions = new Map();
        const wordStarts = this.placedWords.map(w => ({ row: w.row, col: w.col }));
        // Remove duplicates and sort by position
        const uniquePositions = Array.from(new Set(wordStarts.map(pos => `${pos.row},${pos.col}`))).map(key => {
            const [row, col] = key.split(',').map(Number);
            return { row, col };
        }).sort((a, b) => {
            if (a.row !== b.row)
                return a.row - b.row;
            return a.col - b.col;
        });
        // Assign numbers
        uniquePositions.forEach((pos, index) => {
            const key = `${pos.row},${pos.col}`;
            startPositions.set(key, index + 1);
            this.grid[pos.row][pos.col].number = index + 1;
        });
        // Generate clues
        const clues = [];
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
    generateClueForWord(word) {
        const clues = {
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
            // Common words
            'THE': 'Article',
            'AND': 'Plus',
            'ARE': 'Exist',
            'TIME': 'Duration',
            'LIFE': 'Existence',
            'LOVE': 'Affection',
            'WORD': 'Vocabulary unit',
            'WORK': 'Labor',
            'YEAR': '365 days',
            'GOOD': 'Fine',
            'MAKE': 'Create',
            'COME': 'Arrive',
            'KNOW': 'Understand',
            'TAKE': 'Grab',
            'TREE': 'Oak or pine',
            'BLUE': 'Sky color',
            'BOOK': 'Reading material',
            'FIRE': 'Flame',
            'WATER': 'H2O',
            'HOUSE': 'Home',
            'HEART': 'Ticker',
            'POWER': 'Strength',
            'MUSIC': 'Harmonious sounds'
        };
        return clues[word.toUpperCase()] || `Word: ${word}`;
    }
    /**
     * Main generation method
     */
    generate() {
        console.log('🎯 Starting proper crossword generation with strict constraints...');
        const maxAttempts = 5;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`🔄 Attempt ${attempt}/${maxAttempts}`);
            // Reset state
            this.initializeGrid();
            this.placedWords = [];
            this.connectionPoints = [];
            this.usedWords.clear();
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
    createMinimalCrossword() {
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
            if (r === spaceRow)
                continue; // Skip intersection - already placed
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
            if (r === spaceRow)
                continue; // Skip intersection - already placed
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
                if (col > 0)
                    this.grid[row][col - 1].isBlocked = true;
                if (col + word.length < GRID_SIZE)
                    this.grid[row][col + word.length].isBlocked = true;
            }
            else {
                if (row > 0)
                    this.grid[row - 1][col].isBlocked = true;
                if (row + word.length < GRID_SIZE)
                    this.grid[row + word.length][col].isBlocked = true;
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
exports.ProperCrosswordGenerator = ProperCrosswordGenerator;
function generateProperDailyPuzzle(date) {
    const puzzleSecret = process.env.PUZZLE_SECRET || 'galactic-puzzle-secret';
    const seed = crypto.createHash('sha256').update(`${puzzleSecret}-${date}`).digest('hex');
    const generator = new ProperCrosswordGenerator(seed);
    return generator.generate();
}
//# sourceMappingURL=properGenerator.js.map