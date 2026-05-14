import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';

// JWT_SECRET must be set before jwt utils are imported.
process.env.JWT_SECRET = 'auth-test-secret-not-real';
process.env.JWT_EXPIRE = '1h';

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Passport is loaded by auth.ts; mock it so we don't try to initialize a Google
// strategy (and so we can flip cookies in a future test).
vi.mock('../services/auth/passport', () => ({
  default: {
    initialize: () => (_req: any, _res: any, next: any) => next(),
    session: () => (_req: any, _res: any, next: any) => next(),
    authenticate: () => (_req: any, _res: any, next: any) => next(),
  },
}));

import authRoutes from './auth';
import { prisma } from '../lib/prisma';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });
  return app;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/auth/register', () => {
  it('creates a user on a valid payload', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockImplementation(({ data }: any) => ({
      id: 'cuid-new',
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      points: 0,
      isAdmin: false,
      password: data.password,
      googleId: null,
      favoriteCategoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const res = await request(makeApp()).post('/api/auth/register').send({
      email: 'new@example.com',
      password: 'StrongPass1',
      firstName: 'New',
      lastName: 'User',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('new@example.com');

    const setCookie = res.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const authCookie = cookies.find((c: string) => c.startsWith('auth_token='));
    expect(authCookie).toBeDefined();
    expect(authCookie).toMatch(/HttpOnly/);
    expect(authCookie).toMatch(/SameSite=Lax/i);
  });

  it('rejects a duplicate email with 409', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'existing' });

    const res = await request(makeApp()).post('/api/auth/register').send({
      email: 'dupe@example.com',
      password: 'StrongPass1',
      firstName: 'Dupe',
      lastName: 'User',
    });

    expect(res.status).toBe(409);
  });

  it('rejects an invalid email format with 400', async () => {
    const res = await request(makeApp()).post('/api/auth/register').send({
      email: 'not-an-email',
      password: 'StrongPass1',
      firstName: 'X',
      lastName: 'Y',
    });

    expect(res.status).toBe(400);
  });

  it('rejects a weak password with 400', async () => {
    const res = await request(makeApp()).post('/api/auth/register').send({
      email: 'weak@example.com',
      password: 'short',
      firstName: 'X',
      lastName: 'Y',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token on valid credentials', async () => {
    const hash = await bcrypt.hash('StrongPass1', 4);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'u1',
      email: 'me@example.com',
      password: hash,
      firstName: 'Me',
      lastName: 'User',
      points: 0,
      isAdmin: false,
    });

    const res = await request(makeApp()).post('/api/auth/login').send({
      email: 'me@example.com',
      password: 'StrongPass1',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    const setCookie = res.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const authCookie = cookies.find((c: string) => c.startsWith('auth_token='));
    expect(authCookie).toBeDefined();
    expect(authCookie).toMatch(/HttpOnly/);
    expect(authCookie).toMatch(/SameSite=Lax/i);
  });

  it('returns 401 for wrong password', async () => {
    const hash = await bcrypt.hash('CorrectPass1', 4);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'u1',
      email: 'me@example.com',
      password: hash,
      firstName: 'Me',
      lastName: 'User',
      points: 0,
      isAdmin: false,
    });

    const res = await request(makeApp()).post('/api/auth/login').send({
      email: 'me@example.com',
      password: 'WrongPass1',
    });

    expect(res.status).toBe(401);
  });

  it('returns 401 for missing user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const res = await request(makeApp()).post('/api/auth/login').send({
      email: 'ghost@example.com',
      password: 'Anything1',
    });

    expect(res.status).toBe(401);
  });

  it('rejects a missing password with 400 (validates Phase 1 new schema)', async () => {
    const res = await request(makeApp()).post('/api/auth/login').send({
      email: 'me@example.com',
    });

    expect(res.status).toBe(400);
  });

  it('rejects a missing email with 400', async () => {
    const res = await request(makeApp()).post('/api/auth/login').send({
      password: 'anything',
    });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the user when a valid Bearer token is provided', async () => {
    const { generateToken } = await import('../utils/jwt');
    const user = {
      id: 'cuid-me',
      email: 'me@example.com',
      firstName: 'Me',
      lastName: 'User',
      points: 42,
      isAdmin: false,
      password: null,
      googleId: null,
      favoriteCategoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    (prisma.user.findUnique as any).mockResolvedValue(user);

    const token = generateToken(user as any);
    const res = await request(makeApp())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@example.com');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(makeApp()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 403 when the token is invalid', async () => {
    const res = await request(makeApp())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(403);
  });
});
