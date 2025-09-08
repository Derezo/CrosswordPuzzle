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
export declare class StandardCrosswordGenerator {
    private grid;
    private slots;
    private assignments;
    private rng;
    private themeWords;
    constructor(seed: string);
    private initializeGrid;
    private selectThemeWords;
    private createSymmetricPattern;
    private shouldPlaceBlackSquare;
    private findWordSlots;
    private computeIntersections;
    private findIntersection;
    private validateCrosswordStructure;
    private selectWordsForSlots;
    private fillSlots;
    private getCandidateWords;
    private getConstraints;
    private canAssignWord;
    private assignWord;
    private unassignWord;
    private shuffleArray;
    private fillGridWithWords;
    private addClueNumbers;
    private generateClues;
    private generateClueForWord;
    generate(): GeneratedPuzzle;
    private createFallbackPuzzle;
}
export declare function generateStandardDailyPuzzle(date: string): GeneratedPuzzle;
//# sourceMappingURL=standardGenerator.d.ts.map