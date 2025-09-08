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
exports.EnhancedCrosswordGenerator = void 0;
exports.generateEnhancedPuzzle = generateEnhancedPuzzle;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const sync_1 = require("csv-parse/sync");
const GRID_SIZE = 15;
const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 10;
const MAX_BLACK_PERCENTAGE = 20; // Maximum 20% black squares
const MIN_INTERSECTIONS = 1; // Every word must have at least 1 intersection
const TARGET_WORDS = 35; // Aim for 35-40 words
class EnhancedCrosswordGenerator {
    constructor(seed) {
        this.dictionary = [];
        this.wordsByLength = new Map();
        this.grid = [];
        this.placedWords = [];
        this.usedWords = new Set();
        this.blackSquareCount = 0;
        const hash = crypto.createHash('sha256').update(seed).digest();
        let seedInt = hash.readUInt32BE(0);
        this.rng = () => {
            seedInt = (seedInt * 1103515245 + 12345) & 0x7fffffff;
            return seedInt / 0x7fffffff;
        };
        this.loadDictionary();
        this.initializeGrid();
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
        console.log(`📚 Loaded ${this.dictionary.length} words (${MIN_WORD_LENGTH}-${MAX_WORD_LENGTH} letters)`);
    }
    initializeGrid() {
        this.grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null).map(() => ({
            letter: '',
            number: null,
            isBlocked: false
        })));
        this.blackSquareCount = 0;
    }
    canPlaceWord(word, row, col, direction) {
        // Check bounds
        if (row < 0 || col < 0)
            return false;
        if (direction === 'across' && col + word.length > GRID_SIZE)
            return false;
        if (direction === 'down' && row + word.length > GRID_SIZE)
            return false;
        let intersections = 0;
        let hasConflict = false;
        // Check each letter position
        for (let i = 0; i < word.length; i++) {
            const r = direction === 'across' ? row : row + i;
            const c = direction === 'across' ? col + i : col;
            // Can't place on black square
            if (this.grid[r][c].isBlocked)
                return false;
            // Check for letter conflicts
            if (this.grid[r][c].letter) {
                if (this.grid[r][c].letter !== word[i]) {
                    return false;
                }
                intersections++;
            }
            // Check adjacent cells (perpendicular to word direction)
            if (direction === 'across') {
                // Check above and below
                if (r > 0 && this.grid[r - 1][c].letter && !this.grid[r][c].letter) {
                    // Would create invalid adjacent letters
                    if (!this.isValidAdjacent(word[i], r - 1, c, 'down'))
                        return false;
                }
                if (r < GRID_SIZE - 1 && this.grid[r + 1][c].letter && !this.grid[r][c].letter) {
                    // Would create invalid adjacent letters
                    if (!this.isValidAdjacent(word[i], r + 1, c, 'down'))
                        return false;
                }
            }
            else {
                // Check left and right
                if (c > 0 && this.grid[r][c - 1].letter && !this.grid[r][c].letter) {
                    // Would create invalid adjacent letters
                    if (!this.isValidAdjacent(word[i], r, c - 1, 'across'))
                        return false;
                }
                if (c < GRID_SIZE - 1 && this.grid[r][c + 1].letter && !this.grid[r][c].letter) {
                    // Would create invalid adjacent letters
                    if (!this.isValidAdjacent(word[i], r, c + 1, 'across'))
                        return false;
                }
            }
        }
        // Check word boundaries - no letters should extend the word
        if (direction === 'across') {
            if (col > 0 && this.grid[row][col - 1].letter)
                return false;
            if (col + word.length < GRID_SIZE && this.grid[row][col + word.length].letter)
                return false;
        }
        else {
            if (row > 0 && this.grid[row - 1][col].letter)
                return false;
            if (row + word.length < GRID_SIZE && this.grid[row + word.length][col].letter)
                return false;
        }
        // First word doesn't need intersections, all others do
        if (this.placedWords.length > 0 && intersections === 0)
            return false;
        return true;
    }
    isValidAdjacent(letter, row, col, checkDirection) {
        // Check if placing this letter would create a valid word in the perpendicular direction
        // This is a simplified check - we just ensure no invalid letter sequences
        return true; // For now, allow all adjacent placements
    }
    placeWord(entry, row, col, direction) {
        let intersections = 0;
        // Place letters
        for (let i = 0; i < entry.word.length; i++) {
            const r = direction === 'across' ? row : row + i;
            const c = direction === 'across' ? col + i : col;
            if (this.grid[r][c].letter) {
                intersections++;
            }
            this.grid[r][c].letter = entry.word[i];
        }
        this.placedWords.push({
            word: entry.word,
            clue: entry.clue,
            row,
            col,
            direction,
            intersections
        });
        this.usedWords.add(entry.word);
    }
    findBestPlacements(entry) {
        const placements = [];
        // Try all positions
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                for (const direction of ['across', 'down']) {
                    if (this.canPlaceWord(entry.word, r, c, direction)) {
                        let score = 0;
                        let intersections = 0;
                        // Count intersections and calculate score
                        for (let i = 0; i < entry.word.length; i++) {
                            const row = direction === 'across' ? r : r + i;
                            const col = direction === 'across' ? c + i : c;
                            if (this.grid[row][col].letter === entry.word[i]) {
                                intersections++;
                                score += 10; // High score for intersections
                            }
                        }
                        // Prefer central positions
                        const centerDist = Math.abs(r - GRID_SIZE / 2) + Math.abs(c - GRID_SIZE / 2);
                        score -= centerDist * 0.5;
                        // Prefer positions with good intersection potential
                        if (intersections > 0 || this.placedWords.length === 0) {
                            placements.push({ row: r, col: c, direction, score });
                        }
                    }
                }
            }
        }
        // Sort by score
        placements.sort((a, b) => b.score - a.score);
        return placements;
    }
    addBlackSquares() {
        const maxBlackSquares = Math.floor(GRID_SIZE * GRID_SIZE * MAX_BLACK_PERCENTAGE / 100);
        // Add black squares to separate words and maintain symmetry
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.blackSquareCount >= maxBlackSquares)
                    break;
                // Skip cells with letters
                if (this.grid[r][c].letter)
                    continue;
                // Check if this position should be black to separate words
                const shouldBeBlack = this.shouldBeBlackSquare(r, c);
                if (shouldBeBlack) {
                    this.grid[r][c].isBlocked = true;
                    this.blackSquareCount++;
                    // Add symmetric black square
                    const symR = GRID_SIZE - 1 - r;
                    const symC = GRID_SIZE - 1 - c;
                    if (!this.grid[symR][symC].letter && !this.grid[symR][symC].isBlocked) {
                        this.grid[symR][symC].isBlocked = true;
                        this.blackSquareCount++;
                    }
                }
            }
        }
    }
    shouldBeBlackSquare(r, c) {
        // Don't block cells that would isolate words
        if (this.wouldIsolateWord(r, c))
            return false;
        // Add black squares at word boundaries
        const hasAdjacentWords = (r > 0 && this.grid[r - 1][c].letter) ||
            (r < GRID_SIZE - 1 && this.grid[r + 1][c].letter) ||
            (c > 0 && this.grid[r][c - 1].letter) ||
            (c < GRID_SIZE - 1 && this.grid[r][c + 1].letter);
        // Random chance to add black square near words
        return hasAdjacentWords && this.rng() < 0.2;
    }
    wouldIsolateWord(r, c) {
        // Check if making this cell black would isolate any words
        // This is a simplified check - could be made more sophisticated
        // Check if any adjacent cell has a letter that would be isolated
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                if (this.grid[nr][nc].letter) {
                    // Check if this letter would still be connected
                    let connections = 0;
                    for (const [dr2, dc2] of directions) {
                        const nr2 = nr + dr2;
                        const nc2 = nc + dc2;
                        if (nr2 === r && nc2 === c)
                            continue; // Skip the cell we're testing
                        if (nr2 >= 0 && nr2 < GRID_SIZE && nc2 >= 0 && nc2 < GRID_SIZE) {
                            if (this.grid[nr2][nc2].letter)
                                connections++;
                        }
                    }
                    if (connections === 0)
                        return true; // Would isolate this letter
                }
            }
        }
        return false;
    }
    assignNumbers() {
        let number = 1;
        const numberMap = new Map();
        // Scan grid systematically
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.grid[r][c].isBlocked || !this.grid[r][c].letter)
                    continue;
                const isAcrossStart = (c === 0 || this.grid[r][c - 1].isBlocked || !this.grid[r][c - 1].letter) &&
                    c < GRID_SIZE - 1 && !this.grid[r][c + 1].isBlocked && this.grid[r][c + 1].letter;
                const isDownStart = (r === 0 || this.grid[r - 1][c].isBlocked || !this.grid[r - 1][c].letter) &&
                    r < GRID_SIZE - 1 && !this.grid[r + 1][c].isBlocked && this.grid[r + 1][c].letter;
                if (isAcrossStart || isDownStart) {
                    this.grid[r][c].number = number;
                    numberMap.set(`${r},${c}`, number);
                    number++;
                }
            }
        }
        // Update placed words with numbers
        for (const word of this.placedWords) {
            const key = `${word.row},${word.col}`;
            if (numberMap.has(key)) {
                word.number = numberMap.get(key);
            }
        }
    }
    generateClues() {
        const clues = [];
        const addedClues = new Set();
        for (const word of this.placedWords) {
            if (word.number) {
                const clueKey = `${word.number}-${word.direction}`;
                // Avoid duplicate clues
                if (!addedClues.has(clueKey)) {
                    clues.push({
                        number: word.number,
                        clue: word.clue,
                        answer: word.word,
                        direction: word.direction,
                        startRow: word.row,
                        startCol: word.col,
                        length: word.word.length
                    });
                    addedClues.add(clueKey);
                }
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
    removeIsolatedCells() {
        // Remove any isolated letters or small isolated groups
        const visited = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
        const components = [];
        // Find all connected components
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (!visited[r][c] && this.grid[r][c].letter && !this.grid[r][c].isBlocked) {
                    const component = [];
                    this.dfs(r, c, visited, component);
                    if (component.length > 0) {
                        components.push(component);
                    }
                }
            }
        }
        // Find the largest component
        if (components.length > 0) {
            const largestComponent = components.reduce((a, b) => a.length > b.length ? a : b);
            // Clear all cells not in the largest component
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (this.grid[r][c].letter) {
                        const isInLargest = largestComponent.some(([cr, cc]) => cr === r && cc === c);
                        if (!isInLargest) {
                            this.grid[r][c].letter = '';
                            this.grid[r][c].number = null;
                            this.grid[r][c].isBlocked = true;
                            this.blackSquareCount++;
                        }
                    }
                }
            }
            // Remove words that are no longer valid
            this.placedWords = this.placedWords.filter(word => {
                // Check if word still exists in grid
                for (let i = 0; i < word.word.length; i++) {
                    const r = word.direction === 'across' ? word.row : word.row + i;
                    const c = word.direction === 'across' ? word.col + i : word.col;
                    if (!this.grid[r][c].letter || this.grid[r][c].letter !== word.word[i]) {
                        return false;
                    }
                }
                return true;
            });
        }
    }
    dfs(r, c, visited, component) {
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE)
            return;
        if (visited[r][c] || !this.grid[r][c].letter || this.grid[r][c].isBlocked)
            return;
        visited[r][c] = true;
        component.push([r, c]);
        // Check all 4 directions
        this.dfs(r - 1, c, visited, component);
        this.dfs(r + 1, c, visited, component);
        this.dfs(r, c - 1, visited, component);
        this.dfs(r, c + 1, visited, component);
    }
    generate() {
        const maxAttempts = 30;
        let bestPuzzle = null;
        let bestScore = 0;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            this.initializeGrid();
            this.placedWords = [];
            this.usedWords.clear();
            // Shuffle dictionary for variety
            const shuffled = [...this.dictionary].sort(() => this.rng() - 0.5);
            // Place words greedily with smart placement
            let consecutiveFailures = 0;
            for (const entry of shuffled) {
                if (this.placedWords.length >= TARGET_WORDS)
                    break;
                if (consecutiveFailures > 100)
                    break; // Stop if we can't place anything
                if (this.usedWords.has(entry.word))
                    continue;
                const placements = this.findBestPlacements(entry);
                if (placements.length > 0) {
                    // Choose from top placements randomly
                    const topPlacements = placements.slice(0, Math.min(3, placements.length));
                    const chosen = topPlacements[Math.floor(this.rng() * topPlacements.length)];
                    this.placeWord(entry, chosen.row, chosen.col, chosen.direction);
                    consecutiveFailures = 0;
                }
                else {
                    consecutiveFailures++;
                }
            }
            // Add black squares
            this.addBlackSquares();
            // Remove isolated cells/words
            this.removeIsolatedCells();
            // Assign numbers
            this.assignNumbers();
            // Generate clues
            const clues = this.generateClues();
            // Calculate score
            const blackPercentage = (this.blackSquareCount / (GRID_SIZE * GRID_SIZE)) * 100;
            const acrossCount = clues.filter(c => c.direction === 'across').length;
            const downCount = clues.filter(c => c.direction === 'down').length;
            const balance = Math.min(acrossCount, downCount) / Math.max(acrossCount, downCount);
            let score = clues.length * 10;
            score += balance * 50; // Reward balanced puzzles
            score -= Math.max(0, blackPercentage - MAX_BLACK_PERCENTAGE) * 10; // Penalty for too many black squares
            if (score > bestScore && blackPercentage <= MAX_BLACK_PERCENTAGE) {
                bestScore = score;
                bestPuzzle = {
                    grid: this.grid,
                    clues,
                    size: { rows: GRID_SIZE, cols: GRID_SIZE }
                };
                // Good enough?
                if (acrossCount >= 12 && downCount >= 12 && blackPercentage <= MAX_BLACK_PERCENTAGE) {
                    console.log(`✅ Generated puzzle: ${acrossCount} across, ${downCount} down, ${blackPercentage.toFixed(1)}% black (attempt ${attempt + 1})`);
                    return bestPuzzle;
                }
            }
        }
        if (bestPuzzle) {
            const blackPercentage = (this.blackSquareCount / (GRID_SIZE * GRID_SIZE)) * 100;
            const clues = bestPuzzle.clues;
            const acrossCount = clues.filter(c => c.direction === 'across').length;
            const downCount = clues.filter(c => c.direction === 'down').length;
            console.log(`✅ Best puzzle: ${acrossCount} across, ${downCount} down, ${blackPercentage.toFixed(1)}% black`);
            return bestPuzzle;
        }
        throw new Error('Failed to generate valid puzzle');
    }
}
exports.EnhancedCrosswordGenerator = EnhancedCrosswordGenerator;
function generateEnhancedPuzzle(date) {
    const generator = new EnhancedCrosswordGenerator(date);
    return generator.generate();
}
//# sourceMappingURL=enhancedCrosswordGenerator.js.map