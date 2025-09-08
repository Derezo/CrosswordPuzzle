export interface PuzzleCell {
    letter: string;
    number: number | null;
    isBlocked: boolean;
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
     * Check if a word can be placed at a specific location following all constraints
     */
    private canPlaceWordStrict;
    /**
     * Check if word placement would create adjacent words in same direction
     * Since black squares aren't placed yet, check if letters would be adjacent
     */
    private isWordProperlySeparated;
    /**
     * Validate that a letter placement creates valid perpendicular words
     */
    private isValidLetterPlacement;
    /**
     * Get the perpendicular word pattern that would be formed by placing a letter
     * Without black squares, we check for adjacent letters only
     */
    private getPerpendicularWordPattern;
    /**
     * Place a word on the grid with proper tracking - NO BLACK SQUARES YET
     */
    private placeWord;
    /**
     * Add all black squares at the end of generation to maintain proper word separation
     */
    private addAllBlackSquares;
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
     * Attempt to place a new word in the specified direction
     */
    private attemptToPlaceNewWord;
    /**
     * Get random words containing a specific letter, prioritizing good crossword words
     */
    private getRandomWordsWithLetter;
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
     * Main generation method
     */
    generate(): GeneratedPuzzle;
    /**
     * Create a minimal valid crossword as fallback
     */
    private createMinimalCrossword;
}
export declare function generateProperDailyPuzzle(date: string): GeneratedPuzzle;
//# sourceMappingURL=properGenerator.d.ts.map