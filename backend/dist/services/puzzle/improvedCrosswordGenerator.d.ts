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
export declare class ImprovedCrosswordGenerator {
    private dictionary;
    private wordsByLength;
    private grid;
    private placedWords;
    private rng;
    constructor(seed: string);
    private loadDictionary;
    private initializeGrid;
    /**
     * Place a seed pattern with guaranteed crossings
     */
    private placeSeedPattern;
    /**
     * Find crossing opportunities
     */
    private findCrossingOpportunities;
    /**
     * Try to place a word crossing at a specific point
     */
    private tryPlaceCrossingWord;
    /**
     * Build puzzle iteratively
     */
    private buildPuzzle;
    /**
     * Assign numbers to word starts
     */
    private assignNumbers;
    /**
     * Generate clues
     */
    private generateClues;
    /**
     * Main generation method
     */
    generate(): GeneratedPuzzle;
}
export declare function generateImprovedPuzzle(date: string): GeneratedPuzzle;
//# sourceMappingURL=improvedCrosswordGenerator.d.ts.map