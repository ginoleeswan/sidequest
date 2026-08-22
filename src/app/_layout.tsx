import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { FontDisplay, useFonts, type FontSource } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MAX_AGE, persister } from '@/api/persist';
import { queryClient } from '@/api/queryClient';
import { CommandPalette } from '@/components/CommandPalette';
import { Onboarding } from '@/components/Onboarding';
import { ScreenFade } from '@/components/ScreenFade';
import { SplashCurtain } from '@/components/SplashCurtain';
import { SaveErrorNotice } from '@/components/SaveErrorNotice';
import { TabBar } from '@/components/TabBar';
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

  /**
   * Reloading should show the top of the page, not wherever you left it.
   *
   * Browsers restore the scroll position on refresh, which is right for
   * a document you were reading and wrong for an app: pulling to refresh
   * on the landing page left it half way down its own hero. Taking
   * manual control has to happen before the first paint, and once —
   * hence a separate effect from the per-route one below.
   */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

SplashScreen.preventAutoHideAsync();

/**
 * The same three weights in the format each platform can read.
 *
 * Web takes woff2: 99 KB for all three against 291 KB of TTF, with the
 * same 711 glyphs — and the largest thing on the page is text, so those
 * bytes are on the path to the last paint. Native cannot read woff2, so
 * it keeps the TTFs.
 */
const FACES: Record<string, FontSource> =
  Platform.OS === 'web'
    ? {
        /**
         * Ionicons, cut down to the glyphs this app names.
         *
         * Registered under the family name @expo/vector-icons uses, and
         * before any icon mounts, so its own `Font.isLoaded('ionicons')`
         * check passes and the vendored 381 KB TTF — the largest asset
         * the site had — is never requested. See scripts/subset-icons.
         */
        ionicons: {
          uri: require('../../assets/fonts/ionicons-subset.woff2'),
          display: FontDisplay.SWAP,
        },
        'Noah-Black': {
          uri: require('../../assets/fonts/Noah-Black.woff2'),
          display: FontDisplay.SWAP,
        },
        'Noah-Bold': {
          uri: require('../../assets/fonts/Noah-Bold.woff2'),
          display: FontDisplay.SWAP,
        },
        'Noah-Regular': {
          uri: require('../../assets/fonts/Noah-Regular.woff2'),
          display: FontDisplay.SWAP,
        },
      }
    : {
        'Noah-Black': require('../../assets/fonts/Noah-Black.ttf'),
        'Noah-Bold': require('../../assets/fonts/Noah-Bold.ttf'),
        'Noah-Regular': require('../../assets/fonts/Noah-Regular.ttf'),
      };

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
  const [fontsLoaded, fontError] = useFonts(FACES);

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
              <ScreenFade>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: COLORS.darkGrey },
                  }}
                />
              </ScreenFade>
              <TabBar />
              <Onboarding />
              <CommandPalette />
              <SaveErrorNotice />
              {/* Last, so it covers the tab bar and the onboarding
                  sheet too: until it lifts, the app has not opened. */}
              <SplashCurtain />
            </ToastProvider>
          </SafeAreaProvider>
        </DurationsProvider>
      </LibraryProvider>
    </PersistQueryClientProvider>
  );
}
