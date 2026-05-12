import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { requireEnv, optionalEnv } from './env';

describe('requireEnv', () => {
  const KEY = '__TEST_ENV_VAR_REQUIRED__';

  afterEach(() => {
    delete process.env[KEY];
  });

  it('returns the value when set', () => {
    process.env[KEY] = 'hello';
    expect(requireEnv(KEY)).toBe('hello');
  });

  it('throws when undefined', () => {
    delete process.env[KEY];
    expect(() => requireEnv(KEY)).toThrow(/Missing required environment variable/);
    expect(() => requireEnv(KEY)).toThrow(KEY);
  });

  it('throws when empty string', () => {
    process.env[KEY] = '';
    expect(() => requireEnv(KEY)).toThrow(/Missing required environment variable/);
  });
});

describe('optionalEnv', () => {
  const KEY = '__TEST_ENV_VAR_OPTIONAL__';

  afterEach(() => {
    delete process.env[KEY];
  });

  it('returns the value when set', () => {
    process.env[KEY] = 'set';
    expect(optionalEnv(KEY, 'default')).toBe('set');
  });

  it('returns the default when unset', () => {
    delete process.env[KEY];
    expect(optionalEnv(KEY, 'default')).toBe('default');
  });

  it('returns the default for empty string', () => {
    process.env[KEY] = '';
    expect(optionalEnv(KEY, 'default')).toBe('default');
  });
});
