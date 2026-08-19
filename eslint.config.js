const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

const JEST_GLOBALS = {
  jest: 'readonly',
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  global: 'readonly',
};

module.exports = defineConfig([
  expoConfig,
  // Disables stylistic rules that would fight Prettier.
  prettierConfig,
  {
    files: [
      '**/__tests__/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      'jest.setup.js',
    ],
    languageOptions: { globals: JEST_GLOBALS },
  },
  {
    // Playwright is a tool the brand-asset script borrows when it is run by
    // hand; it is deliberately not a dependency of the app.
    files: ['scripts/**/*.mjs'],
    rules: { 'import/no-unresolved': ['error', { ignore: ['^playwright$'] }] },
  },
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'coverage/*'],
  },
]);
