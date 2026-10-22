import React, { useEffect } from 'react';
import { LogBox, Platform, Pressable, Share, Text, View, useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
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

/** Route/render failures can be retried and reported; native process crashes need an .ips log. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => { void SplashScreen.hideAsync().catch(() => {}); }, []);
  return <View style={{ flex: 1, backgroundColor: '#0b1423', justifyContent: 'center', padding: 28, gap: 16 }}>
    <Text style={{ color: '#f4f6fa', fontSize: 23, fontWeight: '700' }}>Bir sorun oluştu</Text>
    <Text style={{ color: '#a5b2c7', fontSize: 14, lineHeight: 22 }}>Uygulama bu ekranı açamadı. Tekrar deneyebilir veya hata raporunu paylaşabilirsin.</Text>
    <Pressable accessibilityRole="button" onPress={() => { void retry(); }} style={{ minHeight: 48, backgroundColor: '#2962FF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '700' }}>Tekrar dene</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => { void Share.share({ message: `PiyasaRadarı · ${Platform.OS} ${Platform.Version}\n${error.name}: ${error.message.slice(0, 1000)}` }).catch(() => {}); }} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#a5b2c7' }}>Hata raporunu paylaş</Text></Pressable>
  </View>;
}

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

