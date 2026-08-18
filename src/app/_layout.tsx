import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import { Onboarding } from '@/components/Onboarding';
import { LibraryProvider } from '@/lib/library';
import { COLORS } from '@/styles/colors';

export { ErrorBoundary } from 'expo-router';

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
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: COLORS.darkGrey },
            }}
          />
          <Onboarding />
        </SafeAreaProvider>
      </LibraryProvider>
    </QueryClientProvider>
  );
}
