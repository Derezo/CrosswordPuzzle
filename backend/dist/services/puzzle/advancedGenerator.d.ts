export interface IPuzzleCell {
    letter: string | null;
    number: number | null;
    isBlocked: boolean;
}
export interface ICrosswordClue {
    number: number;
    clue: string;
    answer: string;
    direction: 'across' | 'down';
    startRow: number;
    startCol: number;
    length: number;
}
export interface GeneratedPuzzle {
    grid: IPuzzleCell[][];
    clues: ICrosswordClue[];
    size: {
        rows: number;
        cols: number;
    };
}
export declare function generateAdvancedDailyPuzzle(date: string): GeneratedPuzzle;
//# sourceMappingURL=advancedGenerator.d.ts.map