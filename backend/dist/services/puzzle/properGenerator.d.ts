export interface PuzzleCell {
    letter: string;
    number: number | null;
    isBlocked: boolean;
    willBeBlocked?: boolean;
}
export interface CrosswordClue {
    number: number;
    clue: string;
    answer: string;
    direction: 'across' | 'down';
    startRow: number;
    startCol: number;
    length: number;
}
export interface GeneratedPuzzle {
    grid: PuzzleCell[][];
    clues: CrosswordClue[];
    size: {
        rows: number;
        cols: number;
    };
}
export declare class ProperCrosswordGenerator {
    private grid;
    private placedWords;
    private connectionPoints;
    private usedWords;
    private rng;
    private constraintEngine;
    constructor(seed: string);
    private initializeGrid;
    /**
     * Find words from dictionary that contain a specific letter at a specific position
     */
    private findWordsWithLetterAt;
    /**
     * Find words from dictionary that match a pattern with known and unknown letters
     */
    private findWordsMatchingPattern;
    /**
     * Check if a word can be placed at a specific location using advanced constraint satisfaction
     */
    private canPlaceWordStrict;
    /**
     * Legacy validation method (kept for reference but not used)
     */
    private legacyValidation;
    /**
     * Check if word placement follows proper crossword separation rules
     * Every word must have a black square or grid boundary before and after it
     * Now considers both actual and intended black squares
     */
    private isWordProperlySeparated;
    /**
     * Check if a position would conflict with an intended word placement
     * This helps detect when a word would be placed where a black square should go
     */
    private wouldConflictWithIntendedPlacement;
    /**
     * Validate that a letter placement creates valid perpendicular words
     */
    private isValidLetterPlacement;
    /**
     * Validate that all letter intersections in a word placement create valid perpendicular words
     */
    private validateAllPerpendicularWords;
    /**
     * Get the perpendicular word pattern that would be formed by placing a letter
     * Without black squares, we check for adjacent letters only
     */
    private getPerpendicularWordPattern;
    /**
     * Place a word on the grid with proper tracking - place black squares at beginning and end of word
     */
    private placeWord;
    /**
     * Place black squares immediately for a specific word to maintain proper separation
     */
    private placeBlackSquaresForWord;
    /**
     * Add all black squares at the end of generation to maintain proper word separation
     */
    private addAllBlackSquares;
    /**
     * Clear intended black squares when backtracking (reset to clean state)
     */
    private clearIntendedBlackSquares;
    /**
     * Update intended black squares for proper word separation tracking
     */
    private updateIntendedBlackSquares;
    /**
     * Update connection points for future word intersections
     */
    private updateConnectionPoints;
    /**
     * Find the best connection points for placing new words in a specific direction
     */
    private findBestConnectionPoints;
    /**
     * Attempt to place a word using backtracking with retry logic
     */
    private attemptWordPlacement;
    /**
     * Generate crossword using enhanced backtracking algorithm
     */
    private generateCrosswordWithBacktracking;
    /**
     * Remove the last placed word and restore grid state
     */
    private backtrackLastWord;
    /**
     * Check if a grid cell is part of other placed words
     */
    private isPartOfOtherWords;
    /**
     * Remove black squares that were placed for a specific word
     */
    private removeBlackSquaresForWord;
    /**
     * Rebuild connection points after backtracking
     */
    private rebuildConnectionPoints;
    /**
     * Attempt to place a new word with intelligent backtracking
     */
    private attemptToPlaceNewWordWithBacktracking;
    /**
     * Attempt to place a new word in the specified direction
     */
    private attemptToPlaceNewWord;
    /**
     * Get words containing a specific letter, prioritizing those with good connection potential
     */
    private getRandomWordsWithLetter;
    /**
     * Pre-check if a word could possibly fit spatially at a connection point
     */
    private canWordFitSpatially;
    /**
     * Shuffle array using seeded random
     */
    private shuffleArray;
    /**
     * Validate the final crossword meets all constraints
     */
    private validateFinalCrossword;
    /**
     * Find word placement at a specific position and direction
     */
    private findWordAtPosition;
    /**
     * Generate clues for all placed words
     */
    private generateClues;
    /**
     * Generate clue for a word
     */
    private generateClueForWord;
    /**
     * Check if a word can be placed in the given direction from a connection point
     */
    private canPlaceWordInDirection;
    /**
     * Main generation method
     */
    generate(): GeneratedPuzzle;
}
export declare function generateProperDailyPuzzle(date: string): GeneratedPuzzle;
//# sourceMappingURL=properGenerator.d.ts.map