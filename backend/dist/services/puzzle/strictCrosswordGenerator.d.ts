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
export declare class StrictCrosswordGenerator {
    private dictionary;
    private wordsByLength;
    private wordSet;
    private grid;
    private placedWords;
    private usedWords;
    private rng;
    constructor(seed: string);
    private loadDictionary;
    private initializeGrid;
    private canPlaceWord;
    private placeWord;
    private findBestCandidates;
    private findAllPlacements;
    private wouldCreateInvalidWord;
    private buildPuzzle;
    private finalizeBlackSquares;
    private assignNumbers;
    private generateClues;
    private validatePuzzle;
    generate(): GeneratedPuzzle;
}
export declare function generateStrictPuzzle(date: string): GeneratedPuzzle;
//# sourceMappingURL=strictCrosswordGenerator.d.ts.map