import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { PORTFOLIO_STORAGE_KEY } from '@/api/config';
import type { MarketSymbol } from '@/types/market';

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const getStorage = (): StateStorage =>
  Platform.OS === 'web' && typeof window === 'undefined' ? noopStorage : AsyncStorage;

export interface PortfolioPosition {
  id: string;
  symbol: MarketSymbol;
  amount: number;
}

interface PersistedPortfolioState {
  positions: PortfolioPosition[];
  isInitialized: boolean;
}

export interface PortfolioState {
  positions: PortfolioPosition[];
  isInitialized: boolean;
  hasHydrated: boolean;
  addPosition: (symbol: MarketSymbol, amount: number) => void;
  removePosition: (id: string) => void;
  updatePosition: (id: string, amount: number) => void;
  clearPortfolio: () => void;
}

const DEFAULT_PORTFOLIO: PortfolioPosition[] = [
  { id: '1', symbol: 'GRAM_ALTIN', amount: 25 },
  { id: '2', symbol: 'USDTRY=X', amount: 1500 },
  { id: '3', symbol: 'THYAO.IS', amount: 80 },
  { id: '4', symbol: 'GARAN.IS', amount: 120 },
];

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      positions: DEFAULT_PORTFOLIO,
      isInitialized: false,
      hasHydrated: false,

      addPosition: (symbol: MarketSymbol, amount: number) => {
        const current = get().positions;
        const newPos: PortfolioPosition = {
          id: Date.now().toString(),
          symbol,
          amount,
        };
        set({ positions: [...current, newPos], isInitialized: true });
      },

      removePosition: (id: string) => {
        const current = get().positions;
        set({
          positions: current.filter((p) => p.id !== id),
          isInitialized: true,
        });
      },

      updatePosition: (id: string, amount: number) => {
        const current = get().positions;
        set({
          positions: current.map((p) => (p.id === id ? { ...p, amount } : p)),
          isInitialized: true,
        });
      },

      clearPortfolio: () => {
        set({ positions: [], isInitialized: true });
      },
    }),
    {
      name: PORTFOLIO_STORAGE_KEY,
      storage: createJSONStorage(getStorage),
      partialize: (s): PersistedPortfolioState => ({
        positions: s.positions,
        isInitialized: s.isInitialized,
      }),
      merge: (persistedState, currentState) => {
        const pState = persistedState as PersistedPortfolioState | undefined;
        // Kullanıcı daha önce işlem yapmışsa (silmiş, eklemişse) asla varsayılanlarla birleştirme,
        // kullanıcının kaydettiği güncel listeyi (boş dizi [] olsa bile) aynen kullan.
        if (pState && pState.isInitialized) {
          return {
            ...currentState,
            positions: Array.isArray(pState.positions) ? pState.positions : [],
            isInitialized: true,
          };
        }
        // Yalnızca uygulamanın sıfır/ilk açılışında başlangıç portföyünü ver
        return {
          ...currentState,
          positions: DEFAULT_PORTFOLIO,
          isInitialized: true,
        };
      },
      onRehydrateStorage: () => () => {
        usePortfolioStore.setState({ hasHydrated: true });
      },
    },
  ),
);
