import { UserAchievement, User } from '@prisma/client';
export interface AchievementCheckContext {
    user: User;
    puzzleDate: string;
    progress: any;
    newCompletedClues: number[];
    solveTime?: number;
    firstWordTime?: number;
}
export declare class AchievementService {
    private static instance;
    private constructor();
    static getInstance(): AchievementService;
    initializeAchievements(): Promise<void>;
    checkAchievements(context: AchievementCheckContext): Promise<UserAchievement[]>;
    private checkAchievementCondition;
    private checkFirstWordEver;
    private checkPuzzleSolveSpeed;
    private checkFirstWordSpeed;
    private checkLongestFirstWord;
    private checkFirstSolverDaily;
    private checkPerfectPuzzle;
    private checkSolveStreak;
    private checkEarlyBird;
    private checkNightOwl;
    private checkTotalPuzzles;
    private calculateSolveStreak;
    private awardAchievement;
    getUserAchievements(userId: string): Promise<({
        achievement: {
            name: string;
            id: string;
            points: number;
            createdAt: Date;
            description: string;
            conditionType: string;
            conditionData: string;
            icon: string;
            isActive: boolean;
        };
    } & {
        id: string;
        userId: string;
        puzzleDate: string | null;
        achievementId: string;
        earnedAt: Date;
        metadataData: string | null;
    })[]>;
    getAllAchievements(): Promise<{
        name: string;
        id: string;
        points: number;
        createdAt: Date;
        description: string;
        conditionType: string;
        conditionData: string;
        icon: string;
        isActive: boolean;
    }[]>;
}
declare const _default: AchievementService;
export default _default;
//# sourceMappingURL=achievementService.d.ts.map