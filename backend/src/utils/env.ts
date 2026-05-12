/**
 * Throws at boot if a required env var is missing or empty.
 * Use for secrets and other values where a silent fallback would be a security
 * hole (JWT_SECRET, SESSION_SECRET, PUZZLE_SECRET, etc).
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in .env or your deployment secrets.`
    );
  }
  return value;
}

/**
 * Returns the env var if set, otherwise the provided default. Use for
 * non-secret config (PORT, JWT_EXPIRE, NODE_ENV, etc).
 */
export function optionalEnv(name: string, defaultValue: string): string {
  const value = process.env[name];
  return value === undefined || value === '' ? defaultValue : value;
}
