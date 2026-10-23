/**
 * marketStore — Zustand + AsyncStorage "Smart Cache".
 *
 * Kurallar:
 *  - Son başarılı çekimden itibaren CACHE_TTL_MS (60 sn) dolmadıysa API'ye
 *    ASLA istek atılmaz; veri bellekteki/AsyncStorage'daki önbellekten gelir.
 *  - Önbellek AsyncStorage'a kalıcı yazılır → uygulama kapatılıp 60 sn içinde
 *    tekrar açılsa bile istek atılmaz (hidrasyon tamamlanmadan karar verilmez).
 *  - Aynı anda gelen birden çok istek tek bir ağ çağrısında birleştirilir
 *    (in-flight dedup) → sayfa yenileme / çoklu ekran mount'u kotayı yakmaz.
 *  - Hata olursa eski veri korunur (stale-while-error).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { CACHE_TTL_MS, MARKET_CACHE_KEY, isDefaultSymbol } from '@/api/config';
import { fetchMarketSnapshot } from '@/api/marketService';
import { onFavoriteRemoved, useFavoritesStore } from '@/store/favoritesStore';
import type { MarketQuote, MarketSnapshot, MarketSymbol, YahooSymbol } from '@/types/market';

export type FetchStatus = 'idle' | 'loading' | 'refreshing' | 'success' | 'error';

export interface FetchOptions {
  /**
   * TTL'yi yok sayar. YALNIZCA geliştirme/hata ayıklama içindir.
   * Pull-to-refresh gibi kullanıcı etkileşimlerinde KULLANMAYIN — kota korumasını devre dışı bırakır.
   */
  bypassCache?: boolean;
}

export interface FetchResult {
  /** `true` ise veri önbellekten geldi, ağ isteği yapılmadı. */
  fromCache: boolean;
  snapshot: MarketSnapshot | null;
  /** Bir sonraki ağ isteğine izin verilene kadar kalan süre (ms). */
  nextAllowedInMs: number;
}

interface PersistedState {
  snapshot: MarketSnapshot | null;
  lastFetchedAt: number;
}

export interface MarketState extends PersistedState {
  status: FetchStatus;
  error: string | null;
  hasHydrated: boolean;

  fetchMarketData: (options?: FetchOptions) => Promise<FetchResult>;
  addCustomQuote: (quote: MarketQuote) => void;
  removeCustomQuote: (symbol: MarketSymbol) => void;
  isCacheFresh: () => boolean;
  getCacheAgeMs: () => number;
  clearCache: () => Promise<void>;
}

/* ------------------------------------------------------------------ */

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

/** Web statik render (SSR) sırasında `window` yoktur → no-op storage kullan. */
const getStorage = (): StateStorage =>
  Platform.OS === 'web' && typeof window === 'undefined' ? noopStorage : AsyncStorage;

const HYDRATION_TIMEOUT_MS = 2_000;

/** Başarısız bir istekten sonra yeni denemeye izin verilene kadar bekleme. */
const ERROR_COOLDOWN_MS = 15_000;

/** Modül seviyesinde paylaşılan aktif istek (in-flight dedup). */
let inFlight: Promise<FetchResult> | null = null;
let lastErrorAt = 0;

const remainingTtl = (lastFetchedAt: number) => Math.max(0, CACHE_TTL_MS - (Date.now() - lastFetchedAt));

/* ------------------------------------------------------------------ */

