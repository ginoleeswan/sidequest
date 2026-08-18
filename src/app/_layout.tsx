import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Noah-Black': require('../../assets/fonts/Noah-Black.ttf'),
    'Noah-Bold': require('../../assets/fonts/Noah-Bold.ttf'),
    'Noah-BoldItalic': require('../../assets/fonts/Noah-BoldItalic.ttf'),
    'Noah-Regular': require('../../assets/fonts/Noah-Regular.ttf'),
    'Noah-RegularItalic': require('../../assets/fonts/Noah-RegularItalic.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#333D51' },
        }}
      />
    </SafeAreaProvider>
  );
}
