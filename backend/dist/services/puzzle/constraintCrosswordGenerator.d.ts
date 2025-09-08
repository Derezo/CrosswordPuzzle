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
export declare class ConstraintCrosswordGenerator {
    private dictionary;
    private wordsByLength;
    private wordSet;
    private grid;
    private slots;
    private rng;
    constructor(seed: string);
    private loadDictionary;
    private initializeGrid;
    private createSymmetricBlackPattern;
    private findWordSlots;
    private getMatchingWords;
    private updatePattern;
    private revertPattern;
    private fillSlots;
    private backtrackFill;
    private fillGrid;
    private assignNumbers;
    private generateClues;
    private validatePuzzle;
    generate(): GeneratedPuzzle;
}
export declare function generateConstraintPuzzle(date: string): GeneratedPuzzle;
//# sourceMappingURL=constraintCrosswordGenerator.d.ts.map