export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      snapshot: null,
      lastFetchedAt: 0,
      status: 'idle',
      error: null,
      hasHydrated: false,

      isCacheFresh: () => {
        const { snapshot, lastFetchedAt } = get();
        return snapshot !== null && remainingTtl(lastFetchedAt) > 0;
      },

      getCacheAgeMs: () => {
        const { lastFetchedAt } = get();
        return lastFetchedAt ? Date.now() - lastFetchedAt : Infinity;
      },

      fetchMarketData: async (options = {}) => {
        // 1) AsyncStorage hidrasyonu bitmeden karar verme; aksi halde soğuk açılışta gereksiz istek atılır.
        await waitForHydration();

        // 2) Smart Cache: TTL dolmadıysa ağ yok.
        if (!options.bypassCache && get().isCacheFresh()) {
          const { snapshot, lastFetchedAt } = get();
          return { fromCache: true, snapshot, nextAllowedInMs: remainingTtl(lastFetchedAt) };
        }

        // 2b) Son istek hata verdiyse kısa bir süre tekrar deneme (rate-limit cezasını büyütmemek için).
        const cooldownLeft = ERROR_COOLDOWN_MS - (Date.now() - lastErrorAt);
        if (!options.bypassCache && cooldownLeft > 0) {
          return { fromCache: true, snapshot: get().snapshot, nextAllowedInMs: cooldownLeft };
        }

        // 3) Zaten bir istek sürüyorsa ona katıl.
        if (inFlight) return inFlight;

        inFlight = (async (): Promise<FetchResult> => {
          const previous = get().snapshot;
          set({ status: previous ? 'refreshing' : 'loading', error: null });

          try {
            // Yalnızca kullanıcının favorilerinde kayıtlı olan ek BIST hisselerini belirle
            const favorites = useFavoritesStore.getState().favorites;
            const favCustomSymbols = favorites.filter(
              (sym): sym is YahooSymbol =>
                typeof sym === 'string' && sym.endsWith('.IS') && !isDefaultSymbol(sym),
            );

            // Artık favoride olmayan özel hisseleri önceki snapshot'tan da temizle
            let cleanPrevious = previous;
            if (previous) {
              const prunedQuotes = { ...previous.quotes };
              let modified = false;
              for (const sym of Object.keys(prunedQuotes)) {
                if (!isDefaultSymbol(sym as MarketSymbol) && !favorites.includes(sym as MarketSymbol)) {
                  delete prunedQuotes[sym];
                  modified = true;
                }
              }
              if (modified) {
                cleanPrevious = { ...previous, quotes: prunedQuotes };
                set({ snapshot: cleanPrevious });
              }
            }

            const snapshot = await fetchMarketSnapshot(cleanPrevious, favCustomSymbols);
            lastErrorAt = 0;
            set({ snapshot, lastFetchedAt: snapshot.fetchedAt, status: 'success', error: null });
            return { fromCache: false, snapshot, nextAllowedInMs: CACHE_TTL_MS };
          } catch (err) {
            // Eski veri korunur (stale-while-error); cooldown başlatılır.
            lastErrorAt = Date.now();
            set({ status: 'error', error: (err as Error).message });
            return { fromCache: previous !== null, snapshot: previous, nextAllowedInMs: ERROR_COOLDOWN_MS };
          } finally {
            inFlight = null;
          }
        })();

        return inFlight;
      },

      addCustomQuote: (quote: MarketQuote) => {
        const current = get().snapshot;
        if (!current) {
          set({
            snapshot: {
              quotes: { [quote.symbol]: quote },
              fetchedAt: Date.now(),
              warnings: [],
            },
          });
          return;
        }
        set({
          snapshot: {
            ...current,
            quotes: {
              ...current.quotes,
              [quote.symbol]: quote,
            },
          },
        });
      },

      removeCustomQuote: (symbol: MarketSymbol) => {
        const current = get().snapshot;
        if (!current || !current.quotes[symbol]) return;
        const newQuotes = { ...current.quotes };
        delete newQuotes[symbol];
        set({
          snapshot: {
            ...current,
            quotes: newQuotes,
          },
        });
      },

      clearCache: async () => {
        set({ snapshot: null, lastFetchedAt: 0, status: 'idle', error: null });
        await useMarketStore.persist.clearStorage();
      },
    }),
    {
      name: MARKET_CACHE_KEY,
      version: 3, // Altın günlük trend ve aralık verisi eklendi; boş grafikli eski snapshot'ı yenile.
      storage: createJSONStorage(getStorage),
      // Sadece veri ve zaman damgası kalıcı; status/error gibi geçici alanlar değil.
      partialize: (s): PersistedState => ({ snapshot: s.snapshot, lastFetchedAt: s.lastFetchedAt }),
      merge: (persistedState, currentState) => {
        const pState = persistedState as PersistedState | undefined;
        if (!pState || !pState.snapshot) {
          return { ...currentState, snapshot: null, lastFetchedAt: 0 };
        }
        // Önbellekten yüklenirken, favorilerde olmayan özel hisseleri ayıkla
        const favorites = useFavoritesStore.getState().favorites;
        const cleanQuotes = { ...pState.snapshot.quotes };
        for (const sym of Object.keys(cleanQuotes)) {
          if (!isDefaultSymbol(sym as MarketSymbol) && !favorites.includes(sym as MarketSymbol)) {
            delete cleanQuotes[sym];
          }
        }
        return {
          ...currentState,
          snapshot: { ...pState.snapshot, quotes: cleanQuotes },
          lastFetchedAt: pState.lastFetchedAt,
        };
      },
      // Şema değişirse eski önbelleği at (yeniden çekilir).
      migrate: () => ({ snapshot: null, lastFetchedAt: 0 }) as unknown as MarketState,
      onRehydrateStorage: () => () => {
        useMarketStore.setState({ hasHydrated: true });
      },
    },
  ),
);

// Favoriden çıkarılan özel hisseleri marketStore'dan anında sil
onFavoriteRemoved((symbol) => {
  if (!isDefaultSymbol(symbol)) {
    useMarketStore.getState().removeCustomQuote(symbol);
  }
});

/** Persist hidrasyonunu bekler; depolama hatasında takılmamak için zaman aşımı vardır. */
function waitForHydration(): Promise<void> {
  if (useMarketStore.persist.hasHydrated()) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsub();
      useMarketStore.setState({ hasHydrated: true });
      resolve();
    }, HYDRATION_TIMEOUT_MS);

    const unsub = useMarketStore.persist.onFinishHydration(() => {
      clearTimeout(timer);
      unsub();
      resolve();
    });
  });
}

/* ------------------------------------------------------------------ */
/* Seçiciler                                                           */
/* ------------------------------------------------------------------ */

export const selectQuotes = (s: MarketState) => s.snapshot?.quotes;
export const selectLastFetchedAt = (s: MarketState) => s.lastFetchedAt;
export const selectStatus = (s: MarketState) => s.status;
export const selectError = (s: MarketState) => s.error;
export const selectWarnings = (s: MarketState) => s.snapshot?.warnings;

