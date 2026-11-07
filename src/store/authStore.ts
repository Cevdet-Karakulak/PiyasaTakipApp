import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

const AUTH_STORAGE_KEY = 'piyasaradari:auth:v1';

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const getStorage = (): StateStorage =>
  Platform.OS === 'web' && typeof window === 'undefined' ? noopStorage : AsyncStorage;

export type AuthProviderType = 'google' | 'email' | 'apple';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  provider: AuthProviderType;
  createdAt: string;
}

interface StoredAccount extends AuthUser {
  passwordHash?: string;
}

export interface AuthActionResult {
  ok: boolean;
  error?: string;
}

export interface AuthState {
  user: AuthUser | null;
  accounts: StoredAccount[];
  hasHydrated: boolean;
  registerWithEmail: (name: string, email: string, password: string) => AuthActionResult;
  loginWithEmail: (email: string, password: string) => AuthActionResult;
  loginWithGoogle: (profile?: { name?: string; email?: string }) => AuthActionResult;
  loginWithApple: (profile?: { id?: string; name?: string; email?: string }) => AuthActionResult;
  updateProfile: (name: string) => AuthActionResult;
  resetPassword: (email: string, newPassword: string) => AuthActionResult;
  logout: () => void;
  deleteAccount: () => void;
  setHasHydrated: (hydrated: boolean) => void;
}

