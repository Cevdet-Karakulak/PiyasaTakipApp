import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { Language, Preferences, ThemeMode } from '@/types/preferences';
import { DEFAULT_PREFERENCES } from '@/types/preferences';
import { translateText } from '@/utils/i18n';

const PREFERENCES_STORAGE_KEY = 'piyasaradari:preferences';

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const getStorage = (): StateStorage =>
  Platform.OS === 'web' && typeof window === 'undefined' ? noopStorage : AsyncStorage;

export interface PreferencesState extends Preferences {
  hasHydrated: boolean;
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  setHasHydrated: (state: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      hasHydrated: false,
      setLanguage: (language: Language) => set({ language }),
      setTheme: (theme: ThemeMode) => set({ theme }),
      setPreference: (key, value) => set({ [key]: value }),
      setHasHydrated: (hasHydrated: boolean) => set({ hasHydrated }),
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(getStorage),
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function useTranslation() {
  const language = usePreferencesStore((s) => s.language);
  const theme = usePreferencesStore((s) => s.theme);
  const setLanguage = usePreferencesStore((s) => s.setLanguage);
  const setTheme = usePreferencesStore((s) => s.setTheme);

  const t = (key: string) => translateText(key, language);

  return {
    t,
    language,
    theme,
    setLanguage,
    setTheme,
  };
}
