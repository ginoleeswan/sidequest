/**
 * The timezone suite, run with the clock somewhere that changes it.
 *
 * A date bug that only appears on the two days a year a clock moves is
 * invisible on a UTC runner, and this app has already shipped one of
 * them (release dates read a day early, fixed in `calendarDate`).
 * Setting `process.env.TZ` inside a test does not work — jest's sandbox
 * has fixed the timezone before the test body runs, so `Date` keeps
 * reporting UTC and the test passes against the broken code. The only
 * thing that works is setting it before the process starts, which is
 * what the `test:tz` script does.
 *
 * Kept out of `npm test` by name (`*.tz.test.ts`) so the main run stays
 * in one timezone and these stay in the other.
 */
const base = require('./package.json').jest;

module.exports = {
  ...base,
  testPathIgnorePatterns: ['/node_modules/'],
  testMatch: ['<rootDir>/src/**/*.tz.test.ts'],
  collectCoverage: false,
  coverageThreshold: undefined,
};
