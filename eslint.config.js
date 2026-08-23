const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');

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
    /**
     * `require()` is how you reference a bundled asset, not a lapse.
     *
     * Metro resolves fonts and images through `require`, and what comes
     * back is an opaque module id the asset registry understands — not a
     * module with exports. `expo-font` and the memcard's offscreen
     * renderer both want exactly that id, so an `import` here would be
     * the wrong tool wearing the right syntax.
     *
     * Narrowed to asset extensions rather than switched off: a stray
     * `require('some-package')` in application code is still the smell
     * this rule exists to catch, and it stays caught.
     */
    // The plugin has to be named in the SAME object as the rule it
    // configures — flat config does not inherit plugins from the shared
    // config above, and referencing the rule without it is a hard error
    // rather than a silent no-op.
    files: ['**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': typescriptPlugin },
    rules: {
      '@typescript-eslint/no-require-imports': [
        'error',
        { allow: ['\\.(woff2?|ttf|otf|png|jpe?g|gif|svg|mp4|webp)$'] },
      ],
    },
  },
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'coverage/*'],
  },
]);
