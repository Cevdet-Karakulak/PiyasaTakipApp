import type { TextStyle } from 'react-native';

export const FintechTheme = {
  colors: {
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
  },
  typography: {
    // Sayısal değerlerin eşit aralıklı hizalanması için tabular-nums stili
    tabularNums: {
      fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
    },
  },
};
