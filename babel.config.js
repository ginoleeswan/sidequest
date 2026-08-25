/**
 * Identical to Expo's implicit default, made explicit for one reason:
 * under jest, dynamic `import()` reaches the VM untransformed and every
 * call site throws "A dynamic import callback was invoked without
 * --experimental-vm-modules". The app leans on lazy import() for native
 * modules (calendar, notifications, haptics, sign-in), and each one was
 * silently dead in tests — their catch blocks read the VM error as "no
 * native module" and swallowed it, which made the entire lazy-native
 * surface untestable without anyone noticing.
 *
 * The transform is test-only. Metro never sees it, so production
 * bundles keep real dynamic imports.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      test: {
        plugins: ['@babel/plugin-transform-dynamic-import'],
      },
    },
  };
};
