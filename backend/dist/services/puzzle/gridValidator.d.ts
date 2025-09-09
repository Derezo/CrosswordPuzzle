interface GridCellData {
    letter: string;
    acrossLetter?: string;
    downLetter?: string;
    lastActiveDirection?: 'across' | 'down';
}
interface ClueData {
    number: number;
    direction: 'across' | 'down';
    startRow: number;
    startCol: number;
    length: number;
    answer: string;
    clue: string;
}
interface ValidationResult {
    cellValidation: {
        [cellKey: string]: boolean;
    };
    clueResults: {
        [clueNumber: number]: boolean;
    };
    solvedClues: {
        [clueNumber: string]: string;
    };
    newCompletedClues: number[];
}
export declare function validateGrid(userGrid: GridCellData[][], solutionGrid: any[][], cluesData: ClueData[], currentCompletedClues: number[]): ValidationResult;
export declare function createSolutionGrid(solutionGrid: any[][], cluesData: ClueData[]): GridCellData[][];
export {};
//# sourceMappingURL=gridValidator.d.ts.map