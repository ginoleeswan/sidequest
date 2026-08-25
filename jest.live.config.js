/**
 * The live suite, on plain Node rather than the app's preset.
 *
 * Two reasons it needs its own config. The obvious one: `npm test` must
 * never reach these, because they need credentials, a network and
 * somebody's database, and a suite that quietly skips itself reads as a
 * passing check when it is no check at all.
 *
 * The one that took a while to find: jest-expo's preset installs React
 * Native's `fetch`, which in a test process is a stub. It resolves with
 * no status and no body, so supabase-js sees `undefined` where JSON
 * should be — a test that cannot reach the network while looking like
 * it did. Nothing here touches React Native (the engine and the
 * backend are plain TypeScript, and the shared client is mocked), so
 * the honest environment is node, with node's own fetch.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.integration.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testTimeout: 120_000,
};
