import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Suites share one database, so they must not interleave writes. The catalogue tests
    // are read-only, but the order and inventory suites are not.
    fileParallelism: false,
    env: { NODE_ENV: 'test' },
    include: ['tests/**/*.test.js'],
    globalSetup: ['tests/globalSetup.js'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
