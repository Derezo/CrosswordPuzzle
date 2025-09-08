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
export declare class FastCrosswordGenerator {
    private grid;
    private rng;
    constructor(seed: string);
    private initializeGrid;
    private createSimplePattern;
    private countBlackSquares;
    private placeWordsGreedy;
    private countIntersections;
    private findSlotsOfLength;
    private isSlotOccupied;
    private canPlaceWord;
    private getCrossWord;
    private placeWord;
    private shuffleArray;
    private generateClues;
    private generateClueForWord;
    generate(): GeneratedPuzzle;
}
export declare function generateFastDailyPuzzle(date: string): GeneratedPuzzle;
//# sourceMappingURL=fastGenerator.d.ts.map