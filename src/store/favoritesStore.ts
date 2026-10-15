import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { FAVORITES_STORAGE_KEY } from '@/api/config';
import type { MarketSymbol } from '@/types/market';

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const getStorage = (): StateStorage =>
  Platform.OS === 'web' && typeof window === 'undefined' ? noopStorage : AsyncStorage;

interface PersistedFavoritesState {
  favorites: MarketSymbol[];
  isInitialized: boolean;
}

export interface FavoritesState {
  favorites: MarketSymbol[];
  isInitialized: boolean;
  hasHydrated: boolean;
  addFavorite: (symbol: MarketSymbol) => void;
  removeFavorite: (symbol: MarketSymbol) => void;
  toggleFavorite: (symbol: MarketSymbol) => void;
  isFavorite: (symbol: MarketSymbol) => boolean;
}

const DEFAULT_FAVORITES: MarketSymbol[] = ['USDTRY=X', 'GRAM_ALTIN', 'XU100.IS', 'THYAO.IS'];

// Favoriden çıkarılan özel sembolleri diğer store'lara (marketStore) bildirmek için dinleyiciler
type FavoriteRemoveListener = (symbol: MarketSymbol) => void;
const removeListeners: FavoriteRemoveListener[] = [];

export const onFavoriteRemoved = (listener: FavoriteRemoveListener) => {
  removeListeners.push(listener);
  return () => {
    const idx = removeListeners.indexOf(listener);
    if (idx !== -1) removeListeners.splice(idx, 1);
  };
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: DEFAULT_FAVORITES,
      isInitialized: false,
      hasHydrated: false,

      addFavorite: (symbol: MarketSymbol) => {
        const current = get().favorites;
        if (!current.includes(symbol)) {
          set({ favorites: [...current, symbol], isInitialized: true });
        }
      },

      removeFavorite: (symbol: MarketSymbol) => {
        const current = get().favorites;
        const next = current.filter((s) => s !== symbol);
        set({ favorites: next, isInitialized: true });

        // Dinleyicilere bildir (marketStore'daki özel hisse silinsin)
        for (const listener of removeListeners) {
          try {
            listener(symbol);
          } catch (e) {
            console.error('onFavoriteRemoved error:', e);
          }
        }
      },

      toggleFavorite: (symbol: MarketSymbol) => {
        const current = get().favorites;
        if (current.includes(symbol)) {
          get().removeFavorite(symbol);
        } else {
          get().addFavorite(symbol);
        }
      },

      isFavorite: (symbol: MarketSymbol) => get().favorites.includes(symbol),
    }),
    {
      name: FAVORITES_STORAGE_KEY,
      storage: createJSONStorage(getStorage),
      partialize: (s): PersistedFavoritesState => ({
        favorites: s.favorites,
        isInitialized: s.isInitialized,
      }),
      merge: (persistedState, currentState) => {
        const pState = persistedState as PersistedFavoritesState | undefined;
        // Kullanıcı daha önce favori listesinde değişiklik yapmışsa (öğe çıkarmışsa),
        // liste boş dizi [] olsa bile o listeyi koru. Asla varsayılan liste ile birleştirip
        // silinen öğeleri geri getirme!
        if (pState && pState.isInitialized) {
          return {
            ...currentState,
            favorites: Array.isArray(pState.favorites) ? pState.favorites : [],
            isInitialized: true,
          };
        }
        // Yalnızca uygulamanın sıfır/ilk kurulumunda varsayılan favorileri ata
        return {
          ...currentState,
          favorites: DEFAULT_FAVORITES,
          isInitialized: true,
        };
      },
      onRehydrateStorage: () => () => {
        useFavoritesStore.setState({ hasHydrated: true });
      },
    },
  ),
);
