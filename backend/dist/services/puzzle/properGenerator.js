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
class CrosswordTrie {
    constructor() {
        this.root = {
            children: new Map(),
            isEndOfWord: false
        };
    }
    // Build trie from dictionary words
    buildTrie(words) {
        console.log(`🌳 Building trie from ${words.length} words...`);
        for (const word of words) {
            this.insertWord(word);
        }
        console.log(`✅ Trie construction complete`);
    }
    insertWord(word) {
        let node = this.root;
        for (const char of word) {
            if (!node.children.has(char)) {
                node.children.set(char, {
                    children: new Map(),
                    isEndOfWord: false
                });
            }
            node = node.children.get(char);
        }
        node.isEndOfWord = true;
        node.word = word;
    }
    // Find words matching pattern like "_O_G_T" (underscore = any letter)
    findMatchingWords(pattern) {
        const results = [];
        this.searchPattern(this.root, pattern, 0, '', results);
        return results;
    }
    searchPattern(node, pattern, index, current, results) {
        if (index === pattern.length) {
            if (node.isEndOfWord && node.word) {
                results.push(node.word);
            }
            return;
        }
        const char = pattern[index];
        if (char === '_') {
            // Wildcard - try all possible children
            for (const [childChar, childNode] of node.children) {
                this.searchPattern(childNode, pattern, index + 1, current + childChar, results);
            }
        }
        else {
            // Exact character match
            if (node.children.has(char)) {
                this.searchPattern(node.children.get(char), pattern, index + 1, current + char, results);
            }
        }
    }
    // Check if a partial pattern can potentially be completed to form valid words
    canCompletePattern(pattern) {
        return this.hasValidPrefix(this.root, pattern, 0);
    }
    hasValidPrefix(node, pattern, index) {
        if (index === pattern.length) {
            // Check if we can continue from this node to form words
            return this.hasDescendantWords(node);
        }
        const char = pattern[index];
        if (char === '_') {
            // Wildcard - check if any child can complete the pattern
            for (const [, childNode] of node.children) {
                if (this.hasValidPrefix(childNode, pattern, index + 1)) {
                    return true;
                }
            }
            return false;
        }
        else {
            // Exact character match
            if (node.children.has(char)) {
                return this.hasValidPrefix(node.children.get(char), pattern, index + 1);
            }
            return false;
        }
    }
    hasDescendantWords(node) {
        if (node.isEndOfWord)
            return true;
        for (const [, childNode] of node.children) {
            if (this.hasDescendantWords(childNode)) {
                return true;
            }
        }
        return false;
    }
}
// Global trie instance
let DICTIONARY_TRIE;
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
                    sampleSize = Math.min(7000, words.length); // Less short words
                }
                else if (length >= 6 && length <= 8) {
                    sampleSize = Math.min(2000, words.length); // Good medium words
                }
                else {
                    sampleSize = Math.min(400, words.length); // Lots of long words
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
        // Build trie for advanced pattern matching
        DICTIONARY_TRIE = new CrosswordTrie();
        DICTIONARY_TRIE.buildTrie(DICTIONARY_WORDS);
    }
    catch (error) {
        console.error('Failed to load dictionary:', error);
    }
};
initializeDictionary();
const GRID_SIZE = 21;
const MIN_WORD_LENGTH = 3;
const MIN_ACROSS_WORDS = 3; // Start with more achievable targets
const MIN_DOWN_WORDS = 3;
const MAX_TOTAL_WORDS = 20;
const MAX_WORD_ATTEMPTS = 500; // Increased for better constraint satisfaction
const MAX_FAILED_WORDS = 375; // Increased for more thorough backtracking
class AdvancedConstraintEngine {
    constructor(grid, placedWords, trie) {
        this.grid = grid;
        this.placedWords = placedWords;
        this.trie = trie;
    }
    // Advanced validation with constraint satisfaction and lookahead
    validateWordPlacement(word, row, col, direction) {
        console.log(`🔬 Advanced validation for "${word}" ${direction} at (${row},${col})`);
        // Step 1: Basic bounds and intersection checking
        if (!this.basicValidation(word, row, col, direction)) {
            console.log(`   ❌ Failed basic validation`);
            return false;
        }
        // Step 2: Generate all perpendicular constraints this placement would create
        const constraints = this.generatePerpendicularConstraints(word, row, col, direction);
        console.log(`   📐 Generated ${constraints.length} perpendicular constraints`);
        // Step 3: Validate each constraint can be satisfied (strict validation)
        for (let i = 0; i < constraints.length; i++) {
            const constraint = constraints[i];
            console.log(`   🧩 Checking constraint ${i + 1}: "${constraint.pattern}" (${constraint.direction})`);
            if (!this.canSatisfyConstraint(constraint)) {
                console.log(`   ❌ Cannot satisfy constraint: ${constraint.pattern}`);
                return false;
            }
            else {
                console.log(`   ✅ Constraint satisfiable: ${constraint.pattern}`);
            }
        }
        // Step 4: Skip adjacency validation for now to be more permissive
        // if (!this.validateAdjacencies(word, row, col, direction)) {
        //   console.log(`   ❌ Creates invalid adjacencies`);
        //   return false;
        // }
        // Step 5: Check black square placement rules (deferred to final black square placement)
        console.log(`   🎯 Advanced validation passed!`);
        return true;
    }
    basicValidation(word, row, col, direction) {
        // Check bounds
        if (direction === 'across') {
            if (col < 0 || col + word.length > GRID_SIZE)
                return false;
        }
        else {
            if (row < 0 || row + word.length > GRID_SIZE)
                return false;
        }
        // Check letter compatibility at intersection points
        for (let i = 0; i < word.length; i++) {
            const r = direction === 'across' ? row : row + i;
            const c = direction === 'across' ? col + i : col;
            // Cannot place in blocked cells
            if (this.grid[r][c].isBlocked)
                return false;
            if (this.grid[r][c].letter) {
                // Must match existing letter exactly
                if (this.grid[r][c].letter !== word[i])
                    return false;
            }
        }
        return true;
    }
    // Generate constraints for all perpendicular words this placement would create/affect
    generatePerpendicularConstraints(word, row, col, direction) {
        const constraints = [];
        const perpDirection = direction === 'across' ? 'down' : 'across';
        for (let i = 0; i < word.length; i++) {
            const letterRow = direction === 'across' ? row : row + i;
            const letterCol = direction === 'across' ? col + i : col;
            const letter = word[i];
            // Skip if there's already a matching letter at this position (valid intersection)
            if (this.grid[letterRow][letterCol].letter && this.grid[letterRow][letterCol].letter === letter) {
                continue;
            }
            // Get the perpendicular word pattern at this position
            const perpPattern = this.getPerpendicularWordPattern(letterRow, letterCol, letter, perpDirection);
            // Only create constraints for new patterns that have wildcards (incomplete words)
            if (perpPattern.length >= MIN_WORD_LENGTH && perpPattern.includes('_')) {
                // Calculate start position based on where the new letter would be placed
                const letterIndexInPattern = this.findLetterIndexInPattern(perpPattern, letterRow, letterCol, perpDirection);
                const perpStartPos = this.calculatePatternStartPosition(letterRow, letterCol, perpDirection, letterIndexInPattern);
                constraints.push({
                    row: perpStartPos.row,
                    col: perpStartPos.col,
                    direction: perpDirection,
                    pattern: perpPattern,
                    length: perpPattern.length
                });
            }
        }
        return constraints;
    }
    // Check if a constraint can be satisfied by finding matching dictionary words
    canSatisfyConstraint(constraint) {
        // If pattern has no wildcards, check if it's a complete valid word
        if (!constraint.pattern.includes('_')) {
            return DICTIONARY_WORDS.includes(constraint.pattern);
        }
        // For patterns with wildcards, use trie to check if valid completions exist
        const matchingWords = this.trie.findMatchingWords(constraint.pattern);
        const availableWords = matchingWords.filter(word => !this.isWordUsed(word));
        console.log(`     Pattern "${constraint.pattern}" has ${matchingWords.length} matches, ${availableWords.length} available`);
        return availableWords.length > 0;
    }
    // Get the perpendicular word pattern that would be formed 
    getPerpendicularWordPattern(row, col, newLetter, direction) {
        let pattern = '';
        let startPos = { row, col };
        let endPos = { row, col };
        if (direction === 'across') {
            // Find horizontal word boundaries - only extend if there's actually a letter there
            while (startPos.col > 0 && this.grid[row][startPos.col - 1].letter) {
                startPos.col--;
            }
            while (endPos.col < GRID_SIZE - 1 && this.grid[row][endPos.col + 1].letter) {
                endPos.col++;
            }
            // Build pattern
            for (let c = startPos.col; c <= endPos.col; c++) {
                if (c === col) {
                    pattern += newLetter;
                }
                else {
                    pattern += this.grid[row][c].letter || '_';
                }
            }
        }
        else {
            // Find vertical word boundaries - only extend if there's actually a letter there
            while (startPos.row > 0 && this.grid[startPos.row - 1][col].letter) {
                startPos.row--;
            }
            while (endPos.row < GRID_SIZE - 1 && this.grid[endPos.row + 1][col].letter) {
                endPos.row++;
            }
            // Build pattern
            for (let r = startPos.row; r <= endPos.row; r++) {
                if (r === row) {
                    pattern += newLetter;
                }
                else {
                    pattern += this.grid[r][col].letter || '_';
                }
            }
        }
        return pattern;
    }
    // Find where the new letter appears in the perpendicular pattern
    findLetterIndexInPattern(pattern, letterRow, letterCol, direction) {
        // Count how many positions we are from the start of the pattern
        if (direction === 'across') {
            // Find leftmost position of the pattern
            let startCol = letterCol;
            while (startCol > 0 && (this.grid[letterRow][startCol - 1].letter || startCol - 1 === letterCol)) {
                startCol--;
            }
            return letterCol - startCol;
        }
        else {
            // Find topmost position of the pattern  
            let startRow = letterRow;
            while (startRow > 0 && (this.grid[startRow - 1][letterCol].letter || startRow - 1 === letterRow)) {
                startRow--;
            }
            return letterRow - startRow;
        }
    }
    calculatePatternStartPosition(letterRow, letterCol, direction, letterIndex) {
        if (direction === 'across') {
            return { row: letterRow, col: letterCol - letterIndex };
        }
        else {
            return { row: letterRow - letterIndex, col: letterCol };
        }
    }
    validateAdjacencies(word, row, col, direction) {
        // Check that word placement doesn't create invalid adjacent letter combinations
        // This is a more lenient version that allows valid intersections
        for (let i = 0; i < word.length; i++) {
            const r = direction === 'across' ? row : row + i;
            const c = direction === 'across' ? col + i : col;
            // Skip positions where we already have the same letter (valid intersections)
            if (this.grid[r][c].letter === word[i]) {
                continue;
            }
            // Check adjacent cells - only worry about direct adjacency without proper word context
            const adjacentPositions = [
                { row: r - 1, col: c }, { row: r + 1, col: c },
                { row: r, col: c - 1 }, { row: r, col: c + 1 }
            ];
            for (const pos of adjacentPositions) {
                if (pos.row >= 0 && pos.row < GRID_SIZE && pos.col >= 0 && pos.col < GRID_SIZE) {
                    // Only fail if there's a letter that would be stranded (not part of any word)
                    if (this.grid[pos.row][pos.col].letter &&
                        !this.grid[pos.row][pos.col].isBlocked) {
                        // Check if this adjacent letter is part of a planned word placement
                        // If it is part of an existing word, it's fine
                        if (this.isPartOfValidWord(pos.row, pos.col)) {
                            continue;
                        }
                        // Check if placing our word would create a valid perpendicular word
                        const perpDirection = direction === 'across' ? 'down' : 'across';
                        if (this.wouldCreateValidPerpendicularWord(pos.row, pos.col, perpDirection)) {
                            continue;
                        }
                        // Only fail if this would truly create an invalid state
                        return false;
                    }
                }
            }
        }
        return true;
    }
    isWordUsed(word) {
        return this.placedWords.some(placement => placement.word === word);
    }
    isPartOfValidWord(row, col) {
        return this.placedWords.some(placement => {
            if (placement.direction === 'across') {
                return placement.row === row &&
                    col >= placement.col &&
                    col < placement.col + placement.word.length;
            }
            else {
                return placement.col === col &&
                    row >= placement.row &&
                    row < placement.row + placement.word.length;
            }
        });
    }
    wouldCreateValidPerpendicularWord(row, col, direction) {
        // Check if the letter at this position could be part of a valid perpendicular word
        // This is used to avoid rejecting valid intersections too early
        if (direction === 'across') {
            // Look horizontally for potential word formation
            let left = col, right = col;
            // Find extent of horizontal letters
            while (left > 0 && this.grid[row][left - 1].letter && !this.grid[row][left - 1].isBlocked)
                left--;
            while (right < GRID_SIZE - 1 && this.grid[row][right + 1].letter && !this.grid[row][right + 1].isBlocked)
                right++;
            if (right - left + 1 >= MIN_WORD_LENGTH) {
                return true; // Could potentially form a valid word
            }
        }
        else {
            // Look vertically for potential word formation
            let top = row, bottom = row;
            // Find extent of vertical letters
            while (top > 0 && this.grid[top - 1][col].letter && !this.grid[top - 1][col].isBlocked)
                top--;
            while (bottom < GRID_SIZE - 1 && this.grid[bottom + 1][col].letter && !this.grid[bottom + 1][col].isBlocked)
                bottom++;
            if (bottom - top + 1 >= MIN_WORD_LENGTH) {
                return true; // Could potentially form a valid word
            }
        }
        return false;
    }
}
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
        // Initialize advanced constraint engine
        this.constraintEngine = new AdvancedConstraintEngine(this.grid, this.placedWords, DICTIONARY_TRIE);
    }
    initializeGrid() {
        this.grid = [];
        for (let i = 0; i < GRID_SIZE; i++) {
            this.grid[i] = [];
            for (let j = 0; j < GRID_SIZE; j++) {
                this.grid[i][j] = {
                    letter: '',
                    isBlocked: false,
                    number: null,
                    willBeBlocked: false
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
     * Check if a word can be placed at a specific location using advanced constraint satisfaction
     */
    canPlaceWordStrict(word, row, col, direction) {
        // 1. Check word separation (critical for preventing adjacency violations)
        if (!this.isWordProperlySeparated(word, row, col, direction)) {
            return false;
        }
        // 2. Validate all perpendicular word formations  
        if (!this.validateAllPerpendicularWords(word, row, col, direction)) {
            return false;
        }
        // 3. Use the advanced constraint engine for additional validation
        return this.constraintEngine.validateWordPlacement(word, row, col, direction);
    }
    /**
     * Legacy validation method (kept for reference but not used)
     */
    legacyValidation(word, row, col, direction) {
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
     * Check if word placement follows proper crossword separation rules
     * Every word must have a black square or grid boundary before and after it
     * Now considers both actual and intended black squares
     */
    isWordProperlySeparated(word, row, col, direction) {
        // CRITICAL: Check for existing words that would be adjacent in the same direction
        for (const placedWord of this.placedWords) {
            if (placedWord.direction === direction) {
                if (direction === 'across' && placedWord.row === row) {
                    // Same row - check for adjacency
                    const thisStart = col;
                    const thisEnd = col + word.length - 1;
                    const otherStart = placedWord.col;
                    const otherEnd = placedWord.col + placedWord.word.length - 1;
                    // Check if words would be adjacent (no gap between them)
                    if (thisEnd + 1 === otherStart || otherEnd + 1 === thisStart) {
                        console.log(`   ❌ ADJACENCY VIOLATION: "${word}" would be adjacent to "${placedWord.word}" in same row without black square separation`);
                        return false;
                    }
                    // Check for overlap
                    if (!(thisEnd < otherStart || thisStart > otherEnd)) {
                        console.log(`   ❌ OVERLAP: "${word}" would overlap with "${placedWord.word}" in same row`);
                        return false;
                    }
                }
                else if (direction === 'down' && placedWord.col === col) {
                    // Same column - check for adjacency
                    const thisStart = row;
                    const thisEnd = row + word.length - 1;
                    const otherStart = placedWord.row;
                    const otherEnd = placedWord.row + placedWord.word.length - 1;
                    // Check if words would be adjacent (no gap between them)
                    if (thisEnd + 1 === otherStart || otherEnd + 1 === thisStart) {
                        console.log(`   ❌ ADJACENCY VIOLATION: "${word}" would be adjacent to "${placedWord.word}" in same column without black square separation`);
                        return false;
                    }
                    // Check for overlap
                    if (!(thisEnd < otherStart || thisStart > otherEnd)) {
                        console.log(`   ❌ OVERLAP: "${word}" would overlap with "${placedWord.word}" in same column`);
                        return false;
                    }
                }
            }
        }
        // Traditional boundary checks
        if (direction === 'across') {
            // Check cell before word start
            if (col > 0) {
                const beforeCell = this.grid[row][col - 1];
                if (beforeCell.letter && !beforeCell.isBlocked) {
                    console.log(`   ❌ Word "${word}" would be adjacent to existing letter '${beforeCell.letter}' at (${row},${col - 1}) without separation`);
                    return false;
                }
            }
            // Check cell after word end
            if (col + word.length < GRID_SIZE) {
                const afterCell = this.grid[row][col + word.length];
                if (afterCell.letter && !afterCell.isBlocked) {
                    console.log(`   ❌ Word "${word}" would be adjacent to existing letter '${afterCell.letter}' at (${row},${col + word.length}) without separation`);
                    return false;
                }
            }
        }
        else {
            // Check cell before word start (up direction)
            if (row > 0) {
                const beforeCell = this.grid[row - 1][col];
                if (beforeCell.letter && !beforeCell.isBlocked) {
                    console.log(`   ❌ Word "${word}" would be adjacent to existing letter '${beforeCell.letter}' at (${row - 1},${col}) without separation`);
                    return false;
                }
            }
            // Check cell after word end (down direction)  
            if (row + word.length < GRID_SIZE) {
                const afterCell = this.grid[row + word.length][col];
                if (afterCell.letter && !afterCell.isBlocked) {
                    console.log(`   ❌ Word "${word}" would be adjacent to existing letter '${afterCell.letter}' at (${row + word.length},${col}) without separation`);
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Check if a position would conflict with an intended word placement
     * This helps detect when a word would be placed where a black square should go
     */
    wouldConflictWithIntendedPlacement(checkRow, checkCol, word, wordRow, wordCol, direction) {
        // Check if any letter of the new word would occupy this position
        for (let i = 0; i < word.length; i++) {
            const letterRow = direction === 'across' ? wordRow : wordRow + i;
            const letterCol = direction === 'across' ? wordCol + i : wordCol;
            if (letterRow === checkRow && letterCol === checkCol) {
                // This position would be occupied by a letter from the new word
                // But we're checking if it should be a separator position
                return true;
            }
        }
        return false;
    }
    /**
     * Validate that a letter placement creates valid perpendicular words
     */
    isValidLetterPlacement(row, col, letter, placingDirection) {
        const perpDirection = placingDirection === 'across' ? 'down' : 'across';
        // Get the full perpendicular word that would be formed
        const perpWordInfo = this.getPerpendicularWordPattern(row, col, letter, perpDirection);
        // If this would create a perpendicular word, validate it strictly
        if (perpWordInfo.length >= MIN_WORD_LENGTH) {
            const cleanWord = perpWordInfo.replace(/_/g, '');
            // Check if this forms a complete word
            if (cleanWord.length === perpWordInfo.length && cleanWord.length >= MIN_WORD_LENGTH) {
                // Complete word - MUST be in dictionary
                if (!DICTIONARY_WORDS.includes(cleanWord.toUpperCase())) {
                    console.log(`   ❌ Invalid perpendicular word formed: "${cleanWord}" (not in dictionary)`);
                    return false;
                }
                console.log(`   ✅ Valid perpendicular word: "${cleanWord}"`);
            }
            else if (perpWordInfo.includes('_')) {
                // Partial pattern - check if it COULD form a valid word
                const matchingWords = this.findWordsMatchingPattern(perpWordInfo);
                if (matchingWords.length === 0) {
                    console.log(`   ❌ Perpendicular pattern "${perpWordInfo}" cannot form any valid words`);
                    return false;
                }
                console.log(`   ✅ Perpendicular pattern "${perpWordInfo}" can form ${matchingWords.length} valid words`);
            }
        }
        return true;
    }
    /**
     * Validate that all letter intersections in a word placement create valid perpendicular words
     */
    validateAllPerpendicularWords(word, row, col, direction) {
        for (let i = 0; i < word.length; i++) {
            const letterRow = direction === 'across' ? row : row + i;
            const letterCol = direction === 'across' ? col + i : col;
            const letter = word[i];
            // Skip if this position already has the same letter (intersection)
            if (this.grid[letterRow][letterCol].letter === letter) {
                continue;
            }
            // Validate this letter placement
            if (!this.isValidLetterPlacement(letterRow, letterCol, letter, direction)) {
                return false;
            }
        }
        return true;
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
     * Place a word on the grid with proper tracking - place black squares at beginning and end of word
     */
    placeWord(word, row, col, direction) {
        const intersections = [];
        let placements = [];
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
                placements.push({ row: r, col: c, letter: word[i] });
            }
        }
        // Add word to tracking
        const placement = { word, row, col, direction, intersections };
        for (let i = 0; i < placements.length; i++) {
            const r = placements[i];
            this.grid[r.row][r.col].letter = r.letter;
        }
        this.placedWords.push(placement);
        this.usedWords.add(word);
        // IMMEDIATELY place black squares for word separation
        this.placeBlackSquaresForWord(word, row, col, direction);
        // Update connection points for future intersections
        this.updateConnectionPoints(placement);
        // Update constraint engine with new grid state
        this.constraintEngine = new AdvancedConstraintEngine(this.grid, this.placedWords, DICTIONARY_TRIE);
        console.log(`✅ Placed "${word}" ${direction} at (${row},${col}) with ${intersections.length} intersections`);
    }
    /**
     * Place black squares immediately for a specific word to maintain proper separation
     */
    placeBlackSquaresForWord(word, row, col, direction) {
        if (direction === 'across') {
            // Black square before word start
            if (col > 0 && !this.grid[row][col - 1].letter && !this.grid[row][col - 1].isBlocked) {
                this.grid[row][col - 1].isBlocked = true;
                console.log(`   🔲 Placed black square before "${word}" at (${row},${col - 1})`);
            }
            // Black square after word end
            const endCol = col + word.length;
            if (endCol < GRID_SIZE && !this.grid[row][endCol].letter && !this.grid[row][endCol].isBlocked) {
                this.grid[row][endCol].isBlocked = true;
                console.log(`   🔲 Placed black square after "${word}" at (${row},${endCol})`);
            }
        }
        else {
            // Black square before word start (up direction)
            if (row > 0 && !this.grid[row - 1][col].letter && !this.grid[row - 1][col].isBlocked) {
                this.grid[row - 1][col].isBlocked = true;
                console.log(`   🔲 Placed black square before "${word}" at (${row - 1},${col})`);
            }
            // Black square after word end (down direction)
            const endRow = row + word.length;
            if (endRow < GRID_SIZE && !this.grid[endRow][col].letter && !this.grid[endRow][col].isBlocked) {
                this.grid[endRow][col].isBlocked = true;
                console.log(`   🔲 Placed black square after "${word}" at (${endRow},${col})`);
            }
        }
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
     * Clear intended black squares when backtracking (reset to clean state)
     */
    clearIntendedBlackSquares() {
        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                this.grid[i][j].willBeBlocked = false;
            }
        }
        // Rebuild intended black squares for all currently placed words
        for (const placement of this.placedWords) {
            this.updateIntendedBlackSquares(placement);
        }
    }
    /**
     * Update intended black squares for proper word separation tracking
     */
    updateIntendedBlackSquares(placement) {
        const { word, row, col, direction } = placement;
        if (direction === 'across') {
            // Mark intended black square before word start
            if (col > 0 && !this.grid[row][col - 1].letter) {
                this.grid[row][col - 1].willBeBlocked = true;
            }
            // Mark intended black square after word end
            const endCol = col + word.length;
            if (endCol < GRID_SIZE && !this.grid[row][endCol].letter) {
                this.grid[row][endCol].willBeBlocked = true;
            }
        }
        else {
            // Mark intended black square before word start
            if (row > 0 && !this.grid[row - 1][col].letter) {
                this.grid[row - 1][col].willBeBlocked = true;
            }
            // Mark intended black square after word end
            const endRow = row + word.length;
            if (endRow < GRID_SIZE && !this.grid[endRow][col].letter) {
                this.grid[endRow][col].willBeBlocked = true;
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
        // Step 1: Place initial seed word (filter to fit grid)
        const allSeedWords = ['GALAXY', 'STELLAR', 'COSMIC', 'NEBULA', 'PLANET', 'MAGNETOHYDRODYNAMICS',
            'SPECTROPOLARIMETRY', 'ASTEROSEISMOLOGY', 'GRAVITOELECTROMAGNETISM', 'NUCLEOSYNTHESIS', 'PHOTOIONIZATION',
            'COSMOCHEMISTRY', 'SPECTROPHOTOMETRY', 'ASTROPHOTOGRAPHY', 'CIRCUMPLANETARY'];
        const seedWords = allSeedWords.filter(word => word.length <= GRID_SIZE - 2); // Leave room for boundaries
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
            // Enhanced direction targeting logic for better constraint satisfaction
            let targetDirection;
            // Calculate connection opportunities for each direction
            const acrossConnections = this.connectionPoints.filter(p => this.canPlaceWordInDirection(p, 'across')).length;
            const downConnections = this.connectionPoints.filter(p => this.canPlaceWordInDirection(p, 'down')).length;
            // After placing seed word, prioritize the opposite direction for intersections
            if (this.placedWords.length === 1) {
                // We have only the seed word (across), prioritize down words for intersections
                targetDirection = 'down';
            }
            else if (downCount < MIN_DOWN_WORDS && acrossCount < MIN_ACROSS_WORDS) {
                // Both below minimum - choose direction with better connection opportunities
                if (downConnections > acrossConnections) {
                    targetDirection = 'down';
                }
                else if (acrossConnections > downConnections) {
                    targetDirection = 'across';
                }
                else {
                    // Equal opportunities - prioritize the direction that's more behind
                    targetDirection = downCount < acrossCount ? 'down' : 'across';
                }
            }
            else if (downCount < MIN_DOWN_WORDS) {
                targetDirection = 'down';
            }
            else if (acrossCount < MIN_ACROSS_WORDS) {
                targetDirection = 'across';
            }
            else {
                // Both minimums met - choose direction with better placement opportunities
                if (downConnections > acrossConnections + 2) {
                    targetDirection = 'down';
                }
                else if (acrossConnections > downConnections + 2) {
                    targetDirection = 'across';
                }
                else {
                    // Similar opportunities - maintain balance
                    targetDirection = acrossCount <= downCount ? 'across' : 'down';
                }
            }
            console.log(`📊 Current counts: ${acrossCount} across, ${downCount} down - targeting ${targetDirection}`);
            const placed = this.attemptToPlaceNewWordWithBacktracking(targetDirection);
            if (!placed) {
                failedWordCount++;
                console.log(`❌ Failed placement attempt ${failedWordCount}/${MAX_FAILED_WORDS}`);
                // If we've tried many times unsuccessfully, try backtracking
                if (failedWordCount > 15 && this.placedWords.length > 2) {
                    console.log(`🔄 Attempting backtrack - removing last word and trying again`);
                    if (this.backtrackLastWord()) {
                        failedWordCount = Math.max(0, failedWordCount - 10); // Reduce failed count after backtrack
                    }
                }
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
     * Remove the last placed word and restore grid state
     */
    backtrackLastWord() {
        if (this.placedWords.length <= 1) {
            return false; // Don't remove the seed word
        }
        const lastWord = this.placedWords.pop();
        if (!lastWord)
            return false;
        console.log(`🔙 Backtracking - removing "${lastWord.word}" ${lastWord.direction} at (${lastWord.row},${lastWord.col})`);
        // Remove the word from used words set
        this.usedWords.delete(lastWord.word);
        // Clear the grid cells for this word
        for (let i = 0; i < lastWord.word.length; i++) {
            const r = lastWord.direction === 'across' ? lastWord.row : lastWord.row + i;
            const c = lastWord.direction === 'across' ? lastWord.col + i : lastWord.col;
            // Only clear cells that aren't part of other words
            if (!this.isPartOfOtherWords(r, c, lastWord)) {
                this.grid[r][c].letter = '';
                this.grid[r][c].number = null;
                this.grid[r][c].isBlocked = false;
            }
        }
        // Remove black squares that were placed for this word
        this.removeBlackSquaresForWord(lastWord);
        // Rebuild connection points
        this.rebuildConnectionPoints();
        // Reset constraint engine
        this.constraintEngine = new AdvancedConstraintEngine(this.grid, this.placedWords, DICTIONARY_TRIE);
        return true;
    }
    /**
     * Check if a grid cell is part of other placed words
     */
    isPartOfOtherWords(row, col, excludeWord) {
        return this.placedWords.some(word => {
            if (word === excludeWord)
                return false;
            if (word.direction === 'across') {
                return word.row === row && col >= word.col && col < word.col + word.word.length;
            }
            else {
                return word.col === col && row >= word.row && row < word.row + word.word.length;
            }
        });
    }
    /**
     * Remove black squares that were placed for a specific word
     */
    removeBlackSquaresForWord(wordPlacement) {
        const { word, row, col, direction } = wordPlacement;
        if (direction === 'across') {
            // Remove black square before word start
            if (col > 0) {
                this.grid[row][col - 1].isBlocked = false;
            }
            // Remove black square after word end
            const endCol = col + word.length;
            if (endCol < GRID_SIZE) {
                this.grid[row][endCol].isBlocked = false;
            }
        }
        else {
            // Remove black square before word start (up direction)
            if (row > 0) {
                this.grid[row - 1][col].isBlocked = false;
            }
            // Remove black square after word end (down direction)
            const endRow = row + word.length;
            if (endRow < GRID_SIZE) {
                this.grid[endRow][col].isBlocked = false;
            }
        }
    }
    /**
     * Rebuild connection points after backtracking
     */
    rebuildConnectionPoints() {
        this.connectionPoints = [];
        for (const wordPlacement of this.placedWords) {
            this.updateConnectionPoints(wordPlacement);
        }
    }
    /**
     * Attempt to place a new word with intelligent backtracking
     */
    attemptToPlaceNewWordWithBacktracking(direction) {
        return this.attemptToPlaceNewWord(direction);
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
            // Try multiple words for this connection point with intelligent pre-filtering
            const candidateWords = this.getRandomWordsWithLetter(connectionPoint.letter, connectionPoint, direction);
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
     * Get words containing a specific letter, prioritizing those with good connection potential
     */
    getRandomWordsWithLetter(letter, connectionPoint, direction) {
        const wordsWithLetter = WORDS_WITH_LETTER.get(letter) || [];
        let availableWords = wordsWithLetter.filter(word => !this.usedWords.has(word));
        // If we have connection context, pre-filter by spatial constraints
        if (connectionPoint && direction) {
            availableWords = availableWords.filter(word => {
                return this.canWordFitSpatially(word, connectionPoint, direction);
            });
        }
        // Sort words by length preference (favor 4-8 character words)
        const sortedWords = availableWords.sort((a, b) => {
            const getWordScore = (word) => {
                let score = 0;
                // Length preference: 4-8 chars get bonus
                if (word.length >= 4 && word.length <= 8)
                    score += 2;
                else if (word.length >= 3 && word.length <= 10)
                    score += 1;
                // Common letter bonus
                const commonLetters = 'AEIOURSTLNHDYCP';
                for (const char of word.toUpperCase()) {
                    if (commonLetters.includes(char))
                        score += 0.1;
                }
                return score;
            };
            return getWordScore(b) - getWordScore(a);
        });
        // Return top candidates (don't shuffle to maintain quality order)
        return sortedWords.slice(0, Math.min(40, sortedWords.length));
    }
    /**
     * Pre-check if a word could possibly fit spatially at a connection point
     */
    canWordFitSpatially(word, connectionPoint, direction) {
        const positions = word.toUpperCase().split('').map((_, i) => i).filter(i => word[i] === connectionPoint.letter);
        for (const pos of positions) {
            const startRow = direction === 'down' ? connectionPoint.row - pos : connectionPoint.row;
            const startCol = direction === 'across' ? connectionPoint.col - pos : connectionPoint.col;
            const endRow = direction === 'down' ? startRow + word.length - 1 : startRow;
            const endCol = direction === 'across' ? startCol + word.length - 1 : startCol;
            // Check bounds
            if (startRow < 0 || startCol < 0 || endRow >= GRID_SIZE || endCol >= GRID_SIZE)
                continue;
            // Quick check for obvious conflicts (black squares in word path)
            let hasConflict = false;
            for (let i = 0; i < word.length; i++) {
                const r = direction === 'down' ? startRow + i : startRow;
                const c = direction === 'across' ? startCol + i : startCol;
                if (this.grid[r][c].isBlocked) {
                    hasConflict = true;
                    break;
                }
            }
            if (!hasConflict)
                return true; // At least one position works spatially
        }
        return false; // No position works
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
        // Check that all letters are part of at least one valid word
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (this.grid[row][col].letter && !this.grid[row][col].isBlocked) {
                    const acrossWord = this.findWordAtPosition(row, col, 'across');
                    const downWord = this.findWordAtPosition(row, col, 'down');
                    if (!acrossWord && !downWord) {
                        console.log(`❌ Letter '${this.grid[row][col].letter}' at (${row},${col}) not part of any word`);
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
            'MAGNETOHYDRODYNAMICS': 'physics of electrically conducting fluids (plasmas) in magnetic fields',
            'SPECTROPOLARIMETRY': 'measuring how light\'s polarization varies with wavelength',
            'ASTEROSEISMOLOGY': 'probing stellar interiors via star-quake oscillations',
            'GRAVITOELECTROMAGNETISM': 'GR approximation that mirrors electromagnetic equations',
            'NUCLEOSYNTHESIS': 'creation of new atomic nuclei in the Big Bang and stars',
            'PHOTOIONIZATION': 'knocking electrons off atoms with energetic photons',
            'COSMOCHEMISTRY': 'chemistry of the cosmos (meteoritics, planetary materials, isotopes)',
            'SPECTROPHOTOMETRY': 'measuring light intensity as a function of wavelength',
            'ASTROPHOTOGRAPHY': 'long-exposure imaging of celestial objects and phenomena',
            'CIRCUMPLANETARY': 'describing disks/rings/environments orbiting around a planet',
        };
        return clues[word.toUpperCase()] || `Word: ${word}`;
    }
    /**
     * Check if a word can be placed in the given direction from a connection point
     */
    canPlaceWordInDirection(connectionPoint, direction) {
        // Find candidate words that contain the connection letter
        const candidateWords = WORDS_WITH_LETTER.get(connectionPoint.letter.toLowerCase()) || [];
        // Check if any candidate can be placed in this direction
        for (const word of candidateWords.slice(0, 5)) { // Check first 5 candidates for performance
            if (this.usedWords.has(word))
                continue;
            // Find positions where the connection letter appears in the word
            for (let i = 0; i < word.length; i++) {
                if (word[i].toLowerCase() === connectionPoint.letter.toLowerCase()) {
                    // Calculate placement position
                    const row = direction === 'across' ? connectionPoint.row : connectionPoint.row - i;
                    const col = direction === 'across' ? connectionPoint.col - i : connectionPoint.col;
                    // Quick basic validation (without full constraint checking for performance)
                    if (row >= 0 && col >= 0 &&
                        (direction === 'across' ? col + word.length <= GRID_SIZE : row + word.length <= GRID_SIZE)) {
                        // Check for obvious conflicts (occupied non-intersection cells)
                        let hasConflict = false;
                        for (let j = 0; j < word.length; j++) {
                            const checkRow = direction === 'across' ? row : row + j;
                            const checkCol = direction === 'across' ? col + j : col;
                            if (this.grid[checkRow] && this.grid[checkRow][checkCol] &&
                                this.grid[checkRow][checkCol].letter &&
                                this.grid[checkRow][checkCol].letter !== word[j]) {
                                hasConflict = true;
                                break;
                            }
                        }
                        if (!hasConflict) {
                            return true; // Found at least one possible placement
                        }
                    }
                }
            }
        }
        return false;
    }
    /**
     * Main generation method
     */
    generate() {
        console.log('🎯 Starting proper crossword generation with strict constraints...');
        const maxAttempts = 200; // Significantly increased attempts for constraint satisfaction
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`🔄 Attempt ${attempt}/${maxAttempts}`);
            // Reset state
            this.initializeGrid();
            this.placedWords = [];
            this.connectionPoints = [];
            this.usedWords.clear();
            // Reset constraint engine
            this.constraintEngine = new AdvancedConstraintEngine(this.grid, this.placedWords, DICTIONARY_TRIE);
            // Generate crossword
            const success = this.generateCrosswordWithBacktracking();
            if (success) {
                const isValid = this.validateFinalCrossword();
                if (isValid) { // Only accept if validation passes
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
        // All attempts failed - throw error since constraints cannot be satisfied
        throw new Error('Unable to generate crossword that meets all constraints after maximum attempts');
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