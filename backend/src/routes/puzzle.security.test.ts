import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

process.env.JWT_SECRET = 'puzzle-sec-test-secret-not-real';

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    dailyPuzzle: { findUnique: vi.fn(), findMany: vi.fn() },
    userProgress: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

// cronService and achievementService are imported at module load — stub them
// so importing the puzzle router doesn't spin up cron jobs or db calls.
vi.mock('../services/puzzle/cronService', () => ({
  default: { start: vi.fn(), generatePuzzleForDate: vi.fn() },
}));
vi.mock('../services/achievement/achievementService', () => ({
  default: { checkAchievements: vi.fn().mockResolvedValue([]) },
}));

import puzzleRoutes from './puzzle';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/puzzle', puzzleRoutes);
  return app;
}

describe('streaming endpoint auth — Phase 1 hardening', () => {
  it('GET /generate-category-stream/:categoryName returns 401 without auth', async () => {
    const res = await request(makeApp()).get('/api/puzzle/generate-category-stream/space');
    expect(res.status).toBe(401);
  });

  it('GET /generate-category-stream/:categoryName ignores a query-string token', async () => {
    // Tokens-in-query were the leaked-via-nginx-logs vector. Even a valid-looking
    // value in ?token=… must not authenticate the request.
    const res = await request(makeApp())
      .get('/api/puzzle/generate-category-stream/space?token=anything');
    expect(res.status).toBe(401);
  });

  it('POST /generate-multi-category-stream returns 401 without auth', async () => {
    const res = await request(makeApp())
      .post('/api/puzzle/generate-multi-category-stream')
      .send({ categoryNames: ['space'] });
    expect(res.status).toBe(401);
  });

  it('POST /generate-multi-category-stream ignores a token in the request body', async () => {
    // The previous shape `{ categoryNames, token }` is no longer honored.
    const res = await request(makeApp())
      .post('/api/puzzle/generate-multi-category-stream')
      .send({ categoryNames: ['space'], token: 'anything' });
    expect(res.status).toBe(401);
  });
});

describe('removed endpoints — Phase 1 cleanup', () => {
  it('GET /test-sse returns 404 (route deleted)', async () => {
    const res = await request(makeApp()).get('/api/puzzle/test-sse');
    expect(res.status).toBe(404);
  });
});
