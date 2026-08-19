// expo-font resolves asynchronously in tests; treat fonts as always loaded.
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
}));

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
    useLocalSearchParams: () => ({}),
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
