import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { FontDisplay, useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MAX_AGE, persister } from '@/api/persist';
import { queryClient } from '@/api/queryClient';
import { Onboarding } from '@/components/Onboarding';
import { SaveErrorNotice } from '@/components/SaveErrorNotice';
import { ToastProvider } from '@/components/Toast';
import { DurationsProvider } from '@/lib/durations';
import { LibraryProvider } from '@/lib/library';
import { COLORS } from '@/styles/colors';

export { ErrorBoundary } from 'expo-router';

/**
 * The document is the scroller, so SPA navigations inherit the previous
 * page's scroll position - a game page could open half-way down. Reset on
 * every route change.
 */
function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    if (Platform.OS === 'web') window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  /**
   * `swap`, not the default `auto`.
   *
   * Browsers read `auto` as `block`: text is invisible until the font
   * arrives, for up to three seconds. On a slow connection that is most
   * of the time someone spends looking at the app, and it is the single
   * clearest tell that this is a web page rather than an app. With
   * `swap` the copy is readable immediately in the fallback and
   * re-renders in Noah when it lands.
   */
  const [fontsLoaded, fontError] = useFonts({
    'Noah-Black': {
      uri: require('../../assets/fonts/Noah-Black.ttf'),
      display: FontDisplay.SWAP,
    },
    'Noah-Bold': {
      uri: require('../../assets/fonts/Noah-Bold.ttf'),
      display: FontDisplay.SWAP,
    },
    'Noah-Regular': {
      uri: require('../../assets/fonts/Noah-Regular.ttf'),
      display: FontDisplay.SWAP,
    },
  });

  useEffect(() => {
    // Don't hold the splash hostage to a font that will never arrive.
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: MAX_AGE }}
    >
      <LibraryProvider>
        <DurationsProvider>
          <SafeAreaProvider>
            <ToastProvider>
              <StatusBar style="light" />
              <ScrollToTop />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: COLORS.darkGrey },
                }}
              />
              <Onboarding />
              <SaveErrorNotice />
            </ToastProvider>
          </SafeAreaProvider>
        </DurationsProvider>
      </LibraryProvider>
    </PersistQueryClientProvider>
  );
}
