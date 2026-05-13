import { prisma } from '../../lib/prisma';
import { Achievement, UserAchievement, User, UserProgress } from '@prisma/client';
import { safeJsonParse } from '../../utils/json';
import { CrosswordClue } from '../../types';

// The service only reads a subset of UserProgress fields; this Pick documents
// exactly which fields are touched so callers can supply minimal stand-ins.
export type AchievementProgress = Pick<
  UserProgress,
  'isCompleted' | 'completedAt' | 'solveTime' | 'startedAt' | 'firstViewedAt'
>;

export interface AchievementCheckContext {
  user: User;
  puzzleDate: string;
  progress: AchievementProgress;
  newCompletedClues: number[];
  solveTime?: number | null;
  firstWordTime?: number | null;
}

type AchievementMetadata = Record<string, unknown>;
type AchievementCheckResult = { metadata?: AchievementMetadata } | null;

// Narrow a condition value that is expected to be numeric. Returns undefined
// if absent/non-numeric so comparisons collapse to false (matches prior `any`
// semantics where `value <= undefined` was always false).
function numericCondition(condition: Record<string, unknown>, key: string): number | undefined {
  const value = condition[key];
  return typeof value === 'number' ? value : undefined;
}

export class AchievementService {
  private static instance: AchievementService;

  private constructor() {}

