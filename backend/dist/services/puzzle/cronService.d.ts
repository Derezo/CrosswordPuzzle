export declare class PuzzleCronService {
    private static instance;
    private job;
    private constructor();
    static getInstance(): PuzzleCronService;
    start(): void;
    stop(): void;
    private generateTodaysPuzzle;
    generatePuzzleForDate(date: string): Promise<void>;
    getPuzzleForDate(date: string): Promise<{
        id: string;
        createdAt: Date;
        date: string;
        gridData: string;
        cluesData: string;
        rows: number;
        cols: number;
    }>;
    getTodaysPuzzle(): Promise<{
        id: string;
        createdAt: Date;
        date: string;
        gridData: string;
        cluesData: string;
        rows: number;
        cols: number;
    }>;
}
declare const _default: PuzzleCronService;
export default _default;
//# sourceMappingURL=cronService.d.ts.map