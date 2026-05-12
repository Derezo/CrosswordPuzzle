import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { generateToken, verifyToken } from './jwt';

const FIXED_SECRET = 'test-secret-only-for-this-suite-not-real';

const fakeUser = (overrides: Partial<User> = {}): User => ({
  id: 'cuid_test_user',
  email: 'test@example.com',
  password: null,
  googleId: null,
  firstName: 'Test',
  lastName: 'User',
  points: 0,
  isAdmin: false,
  favoriteCategoryId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('jwt utils', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalExpire = process.env.JWT_EXPIRE;

  beforeEach(() => {
    process.env.JWT_SECRET = FIXED_SECRET;
    process.env.JWT_EXPIRE = '1h';
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalExpire === undefined) delete process.env.JWT_EXPIRE;
    else process.env.JWT_EXPIRE = originalExpire;
  });

  it('round-trips sign and verify', () => {
    const user = fakeUser();
    const token = generateToken(user);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(user.id);
    expect(typeof decoded.iat).toBe('number');
    expect(typeof decoded.exp).toBe('number');
  });

  it('rejects a token signed with a different secret', () => {
    const user = fakeUser();
    const wrongToken = jwt.sign({ userId: user.id }, 'wrong-secret', { expiresIn: '1h' });
    expect(() => verifyToken(wrongToken)).toThrow();
  });

  it('rejects a tampered payload', () => {
    const user = fakeUser();
    const token = generateToken(user);
    const [header, , signature] = token.split('.');
    const tampered = [header, Buffer.from('{"userId":"other"}').toString('base64url'), signature].join('.');
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ userId: 'x' }, FIXED_SECRET, { expiresIn: '-1s' });
    expect(() => verifyToken(expired)).toThrow();
  });

  it('throws if JWT_SECRET is missing when generating', () => {
    delete process.env.JWT_SECRET;
    expect(() => generateToken(fakeUser())).toThrow(/JWT_SECRET/);
  });

  it('throws if JWT_SECRET is missing when verifying', () => {
    // Sign with a known secret, then unset before verify.
    const t = jwt.sign({ userId: 'x' }, FIXED_SECRET);
    delete process.env.JWT_SECRET;
    expect(() => verifyToken(t)).toThrow(/JWT_SECRET/);
  });
});
