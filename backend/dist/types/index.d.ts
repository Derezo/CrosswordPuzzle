export interface User {
    _id: string;
    email: string;
    password?: string;
    googleId?: string;
    firstName: string;
    lastName: string;
    points: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface PuzzleCell {
    letter: string | null;
    number?: number;
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
export interface DailyPuzzle {
    _id: string;
    date: string;
    grid: PuzzleCell[][];
    clues: CrosswordClue[];
    size: {
        rows: number;
        cols: number;
    };
    createdAt: Date;
}
export interface UserProgress {
    _id: string;
    userId: string;
    puzzleDate: string;
    answers: {
        [clueNumber: string]: string;
    };
    completedClues: number[];
    isCompleted: boolean;
    completedAt?: Date;
    solveTime?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface Achievement {
    _id: string;
    name: string;
    description: string;
    points: number;
    conditionType: string;
    condition: any;
    icon: string;
    createdAt: Date;
}
export interface UserAchievement {
    _id: string;
    userId: string;
    achievementId: string;
    earnedAt: Date;
    puzzleDate?: string;
    metadata?: any;
}
export interface LeaderboardEntry {
    user: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    points: number;
    rank: number;
}
//# sourceMappingURL=index.d.ts.map