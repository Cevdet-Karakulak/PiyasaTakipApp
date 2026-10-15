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

interface FavoritesState {
  favorites: MarketSymbol[];
  toggleFavorite: (symbol: MarketSymbol) => void;
  isFavorite: (symbol: MarketSymbol) => boolean;
}

const DEFAULT_FAVORITES: MarketSymbol[] = ['USDTRY=X', 'GRAM_ALTIN', 'XU100.IS', 'THYAO.IS'];

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: DEFAULT_FAVORITES,
      toggleFavorite: (symbol: MarketSymbol) => {
        const current = get().favorites;
        if (current.includes(symbol)) {
          set({ favorites: current.filter((s) => s !== symbol) });
        } else {
          set({ favorites: [...current, symbol] });
        }
      },
      isFavorite: (symbol: MarketSymbol) => get().favorites.includes(symbol),
    }),
    {
      name: FAVORITES_STORAGE_KEY,
      storage: createJSONStorage(getStorage),
    },
  ),
);
