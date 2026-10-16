import React, { useEffect } from 'react';
import { LogBox, Platform, useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { getThemeColors, resolveThemeMode } from '@/constants/fintechTheme';
import { usePreferencesStore } from '@/store/preferencesStore';

// Tarayıcı eklentilerinden (örn. Urban VPN chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon)
// kaynaklanan harici hataların Expo Web konsolunu kirletmesini engelle
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  LogBox.ignoreLogs(["Cannot read properties of undefined (reading 'M_ID')"]);

  window.addEventListener(
    'error',
    (event) => {
      if (
        event.filename?.includes('chrome-extension://') ||
        event.message?.includes('M_ID')
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );

  const origConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const first = String(args[0] ?? '');
    const stack = String((args[0] as { stack?: string })?.stack ?? '');
    if (
      first.includes('M_ID') ||
      first.includes('chrome-extension://') ||
      stack.includes('chrome-extension://')
    ) {
      return;
    }
    origConsoleError(...args);
  };
}

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
