import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { getThemeColors, resolveThemeMode } from '@/constants/fintechTheme';
import { usePreferencesStore } from '@/store/preferencesStore';

// Splash screen'in ilk yükleme bitene kadar ekranda kalmasını sağla
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const theme = usePreferencesStore((s) => s.theme);
  const systemScheme = useColorScheme();
  const isDark = resolveThemeMode(theme, systemScheme) === 'dark';
  const colors = getThemeColors(theme, systemScheme);

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
