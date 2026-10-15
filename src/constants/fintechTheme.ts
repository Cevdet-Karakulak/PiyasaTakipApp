import type { TextStyle } from 'react-native';

import { usePreferencesStore } from '@/store/preferencesStore';
import type { ThemeMode } from '@/types/preferences';

export const DARK_THEME_COLORS = {
  background: '#0B0E14',
  backgroundSecondary: '#0F131C',
  surface: '#141A26',
  surfaceHighlight: '#1A2234',
  border: '#1F293D',
  borderLight: '#2A364F',

  // TradingView Finansal Göstergeler
  up: '#00C076',
  upSoft: 'rgba(0, 192, 118, 0.15)',
  down: '#FF3B30',
  downSoft: 'rgba(255, 59, 48, 0.15)',
  neutral: '#94A3B8',

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
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0B0E14',
};

export const LIGHT_THEME_COLORS = {
  background: '#F8FAFC',
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceHighlight: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#CBD5E1',

  // TradingView Finansal Göstergeler (Açık tema için yüksek kontrast)
  up: '#059669',
  upSoft: 'rgba(5, 150, 105, 0.12)',
  down: '#DC2626',
  downSoft: 'rgba(220, 38, 38, 0.12)',
  neutral: '#64748B',

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
  text: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textInverse: '#F8FAFC',
};

export type ThemeColors = typeof DARK_THEME_COLORS;

export const getThemeColors = (theme: ThemeMode): ThemeColors =>
  theme === 'light' ? LIGHT_THEME_COLORS : DARK_THEME_COLORS;

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
 * Aktif kullanıcı temasına (dark / light) göre dinamik renk paletini döndüren React hook'u.
 */
export function useThemeColors(): ThemeColors {
  const theme = usePreferencesStore((s) => s.theme);
  return theme === 'light' ? LIGHT_THEME_COLORS : DARK_THEME_COLORS;
}
