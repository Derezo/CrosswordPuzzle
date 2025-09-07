"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AchievementService = void 0;
const prisma_1 = require("../../lib/prisma");
class AchievementService {
    constructor() { }
    static getInstance() {
        if (!AchievementService.instance) {
            AchievementService.instance = new AchievementService();
        }
        return AchievementService.instance;
    }
    // Initialize default achievements
    async initializeAchievements() {
        const defaultAchievements = [
            {
                name: 'First Steps',
                description: 'Complete your first word in any puzzle',
                points: 10,
                conditionType: 'first_word_ever',
                condition: {},
                icon: '🌟'
            },
            {
                name: 'Speed Demon',
                description: 'Complete a puzzle in under 2 minutes',
                points: 100,
                conditionType: 'puzzle_solve_speed',
                condition: { maxTime: 120 },
                icon: '⚡'
            },
            {
                name: 'Lightning Fast',
                description: 'Complete your first word in under 10 seconds',
                points: 50,
                conditionType: 'first_word_speed',
                condition: { maxTime: 10 },
                icon: '🚀'
            },
            {
                name: 'Word Master',
                description: 'Complete a 7+ letter word as your first word',
                points: 30,
                conditionType: 'longest_first_word',
                condition: { minLength: 7 },
                icon: '📚'
            },
            {
                name: 'Daily Champion',
                description: 'Be the first to solve the daily puzzle',
                points: 200,
                conditionType: 'first_solver_daily',
                condition: {},
                icon: '🏆'
            },
            {
                name: 'Perfect Solver',
                description: 'Complete a puzzle without any wrong answers',
                points: 75,
                conditionType: 'perfect_puzzle',
                condition: {},
                icon: '💎'
            },
            {
                name: 'Week Warrior',
                description: 'Solve puzzles for 7 consecutive days',
                points: 150,
                conditionType: 'solve_streak',
                condition: { streakLength: 7 },
                icon: '🔥'
            },
            {
                name: 'Early Bird',
                description: 'Complete a puzzle before 6 AM',
                points: 40,
                conditionType: 'early_bird',
                condition: { maxHour: 6 },
                icon: '🌅'
            },
            {
                name: 'Night Owl',
                description: 'Complete a puzzle after 11 PM',
                points: 40,
                conditionType: 'night_owl',
                condition: { minHour: 23 },
                icon: '🌙'
            },
            {
                name: 'Cosmic Solver',
                description: 'Complete 10 puzzles total',
                points: 100,
                conditionType: 'total_puzzles',
                condition: { count: 10 },
                icon: '🌌'
            }
        ];
        for (const achievementData of defaultAchievements) {
            const existing = await prisma_1.prisma.achievement.findUnique({ where: { name: achievementData.name } });
            if (!existing) {
                const { condition, ...dataWithoutCondition } = achievementData;
                await prisma_1.prisma.achievement.create({
                    data: {
                        ...dataWithoutCondition,
                        conditionData: JSON.stringify(condition)
                    }
                });
            }
        }
        console.log('✅ Default achievements initialized');
    }
    // Check for new achievements after puzzle progress
    async checkAchievements(context) {
        const newAchievements = [];
        const achievements = await prisma_1.prisma.achievement.findMany({ where: { isActive: true } });
        for (const achievement of achievements) {
            const hasAchievement = await prisma_1.prisma.userAchievement.findUnique({
                where: {
                    userId_achievementId: {
                        userId: context.user.id,
                        achievementId: achievement.id
                    }
                }
            });
            if (!hasAchievement) {
                const earned = await this.checkAchievementCondition(achievement, context);
                if (earned) {
                    const userAchievement = await this.awardAchievement(context.user.id, achievement.id, context.puzzleDate, earned.metadata);
                    newAchievements.push(userAchievement);
                }
            }
        }
        return newAchievements;
    }
    async checkAchievementCondition(achievement, context) {
        const condition = JSON.parse(achievement.conditionData);
        switch (achievement.conditionType) {
            case 'first_word_ever':
                return this.checkFirstWordEver(context);
            case 'puzzle_solve_speed':
                return this.checkPuzzleSolveSpeed(achievement, context);
            case 'first_word_speed':
                return this.checkFirstWordSpeed(achievement, context);
            case 'longest_first_word':
                return this.checkLongestFirstWord(achievement, context);
            case 'first_solver_daily':
                return this.checkFirstSolverDaily(context);
            case 'perfect_puzzle':
                return this.checkPerfectPuzzle(context);
            case 'solve_streak':
                return this.checkSolveStreak(achievement, context);
            case 'early_bird':
                return this.checkEarlyBird(achievement, context);
            case 'night_owl':
                return this.checkNightOwl(achievement, context);
            case 'total_puzzles':
                return this.checkTotalPuzzles(achievement, context);
            default:
                return null;
        }
    }
    async checkFirstWordEver(context) {
        if (context.newCompletedClues.length > 0) {
            const totalUserAchievements = await prisma_1.prisma.userAchievement.count({
                where: { userId: context.user.id }
            });
            if (totalUserAchievements === 0) {
                return { metadata: { firstClue: context.newCompletedClues[0] } };
            }
        }
        return null;
    }
    async checkPuzzleSolveSpeed(achievement, context) {
        if (context.progress.isCompleted && context.solveTime) {
            const condition = JSON.parse(achievement.conditionData);
            const maxTime = condition.maxTime;
            if (context.solveTime <= maxTime) {
                return { metadata: { solveTime: context.solveTime } };
            }
        }
        return null;
    }
    async checkFirstWordSpeed(achievement, context) {
        if (context.firstWordTime && context.newCompletedClues.length > 0) {
            const condition = JSON.parse(achievement.conditionData);
            const maxTime = condition.maxTime;
            if (context.firstWordTime <= maxTime) {
                return { metadata: { firstWordTime: context.firstWordTime } };
            }
        }
        return null;
    }
    async checkLongestFirstWord(achievement, context) {
        if (context.newCompletedClues.length > 0) {
            const puzzle = await prisma_1.prisma.dailyPuzzle.findUnique({ where: { date: context.puzzleDate } });
            if (puzzle) {
                const cluesData = JSON.parse(puzzle.cluesData);
                const firstClue = cluesData.find((c) => c.number === context.newCompletedClues[0]);
                const condition = JSON.parse(achievement.conditionData);
                if (firstClue && firstClue.length >= condition.minLength) {
                    return { metadata: { wordLength: firstClue.length, word: firstClue.answer } };
                }
            }
        }
        return null;
    }
    async checkFirstSolverDaily(context) {
        if (context.progress.isCompleted) {
            const earlierCompletion = await prisma_1.prisma.userProgress.findFirst({
                where: {
                    puzzleDate: context.puzzleDate,
                    isCompleted: true,
                    completedAt: { lt: context.progress.completedAt }
                }
            });
            if (!earlierCompletion) {
                return { metadata: { firstSolver: true } };
            }
        }
        return null;
    }
    async checkPerfectPuzzle(context) {
        if (context.progress.isCompleted) {
            // This would require tracking wrong answers, which we'd need to implement
            // For now, assume perfect if completed
            return { metadata: { perfect: true } };
        }
        return null;
    }
    async checkSolveStreak(achievement, context) {
        if (context.progress.isCompleted) {
            const condition = JSON.parse(achievement.conditionData);
            const streakLength = condition.streakLength;
            const streak = await this.calculateSolveStreak(context.user.id, context.puzzleDate);
            if (streak >= streakLength) {
                return { metadata: { streakLength: streak } };
            }
        }
        return null;
    }
    async checkEarlyBird(achievement, context) {
        if (context.progress.isCompleted && context.progress.completedAt) {
            const condition = JSON.parse(achievement.conditionData);
            const hour = context.progress.completedAt.getHours();
            if (hour < condition.maxHour) {
                return { metadata: { completionHour: hour } };
            }
        }
        return null;
    }
    async checkNightOwl(achievement, context) {
        if (context.progress.isCompleted && context.progress.completedAt) {
            const condition = JSON.parse(achievement.conditionData);
            const hour = context.progress.completedAt.getHours();
            if (hour >= condition.minHour) {
                return { metadata: { completionHour: hour } };
            }
        }
        return null;
    }
    async checkTotalPuzzles(achievement, context) {
        if (context.progress.isCompleted) {
            const totalCompleted = await prisma_1.prisma.userProgress.count({
                where: {
                    userId: context.user.id,
                    isCompleted: true
                }
            });
            const condition = JSON.parse(achievement.conditionData);
            if (totalCompleted >= condition.count) {
                return { metadata: { totalPuzzles: totalCompleted } };
            }
        }
        return null;
    }
    async calculateSolveStreak(userId, currentDate) {
        const progresses = await prisma_1.prisma.userProgress.findMany({
            where: {
                userId,
                isCompleted: true
            },
            orderBy: { puzzleDate: 'desc' },
            take: 30 // Look at last 30 days
        });
        let streak = 0;
        let currentDateObj = new Date(currentDate);
        for (const progress of progresses) {
            const progressDate = new Date(progress.puzzleDate);
            const diffDays = Math.floor((currentDateObj.getTime() - progressDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === streak) {
                streak++;
                currentDateObj.setDate(currentDateObj.getDate() - 1);
            }
            else {
                break;
            }
        }
        return streak;
    }
    async awardAchievement(userId, achievementId, puzzleDate, metadata) {
        const achievement = await prisma_1.prisma.achievement.findUnique({ where: { id: achievementId } });
        if (!achievement) {
            throw new Error('Achievement not found');
        }
        // Create user achievement
        const userAchievement = await prisma_1.prisma.userAchievement.create({
            data: {
                userId,
                achievementId,
                puzzleDate,
                metadataData: metadata ? JSON.stringify(metadata) : null
            }
        });
        // Update user points
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { points: { increment: achievement.points } }
        });
        console.log(`🏆 User ${userId} earned achievement: ${achievement.name} (+${achievement.points} points)`);
        return userAchievement;
    }
    // Get user's achievements
    async getUserAchievements(userId) {
        return await prisma_1.prisma.userAchievement.findMany({
            where: { userId },
            include: { achievement: true },
            orderBy: { earnedAt: 'desc' }
        });
    }
    // Get all available achievements
    async getAllAchievements() {
        return await prisma_1.prisma.achievement.findMany({
            where: { isActive: true },
            orderBy: { points: 'asc' }
        });
    }
}
exports.AchievementService = AchievementService;
exports.default = AchievementService.getInstance();
//# sourceMappingURL=achievementService.js.map