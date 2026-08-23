import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/Toast';
import { DurationsProvider } from '@/lib/durations';
import { AuthProvider } from '@/lib/auth';
import { LibraryProvider } from '@/lib/library';
import { _setBackendForTests } from '@/lib/storage';

/**
 * Renders a component inside the providers the app always gives it.
 *
 * Anything that shows a game reaches for the library, the corrected
 * durations, or a toast, and a component test that omits one fails on a
 * missing context rather than on the behaviour it meant to check.
 */

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function renderApp(ui: React.ReactElement) {
  // A fresh client per render: cached data must never leak between tests.
  //
  // gcTime is zeroed because the default five minutes is a real timer:
  // every query a test makes leaves one behind, node keeps the event loop
  // alive until it fires, and the jest run appears to hang long after the
  // assertions have passed.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={METRICS}>
        {/* Mirrors the root layout. `/you` renders the sign-in section,
            which asks for a session — without this the screen throws
            rather than rendering signed out, which is the state almost
            every reader is in. */}
        <AuthProvider>
          <LibraryProvider>
            <DurationsProvider>
              <ToastProvider>{ui}</ToastProvider>
            </DurationsProvider>
          </LibraryProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

/**
 * A storage stand-in the tests can seed and inspect.
 *
 * Installed through the storage layer's own test seam rather than by
 * stubbing `localStorage`: under jest the app runs its NATIVE code
 * paths, where localStorage does not exist and the real store is
 * SQLite. Seeding the global the app no longer reads would make every
 * assertion here pass against nothing.
 *
 * Returns the backing object: assign to it to seed a library before
 * mounting, read from it to assert a write actually landed.
 */
export function useFakeStorage(): Record<string, string> {
  const store: Record<string, string> = {};
  _setBackendForTests({
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  });
  return store;
}
