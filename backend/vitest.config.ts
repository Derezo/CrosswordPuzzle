import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Puzzle generation tests can take several seconds; bump default per-test
    // timeout from 5s. Individual tests can still set higher via `it(..., ms)`.
    testTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/scripts/**',
        'src/server.ts',
      ],
      thresholds: {
        lines: 30,
        functions: 30,
        statements: 30,
        branches: 25,
      },
    },
  },
});
