import { useColorScheme, type ColorSchemeName, type TextStyle } from 'react-native';

import { usePreferencesStore } from '@/store/preferencesStore';
import type { ThemeMode } from '@/types/preferences';

export const DARK_THEME_COLORS = {
  background: '#0b1423',
  backgroundSecondary: '#101b2e',
  surface: '#142136',
  surfaceHighlight: '#1b2c45',
  border: '#263750',
  borderLight: '#314666',

  // TradingView Finansal Göstergeler
  up: '#00C076',
  upSoft: 'rgba(0, 192, 118, 0.15)',
  down: '#f15b6d',
  downSoft: 'rgba(241, 91, 109, 0.15)',
  neutral: '#a5b2c7',

  // Vurgu ve Marka
  accent: '#2962FF',
  accentSoft: 'rgba(41, 98, 255, 0.15)',
  gold: '#F59E0B',
  goldSoft: 'rgba(245, 158, 11, 0.15)',
  energy: '#F97316',
  energySoft: 'rgba(249, 115, 22, 0.15)',
  stock: '#8B5CF6',
  stockSoft: 'rgba(139, 92, 246, 0.15)',

  // Tipografi
  text: '#f4f6fa',
  textSecondary: '#cbd5e1',
  textMuted: '#a5b2c7',
  textInverse: '#0b1423',
};

export const LIGHT_THEME_COLORS = {
  background: '#f5f6f8',
  backgroundSecondary: '#ffffff',
  surface: '#ffffff',
  surfaceHighlight: '#edf1f7',
  border: '#e8ecf2',
  borderLight: '#d5dde8',

  // TradingView Finansal Göstergeler (Açık tema için yüksek kontrast)
  up: '#247b5c',
  upSoft: 'rgba(36, 123, 92, 0.12)',
  down: '#d7354a',
  downSoft: 'rgba(215, 53, 74, 0.12)',
  neutral: '#607086',

  // Vurgu ve Marka
  accent: '#2563EB',
  accentSoft: 'rgba(37, 99, 235, 0.12)',
  gold: '#D97706',
  goldSoft: 'rgba(217, 119, 6, 0.12)',
  energy: '#EA580C',
  energySoft: 'rgba(234, 88, 12, 0.12)',
  stock: '#7C3AED',
  stockSoft: 'rgba(124, 58, 237, 0.12)',

  // Tipografi
  text: '#142036',
  textSecondary: '#334155',
  textMuted: '#607086',
  textInverse: '#f4f6fa',
};

export type ThemeColors = typeof DARK_THEME_COLORS;

export const resolveThemeMode = (
  theme: ThemeMode,
  systemScheme?: ColorSchemeName
): 'dark' | 'light' => {
  if (theme === 'system') {
    return systemScheme === 'light' ? 'light' : 'dark';
  }
  return theme;
};

export const getThemeColors = (
  theme: ThemeMode,
  systemScheme?: ColorSchemeName
): ThemeColors => {
  const resolved = resolveThemeMode(theme, systemScheme);
  return resolved === 'light' ? LIGHT_THEME_COLORS : DARK_THEME_COLORS;
};

export const FintechTheme = {
  colors: DARK_THEME_COLORS,
  typography: {
    // Sayısal değerlerin eşit aralıklı hizalanması için tabular-nums stili
    tabularNums: {
      fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
    },
  },
};

/**
 * Aktif kullanıcı temasına (dark / light / system) göre dinamik renk paletini döndüren React hook'u.
 */
export function useThemeColors(): ThemeColors {
  const theme = usePreferencesStore((s) => s.theme);
  const systemScheme = useColorScheme();
  return getThemeColors(theme, systemScheme);
}
