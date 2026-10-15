import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import {
  ArrowLeftRight,
  Fuel,
  Newspaper,
  PieChart,
  Settings,
  TrendingUp,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FintechTheme } from '@/constants/fintechTheme';
import { useTranslation } from '@/store/preferencesStore';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Home Indicator çizgisiyle çakışmayı önlemek için güvenli alt boşluk
  const bottomInset = insets.bottom > 0 ? insets.bottom + 8 : Platform.OS === 'ios' ? 32 : 18;
  const tabHeight = 60 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: FintechTheme.colors.backgroundSecondary,
          borderTopColor: FintechTheme.colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingTop: 8,
          paddingBottom: bottomInset + 2,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
        },
        tabBarActiveTintColor: FintechTheme.colors.accent,
        tabBarInactiveTintColor: FintechTheme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
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
          title: t('Ayarlar'),
          tabBarIcon: ({ color, size }) => (
            <Settings size={size ?? 22} color={color} strokeWidth={2.2} />
          ),
        }}
      />
    </Tabs>
  );
}
