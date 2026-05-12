import { describe, it, expect } from 'vitest';
import { assertIsoDate, todayUtc } from './date';

describe('assertIsoDate', () => {
  it('accepts a well-formed date', () => {
    expect(assertIsoDate('2026-05-12')).toBe('2026-05-12');
    expect(assertIsoDate('2000-01-01')).toBe('2000-01-01');
  });

  it('rejects malformed strings', () => {
    expect(() => assertIsoDate('invalid')).toThrow();
    expect(() => assertIsoDate('2026/05/12')).toThrow();
    expect(() => assertIsoDate('26-05-12')).toThrow();
    expect(() => assertIsoDate('')).toThrow();
  });

  it('rejects non-string inputs', () => {
    expect(() => assertIsoDate(undefined)).toThrow();
    expect(() => assertIsoDate(null)).toThrow();
    expect(() => assertIsoDate(20260512)).toThrow();
  });

  it('rejects impossible calendar dates', () => {
    expect(() => assertIsoDate('2024-13-01')).toThrow();
    expect(() => assertIsoDate('2024-02-30')).toThrow();
    expect(() => assertIsoDate('2024-00-15')).toThrow();
  });
});

describe('todayUtc', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(todayUtc()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
