import logger from './logger';

/**
 * Parse JSON stored in a database column, returning the supplied fallback
 * if parsing fails. Logs the corruption so the operator can investigate;
 * never throws.
 *
 * Use this for every JSON.parse on DB-resident data — gridData, cluesData,
 * answersData, completedClues, metadataData, conditionData — so a single
 * corrupted row can't 500 an entire endpoint.
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T, context?: string): T {
  if (raw === null || raw === undefined || raw === '') {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.error('Failed to parse stored JSON', {
      context: context ?? 'unknown',
      error: (err as Error).message,
      raw: raw.length > 200 ? `${raw.slice(0, 200)}...` : raw,
    });
    return fallback;
  }
}
