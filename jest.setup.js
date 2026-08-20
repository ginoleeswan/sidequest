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
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
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
    usePathname: () => '/',
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