const simpleHash = (value: string): string => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accounts: [],
      hasHydrated: false,

      registerWithEmail: (name, email, password) => {
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanName.length < 2) {
          return { ok: false, error: 'Lütfen geçerli bir ad soyad girin (en az 2 karakter).' };
        }
        if (!isValidEmail(cleanEmail)) {
          return { ok: false, error: 'Lütfen geçerli bir e-posta adresi girin.' };
        }
        if (password.length < 6) {
          return { ok: false, error: 'Şifreniz en az 6 karakter olmalıdır.' };
        }

        const existing = get().accounts.find(
          (acc) => acc.email.toLowerCase() === cleanEmail
        );
        if (existing) {
          return {
            ok: false,
            error: 'Bu e-posta adresi ile kayıtlı bir hesap zaten bulunuyor. Giriş yapabilirsiniz.',
          };
        }

        const newAccount: StoredAccount = {
          id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: cleanName,
          email: cleanEmail,
          provider: 'email',
          createdAt: new Date().toISOString(),
          passwordHash: simpleHash(password),
        };

        const { passwordHash: _, ...publicUser } = newAccount;
        set({
          accounts: [...get().accounts, newAccount],
          user: publicUser,
        });

        return { ok: true };
      },

      loginWithEmail: (email, password) => {
        const cleanEmail = email.trim().toLowerCase();
        if (!isValidEmail(cleanEmail)) {
          return { ok: false, error: 'Lütfen geçerli bir e-posta adresi girin.' };
        }
        if (!password || password.length < 6) {
          return { ok: false, error: 'Lütfen en az 6 karakterli şifrenizi girin.' };
        }

        const account = get().accounts.find(
          (acc) => acc.email.toLowerCase() === cleanEmail
        );

        if (!account) {
          return {
            ok: false,
            error: 'Bu e-posta adresine ait hesap bulunamadı. Önce kaydolabilirsiniz.',
          };
        }

        if (account.provider === 'google' && !account.passwordHash) {
          return {
            ok: false,
            error: 'Bu hesap Google ile oluşturulmuş. Lütfen Google ile devam edin.',
          };
        }

        if (account.passwordHash !== simpleHash(password)) {
          return { ok: false, error: 'E-posta veya şifre hatalı.' };
        }

        const { passwordHash: _, ...publicUser } = account;
        set({ user: publicUser });
        return { ok: true };
      },

      loginWithGoogle: (profile) => {
        const cleanEmail = (profile?.email || 'kullanici@gmail.com').trim().toLowerCase();
        const defaultName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
        const formattedDefaultName = defaultName
          .split(' ')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        const cleanName = (profile?.name || formattedDefaultName || 'Google Kullanıcısı').trim();

        if (!isValidEmail(cleanEmail)) {
          return { ok: false, error: 'Lütfen geçerli bir Google e-posta adresi girin.' };
        }

        const existing = get().accounts.find(
          (acc) => acc.email.toLowerCase() === cleanEmail
        );

        if (existing) {
          const updated: StoredAccount = {
            ...existing,
            name: cleanName || existing.name,
          };
          const { passwordHash: _, ...publicUser } = updated;
          set({
            accounts: get().accounts.map((a) => (a.id === existing.id ? updated : a)),
            user: publicUser,
          });
          return { ok: true };
        }

        const newAccount: StoredAccount = {
          id: `ggl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: cleanName,
          email: cleanEmail,
          provider: 'google',
          createdAt: new Date().toISOString(),
        };

        set({
          accounts: [...get().accounts, newAccount],
          user: newAccount,
        });
        return { ok: true };
      },

      loginWithApple: (profile) => {
        const cleanEmail = (profile?.email || 'kullanici@privaterelay.appleid.com').trim().toLowerCase();
        const cleanName = (profile?.name || 'Apple Kullanıcısı').trim();
        const appleId = profile?.id || `apl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        const existing = get().accounts.find(
          (acc) => (acc.provider === 'apple' && acc.id === appleId) || acc.email.toLowerCase() === cleanEmail
        );

        if (existing) {
          const updated: StoredAccount = {
            ...existing,
            name: cleanName || existing.name,
          };
          const { passwordHash: _, ...publicUser } = updated;
          set({
            accounts: get().accounts.map((a) => (a.id === existing.id ? updated : a)),
            user: publicUser,
          });
          return { ok: true };
        }

        const newAccount: StoredAccount = {
          id: appleId,
          name: cleanName,
          email: cleanEmail,
          provider: 'apple',
          createdAt: new Date().toISOString(),
        };

        set({
          accounts: [...get().accounts, newAccount],
          user: newAccount,
        });
        return { ok: true };
      },

      updateProfile: (name) => {
        const cleanName = name.trim();
        if (cleanName.length < 2) {
          return { ok: false, error: 'Ad soyad en az 2 karakter olmalıdır.' };
        }
        const current = get().user;
        if (!current) {
          return { ok: false, error: 'Oturum açık değil.' };
        }

        const updatedUser: AuthUser = { ...current, name: cleanName };
        set({
          user: updatedUser,
          accounts: get().accounts.map((acc) =>
            acc.id === current.id ? { ...acc, name: cleanName } : acc
          ),
        });
        return { ok: true };
      },

      resetPassword: (email, newPassword) => {
        const cleanEmail = email.trim().toLowerCase();
        if (!isValidEmail(cleanEmail)) {
          return { ok: false, error: 'Lütfen geçerli bir e-posta adresi girin.' };
        }
        if (newPassword.length < 6) {
          return { ok: false, error: 'Yeni şifre en az 6 karakter olmalıdır.' };
        }

        const existing = get().accounts.find(
          (acc) => acc.email.toLowerCase() === cleanEmail
        );
        if (!existing) {
          return { ok: false, error: 'Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.' };
        }

        const updated: StoredAccount = {
          ...existing,
          passwordHash: simpleHash(newPassword),
        };
        const { passwordHash: _, ...publicUser } = updated;

        set({
          accounts: get().accounts.map((acc) =>
            acc.id === existing.id ? updated : acc
          ),
          user: publicUser,
        });
        return { ok: true };
      },

      logout: () => {
        set({ user: null });
      },

      deleteAccount: () => {
        const current = get().user;
        if (!current) return;
        set({
          user: null,
          accounts: get().accounts.filter((acc) => acc.id !== current.id),
        });
      },

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(getStorage),
      partialize: (state) => ({
        user: state.user,
        accounts: state.accounts,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
