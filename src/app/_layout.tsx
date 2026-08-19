import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import { Onboarding } from '@/components/Onboarding';
import { ToastProvider } from '@/components/Toast';
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
  const [fontsLoaded, fontError] = useFonts({
    'Noah-Black': require('../../assets/fonts/Noah-Black.ttf'),
    'Noah-Bold': require('../../assets/fonts/Noah-Bold.ttf'),
    'Noah-Regular': require('../../assets/fonts/Noah-Regular.ttf'),
  });

  useEffect(() => {
    // Don't hold the splash hostage to a font that will never arrive.
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <LibraryProvider>
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
          </ToastProvider>
        </SafeAreaProvider>
      </LibraryProvider>
    </QueryClientProvider>
  );
}
