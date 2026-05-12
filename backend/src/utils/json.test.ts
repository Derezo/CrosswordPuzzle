import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeJsonParse } from './json';

vi.mock('./logger', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse<number[]>('[1,2,3]', [])).toEqual([1, 2, 3]);
    expect(safeJsonParse<{ a: number }>('{"a":1}', { a: 0 })).toEqual({ a: 1 });
  });

  it('returns the fallback for malformed JSON', () => {
    expect(safeJsonParse<number[]>('not json', [])).toEqual([]);
    expect(safeJsonParse<number[]>('[1,2,', [99])).toEqual([99]);
  });

  it('returns the fallback for null, undefined, and empty string', () => {
    expect(safeJsonParse<string>(null, 'fallback')).toBe('fallback');
    expect(safeJsonParse<string>(undefined, 'fallback')).toBe('fallback');
    expect(safeJsonParse<string>('', 'fallback')).toBe('fallback');
  });

  it('does not throw on long corrupt input', () => {
    const big = '{'.repeat(500);
    expect(() => safeJsonParse<unknown>(big, null)).not.toThrow();
  });
});
