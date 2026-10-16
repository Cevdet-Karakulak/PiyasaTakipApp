import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import {
  ArrowLeftRight,
  Fuel,
  Newspaper,
  PieChart,
  TrendingUp,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/constants/fintechTheme';
import { useTranslation } from '@/store/preferencesStore';
import { recordAdInteraction } from '@/utils/admob';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useThemeColors();

  // Home Indicator çizgisiyle çakışmayı önlemek için güvenli alt boşluk
  const bottomInset = insets.bottom > 0 ? insets.bottom + 8 : Platform.OS === 'ios' ? 32 : 18;
  const tabHeight = 60 + bottomInset;

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          recordAdInteraction();
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundSecondary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingTop: 8,
          paddingBottom: bottomInset + 2,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.15,
          shadowRadius: 5,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('Piyasalar'),
          tabBarIcon: ({ color, size }) => (
            <TrendingUp size={size ?? 22} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="fuel"
        options={{
          title: t('Akaryakıt'),
          tabBarIcon: ({ color, size }) => (
            <Fuel size={size ?? 22} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: t('Haberler'),
          tabBarIcon: ({ color, size }) => (
            <Newspaper size={size ?? 22} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: t('Portföy'),
          tabBarIcon: ({ color, size }) => (
            <PieChart size={size ?? 22} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="converter"
        options={{
          title: t('Çevirici'),
          tabBarIcon: ({ color, size }) => (
            <ArrowLeftRight size={size ?? 22} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Alt menüde yer kaplamaz, üst barlardaki ayarlar ikonundan açılır
        }}
      />
    </Tabs>
  );
}
