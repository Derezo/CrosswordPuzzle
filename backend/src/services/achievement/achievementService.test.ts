import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the prisma module BEFORE importing the service.
vi.mock('../../lib/prisma', () => ({
  prisma: {
    achievement: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    userAchievement: {
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    userProgress: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    dailyPuzzle: {
      findUnique: vi.fn(),
    },
  },
}));

import achievementService from './achievementService';
import { prisma } from '../../lib/prisma';

import type { AchievementProgress } from './achievementService';

const fakeUser = { id: 'user-1', email: 't@example.com' } as any;

// Build a minimal AchievementProgress; tests override the fields they care about.
const fakeUserProgress = (overrides: Partial<AchievementProgress> = {}): AchievementProgress => ({
  isCompleted: false,
  completedAt: null,
  solveTime: null,
  firstViewedAt: new Date(),
  startedAt: new Date(),
  ...overrides,
});

const fakeAchievement = (overrides: Partial<any> = {}) => ({
  id: 'ach-1',
  name: 'Test',
  description: 'd',
  points: 50,
  conditionType: 'first_word_ever',
  conditionData: '{}',
  icon: '⭐',
  isActive: true,
  createdAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('AchievementService.initializeAchievements', () => {
  it('creates each default achievement only if it does not already exist', async () => {
    (prisma.achievement.findUnique as any).mockResolvedValue(null);
    (prisma.achievement.create as any).mockResolvedValue({});

    await achievementService.initializeAchievements();

    // 10 default achievements defined in the service.
    expect(prisma.achievement.findUnique).toHaveBeenCalledTimes(10);
    expect(prisma.achievement.create).toHaveBeenCalledTimes(10);
  });

  it('skips creating achievements that already exist', async () => {
    (prisma.achievement.findUnique as any).mockResolvedValue(fakeAchievement());

    await achievementService.initializeAchievements();

    expect(prisma.achievement.create).not.toHaveBeenCalled();
  });

  it('stringifies the condition object into conditionData', async () => {
    (prisma.achievement.findUnique as any).mockResolvedValue(null);
    const createCalls: any[] = [];
    (prisma.achievement.create as any).mockImplementation((args: any) => {
      createCalls.push(args);
      return {};
    });

    await achievementService.initializeAchievements();

    const speedDemon = createCalls.find((c) => c.data.name === 'Speed Demon');
    expect(speedDemon).toBeDefined();
    expect(typeof speedDemon.data.conditionData).toBe('string');
    expect(JSON.parse(speedDemon.data.conditionData)).toEqual({ maxTime: 120 });
  });
});

describe('AchievementService.checkAchievements (idempotency)', () => {
  it('skips achievements the user has already earned', async () => {
    const ach = fakeAchievement({ conditionType: 'first_word_ever' });
    (prisma.achievement.findMany as any).mockResolvedValue([ach]);
    (prisma.userAchievement.findUnique as any).mockResolvedValue({ id: 'already' });

    const result = await achievementService.checkAchievements({
      user: fakeUser,
      puzzleDate: '2026-01-01',
      progress: fakeUserProgress(),
      newCompletedClues: [1],
    });

    expect(result).toEqual([]);
    expect(prisma.userAchievement.create).not.toHaveBeenCalled();
  });

  it('awards the achievement when the condition is met', async () => {
    const ach = fakeAchievement({ conditionType: 'first_word_ever', points: 10 });
    (prisma.achievement.findMany as any).mockResolvedValue([ach]);
    (prisma.userAchievement.findUnique as any).mockResolvedValue(null);
    (prisma.userAchievement.count as any).mockResolvedValue(0); // no prior achievements
    (prisma.achievement.findUnique as any).mockResolvedValue(ach);
    (prisma.userAchievement.create as any).mockResolvedValue({ id: 'new-ua' });
    (prisma.user.update as any).mockResolvedValue({});

    const result = await achievementService.checkAchievements({
      user: fakeUser,
      puzzleDate: '2026-01-01',
      progress: fakeUserProgress(),
      newCompletedClues: [1],
    });

    expect(result).toHaveLength(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { points: { increment: 10 } },
    });
  });
});

describe('AchievementService.checkAchievements (specific conditions)', () => {
  it('does not award puzzle_solve_speed if the solve was too slow', async () => {
    const ach = fakeAchievement({
      conditionType: 'puzzle_solve_speed',
      conditionData: JSON.stringify({ maxTime: 120 }),
    });
    (prisma.achievement.findMany as any).mockResolvedValue([ach]);
    (prisma.userAchievement.findUnique as any).mockResolvedValue(null);

    const result = await achievementService.checkAchievements({
      user: fakeUser,
      puzzleDate: '2026-01-01',
      progress: fakeUserProgress({ isCompleted: true }),
      newCompletedClues: [],
      solveTime: 200,
    });

    expect(result).toEqual([]);
  });

  it('awards puzzle_solve_speed when solve time is within limit', async () => {
    const ach = fakeAchievement({
      conditionType: 'puzzle_solve_speed',
      conditionData: JSON.stringify({ maxTime: 120 }),
    });
    (prisma.achievement.findMany as any).mockResolvedValue([ach]);
    (prisma.userAchievement.findUnique as any).mockResolvedValue(null);
    (prisma.achievement.findUnique as any).mockResolvedValue(ach);
    (prisma.userAchievement.create as any).mockResolvedValue({ id: 'ua' });
    (prisma.user.update as any).mockResolvedValue({});

    const result = await achievementService.checkAchievements({
      user: fakeUser,
      puzzleDate: '2026-01-01',
      progress: fakeUserProgress({ isCompleted: true }),
      newCompletedClues: [],
      solveTime: 100,
    });

    expect(result).toHaveLength(1);
  });

  it('survives corrupt conditionData via safeJsonParse fallback', async () => {
    const ach = fakeAchievement({
      conditionType: 'puzzle_solve_speed',
      conditionData: 'not valid json',
    });
    (prisma.achievement.findMany as any).mockResolvedValue([ach]);
    (prisma.userAchievement.findUnique as any).mockResolvedValue(null);

    // Should not throw even with malformed conditionData.
    const result = await achievementService.checkAchievements({
      user: fakeUser,
      puzzleDate: '2026-01-01',
      progress: fakeUserProgress({ isCompleted: true }),
      newCompletedClues: [],
      solveTime: 5,
    });

    // Without a maxTime, the comparison "5 <= undefined" is false → no award.
    expect(result).toEqual([]);
  });
});
