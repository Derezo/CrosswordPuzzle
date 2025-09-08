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
export declare class EnhancedCrosswordGenerator {
    private dictionary;
    private wordsByLength;
    private grid;
    private placedWords;
    private usedWords;
    private rng;
    private blackSquareCount;
    constructor(seed: string);
    private loadDictionary;
    private initializeGrid;
    private canPlaceWord;
    private isValidAdjacent;
    private placeWord;
    private findBestPlacements;
    private addBlackSquares;
    private shouldBeBlackSquare;
    private wouldIsolateWord;
    private assignNumbers;
    private generateClues;
    private removeIsolatedCells;
    private dfs;
    generate(): GeneratedPuzzle;
}
export declare function generateEnhancedPuzzle(date: string): GeneratedPuzzle;
//# sourceMappingURL=enhancedCrosswordGenerator.d.ts.map