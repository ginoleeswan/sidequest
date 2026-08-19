import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/Toast';
import { DurationsProvider } from '@/lib/durations';
import { LibraryProvider } from '@/lib/library';

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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={METRICS}>
        <LibraryProvider>
          <DurationsProvider>
            <ToastProvider>{ui}</ToastProvider>
          </DurationsProvider>
        </LibraryProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

/**
 * A localStorage stand-in the tests can seed and inspect.
 *
 * Returns the backing object: assign to it to seed a library before
 * mounting, read from it to assert a write actually landed.
 */
export function useFakeStorage(): Record<string, string> {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => delete store[k],
    },
  });
  return store;
}
