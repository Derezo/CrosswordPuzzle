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
    size: {
        rows: number;
        cols: number;
    };
}
export declare class CrosswordGenerator {
    private dictionary;
    private wordsByLength;
    private grid;
    private placedWords;
    private rng;
    private blackSquares;
    constructor(seed: string);
    private loadDictionary;
    private initializeGrid;
    /**
     * Generate symmetric black square pattern
     * Uses 180-degree rotational symmetry
     */
    private generateBlackSquarePattern;
    private addSymmetricBlackSquare;
    /**
     * Find all valid slots for words (continuous white squares)
     */
    private findWordSlots;
    /**
     * Check if a word can be placed at a position
     */
    private canPlaceWord;
    /**
     * Place a word on the grid
     */
    private placeWord;
    /**
     * Get constraint pattern for a slot (existing letters)
     */
    private getSlotPattern;
    /**
     * Find words matching a pattern (e.g., "_A_E")
     */
    private findMatchingWords;
    /**
     * Fill the grid with words
     */
    private fillGrid;
    /**
     * Assign numbers to word starts
     */
    private assignNumbers;
    /**
     * Generate final clues list
     */
    private generateClues;
    /**
     * Main generation method
     */
    generate(): GeneratedPuzzle;
}
export declare function generateDailyPuzzle(date: string): GeneratedPuzzle;
//# sourceMappingURL=crosswordGenerator.d.ts.map