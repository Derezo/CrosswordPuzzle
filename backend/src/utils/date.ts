/**
 * YYYY-MM-DD strict validator. Rejects values like "2024-13-45", "invalid",
 * or empty strings. Returns the same string if valid, throws otherwise.
 *
 * The DailyPuzzle.date column is a SQLite TEXT, so the schema can't enforce
 * format; every entry point that accepts a puzzle date should validate here.
 */
export function assertIsoDate(input: unknown): string {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw new Error(`Expected YYYY-MM-DD date, got: ${JSON.stringify(input)}`);
  }
  // Reject impossible dates like 2024-02-30.
  const [y, m, d] = input.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new Error(`Invalid calendar date: ${input}`);
  }
  return input;
}

/**
 * Today as YYYY-MM-DD in UTC. The cron is UTC-scheduled, so the rest of the
 * app should consistently treat "today" as UTC to avoid off-by-one rollover.
 */
export function todayUtc(): string {
  return new Date().toISOString().split('T')[0];
}
