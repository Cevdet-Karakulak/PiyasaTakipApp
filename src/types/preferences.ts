export type Language = 'tr' | 'en';
export type ThemeMode = 'dark' | 'light';

export interface Preferences {
  theme: ThemeMode;
  language: Language;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  language: 'tr',
};
