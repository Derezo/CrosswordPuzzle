import { prisma } from '../src/lib/prisma';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'file:./test.db';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.PUZZLE_SECRET = 'test-puzzle-secret';
  
  console.log('🧪 Setting up test environment...');
});

// Clean up after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  await prisma.$disconnect();
});

// Clean database before each test
beforeEach(async () => {
  // Clear all tables in reverse order to handle foreign keys
  await prisma.userAchievement.deleteMany();
  await prisma.userProgress.deleteMany();
  await prisma.suggestion.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.dailyPuzzle.deleteMany();
  await prisma.user.deleteMany();
});