// expo-font resolves asynchronously in tests; treat fonts as always loaded.
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
}));

/**
 * expo-video's native module is absent in the test environment and its
 * player class fails at import time. Trailers are a leaf; the screens
 * that carry them are not.
 */
jest.mock('expo-video', () => {
  const { View } = require('react-native');
  return {
    useVideoPlayer: () => ({ play: jest.fn(), pause: jest.fn() }),
    VideoView: View,
  };
});

jest.mock('expo-splash-screen', () => ({
  // Promises, as the real module returns: the app chains .catch on both.
  preventAutoHideAsync: jest.fn(async () => true),
  hideAsync: jest.fn(async () => true),
}));

/**
 * expo-router ships untranspiled TSX that jest-expo does not transform,
 * and importing it fails before any assertion runs. Component tests care
 * about what a press *does*, not that navigation happened inside a real
 * router, so a stub is both sufficient and faster.
 */
jest.mock('expo-router', () => {
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  };
  const { View } = require('react-native');
  return {
    router,
    useRouter: () => router,
    // Current path a test can set: globalThis.routePathname = '/library'.
    usePathname: () => globalThis.routePathname ?? '/',
    // Route params a test can set: globalThis.routeParams = { id: '1' }.
    useLocalSearchParams: () => globalThis.routeParams ?? {},
    useSegments: () => [],
    useFocusEffect: jest.fn(),
    Link: View,
    Stack: Object.assign(View, { Screen: View }),
    Slot: View,
    SplashScreen: { preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() },
  };
});

/**
 * React Query batches its subscriber notifications through a timer, which
 * lands outside the test's act() scope and prints an update-not-wrapped
 * warning for any query that settles. Running the scheduler synchronously
 * is the documented testing setup, and makes the warnings real again.
 */
const { notifyManager } = require('@tanstack/react-query');
notifyManager.setScheduler((callback) => callback());

/**
 * The share sheet, as a spy.
 *
 * `Share.share` opens real system UI, so tests that hand a library or a
 * plan link out of the app read this instead. Spied rather than mocked
 * wholesale, so the rest of react-native stays itself.
 */
const { Share: RNShare } = require('react-native');
jest
  .spyOn(RNShare, 'share')
  .mockResolvedValue({ action: RNShare.sharedAction });

/**
 * expo-linking reads the URL scheme from the expo-constants manifest,
 * which the test runner does not have, so `createURL` throws where the
 * app would build `sidequest://you`. The three calls the auth provider
 * makes are stubbed: a link to build, no launch URL, and a listener that
 * a test can fire through `globalThis.emitUrl`.
 */
jest.mock('expo-linking', () => ({
  createURL: (path) => `sidequest://${path.replace(/^\//, '')}`,
  getInitialURL: jest.fn(async () => globalThis.initialUrl ?? null),
  addEventListener: jest.fn((_type, listener) => {
    globalThis.emitUrl = (url) => listener({ url });
    return {
      remove: () => {
        if (globalThis.emitUrl) delete globalThis.emitUrl;
      },
    };
  }),
}));

/**
 * expo-network's native module is absent in the runner. The app treats
 * a device that cannot report its network as online, and so does this.
 */
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => ({
    isConnected: true,
    isInternetReachable: true,
  })),
  addNetworkStateListener: jest.fn(() => ({ remove: () => {} })),
}));