  public static getInstance(): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService();
    }
    return AchievementService.instance;
  }

  // Initialize default achievements
  public async initializeAchievements(): Promise<void> {
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
      const existing = await prisma.achievement.findUnique({ where: { name: achievementData.name } });
      if (!existing) {
        const { condition, ...dataWithoutCondition } = achievementData;
        await prisma.achievement.create({
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
  public async checkAchievements(context: AchievementCheckContext): Promise<UserAchievement[]> {
    const newAchievements: UserAchievement[] = [];
    const achievements = await prisma.achievement.findMany({ where: { isActive: true } });

    for (const achievement of achievements) {
      const hasAchievement = await prisma.userAchievement.findUnique({
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
          const userAchievement = await this.awardAchievement(
            context.user.id,
            achievement.id,
            context.puzzleDate,
            earned.metadata
          );
          newAchievements.push(userAchievement);
        }
      }
    }

    return newAchievements;
  }

  private async checkAchievementCondition(
    achievement: Achievement,
    context: AchievementCheckContext
  ): Promise<AchievementCheckResult> {
    const condition = safeJsonParse<Record<string, unknown>>(achievement.conditionData, {}, 'achievement.conditionData');
    
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

  private async checkFirstWordEver(context: AchievementCheckContext): Promise<AchievementCheckResult> {
    if (context.newCompletedClues.length > 0) {
      const totalUserAchievements = await prisma.userAchievement.count({
        where: { userId: context.user.id }
      });
      
      if (totalUserAchievements === 0) {
        return { metadata: { firstClue: context.newCompletedClues[0] } };
      }
    }
    return null;
  }

  private async checkPuzzleSolveSpeed(
    achievement: Achievement,
    context: AchievementCheckContext
  ): Promise<AchievementCheckResult> {
    if (context.progress.isCompleted && context.solveTime) {
      const condition = safeJsonParse<Record<string, unknown>>(achievement.conditionData, {}, 'achievement.conditionData');
      const maxTime = numericCondition(condition, 'maxTime');
      if (maxTime !== undefined && context.solveTime <= maxTime) {
        return { metadata: { solveTime: context.solveTime } };
      }
    }
    return null;
  }

  private async checkFirstWordSpeed(
    achievement: Achievement,
    context: AchievementCheckContext
  ): Promise<AchievementCheckResult> {
    if (context.firstWordTime && context.newCompletedClues.length > 0) {
      const condition = safeJsonParse<Record<string, unknown>>(achievement.conditionData, {}, 'achievement.conditionData');
      const maxTime = numericCondition(condition, 'maxTime');
      if (maxTime !== undefined && context.firstWordTime <= maxTime) {
        return { metadata: { firstWordTime: context.firstWordTime } };
      }
    }
    return null;
  }

  private async checkLongestFirstWord(
    achievement: Achievement,
    context: AchievementCheckContext
  ): Promise<AchievementCheckResult> {
    if (context.newCompletedClues.length > 0) {
      const puzzle = await prisma.dailyPuzzle.findUnique({ where: { date: context.puzzleDate } });
      if (puzzle) {
        const cluesData = safeJsonParse<CrosswordClue[]>(puzzle.cluesData, [], 'puzzle.cluesData');
        const firstClue = cluesData.find((c: CrosswordClue) => c.number === context.newCompletedClues[0]);
        const condition = safeJsonParse<Record<string, unknown>>(achievement.conditionData, {}, 'achievement.conditionData');
        const minLength = numericCondition(condition, 'minLength');
        if (firstClue && minLength !== undefined && firstClue.length >= minLength) {
          return { metadata: { wordLength: firstClue.length, word: firstClue.answer } };
        }
      }
    }
    return null;
  }

  private async checkFirstSolverDaily(context: AchievementCheckContext): Promise<AchievementCheckResult> {
    if (context.progress.isCompleted && context.progress.completedAt) {
      const earlierCompletion = await prisma.userProgress.findFirst({
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

  private async checkPerfectPuzzle(context: AchievementCheckContext): Promise<AchievementCheckResult> {
    if (context.progress.isCompleted) {
      // This would require tracking wrong answers, which we'd need to implement
      // For now, assume perfect if completed
      return { metadata: { perfect: true } };
    }
    return null;
  }

  private async checkSolveStreak(
    achievement: Achievement,
    context: AchievementCheckContext
  ): Promise<AchievementCheckResult> {
    if (context.progress.isCompleted) {
      const condition = safeJsonParse<Record<string, unknown>>(achievement.conditionData, {}, 'achievement.conditionData');
      const streakLength = numericCondition(condition, 'streakLength');
      const streak = await this.calculateSolveStreak(context.user.id, context.puzzleDate);

      if (streakLength !== undefined && streak >= streakLength) {
        return { metadata: { streakLength: streak } };
      }
    }
    return null;
  }

  private async checkEarlyBird(
    achievement: Achievement,
    context: AchievementCheckContext
  ): Promise<AchievementCheckResult> {
    if (context.progress.isCompleted && context.progress.completedAt) {
      const condition = safeJsonParse<Record<string, unknown>>(achievement.conditionData, {}, 'achievement.conditionData');
      const hour = context.progress.completedAt.getHours();
      const maxHour = numericCondition(condition, 'maxHour');
      if (maxHour !== undefined && hour < maxHour) {
        return { metadata: { completionHour: hour } };
      }
    }
    return null;
  }

  private async checkNightOwl(
    achievement: Achievement,
    context: AchievementCheckContext
  ): Promise<AchievementCheckResult> {
    if (context.progress.isCompleted && context.progress.completedAt) {
      const condition = safeJsonParse<Record<string, unknown>>(achievement.conditionData, {}, 'achievement.conditionData');
      const hour = context.progress.completedAt.getHours();
      const minHour = numericCondition(condition, 'minHour');
      if (minHour !== undefined && hour >= minHour) {
        return { metadata: { completionHour: hour } };
      }
    }
    return null;
  }

  private async checkTotalPuzzles(
    achievement: Achievement,
    context: AchievementCheckContext
  ): Promise<AchievementCheckResult> {
    if (context.progress.isCompleted) {
      const totalCompleted = await prisma.userProgress.count({
        where: {
          userId: context.user.id,
          isCompleted: true
        }
      });
      
      const condition = safeJsonParse<Record<string, unknown>>(achievement.conditionData, {}, 'achievement.conditionData');
      const count = numericCondition(condition, 'count');
      if (count !== undefined && totalCompleted >= count) {
        return { metadata: { totalPuzzles: totalCompleted } };
      }
    }
    return null;
  }

  private async calculateSolveStreak(userId: string, currentDate: string): Promise<number> {
    const progresses = await prisma.userProgress.findMany({
      where: {
        userId,
        isCompleted: true
      },
      orderBy: { puzzleDate: 'desc' },
      take: 30 // Look at last 30 days
    });
    
    let streak = 0;
    const currentDateObj = new Date(currentDate);
    
    for (const progress of progresses) {
      const progressDate = new Date(progress.puzzleDate);
      const diffDays = Math.floor((currentDateObj.getTime() - progressDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak) {
        streak++;
        currentDateObj.setDate(currentDateObj.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }

  private async awardAchievement(
    userId: string,
    achievementId: string,
    puzzleDate: string,
    metadata?: AchievementMetadata
  ): Promise<UserAchievement> {
    const achievement = await prisma.achievement.findUnique({ where: { id: achievementId } });
    if (!achievement) {
      throw new Error('Achievement not found');
    }

    // Create user achievement
    const userAchievement = await prisma.userAchievement.create({
      data: {
        userId,
        achievementId,
        puzzleDate,
        metadataData: metadata ? JSON.stringify(metadata) : null
      }
    });

    // Update user points
    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: achievement.points } }
    });

    console.log(`🏆 User ${userId} earned achievement: ${achievement.name} (+${achievement.points} points)`);

    return userAchievement;
  }

  // Get user's achievements
  public async getUserAchievements(userId: string) {
    return await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' }
    });
  }

  // Get all available achievements
  public async getAllAchievements() {
    return await prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: { points: 'asc' }
    });
  }
}

export default AchievementService.getInstance();