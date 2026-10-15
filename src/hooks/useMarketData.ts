import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { CACHE_TTL_MS } from '@/api/config';
import { useMarketStore } from '@/store/marketStore';
import type { MarketQuote, MarketSymbol, QuoteMap } from '@/types/market';

const EMPTY_QUOTES: QuoteMap = {};

interface UseMarketDataOptions {
  /** Uygulama ön plandayken TTL dolunca otomatik yenile (varsayılan: true). */
  autoRefresh?: boolean;
}

/**
 * Ekranların kullanacağı tek giriş noktası.
 * `refresh()` her zaman Smart Cache'e saygı duyar: 60 sn dolmadan ağ isteği atmaz.
 */
export function useMarketData({ autoRefresh = true }: UseMarketDataOptions = {}) {
  const { snapshot, status, error, lastFetchedAt, hasHydrated, fetchMarketData } = useMarketStore(
    useShallow((s) => ({
      snapshot: s.snapshot,
      status: s.status,
      error: s.error,
      lastFetchedAt: s.lastFetchedAt,
      hasHydrated: s.hasHydrated,
      fetchMarketData: s.fetchMarketData,
    })),
  );

  const refresh = useCallback(() => fetchMarketData(), [fetchMarketData]);

  // İlk mount: önbellek tazeyse istek atılmaz.
  useEffect(() => {
    void fetchMarketData();
  }, [fetchMarketData]);

  // Ön planda periyodik yenileme + arka plandan dönünce kontrol.
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!autoRefresh) return;

    const start = () => {
      if (timerRef.current) return;
      timerRef.current = setInterval(() => void fetchMarketData(), CACHE_TTL_MS);
    };
    const stop = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };

    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void fetchMarketData();
        start();
      } else {
        stop();
      }
    };

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', onChange);
    return () => {
      sub.remove();
      stop();
    };
  }, [autoRefresh, fetchMarketData]);

  const quotes = snapshot?.quotes ?? EMPTY_QUOTES;
  const getQuote = useCallback((symbol: MarketSymbol): MarketQuote | undefined => quotes[symbol], [quotes]);
  const addCustomQuote = useMarketStore((s) => s.addCustomQuote);

  return {
    quotes,
    getQuote,
    addCustomQuote,
    warnings: snapshot?.warnings ?? [],
    lastUpdated: lastFetchedAt ? new Date(lastFetchedAt) : null,
    isLoading: !hasHydrated || (status === 'loading' && !snapshot),
    isRefreshing: status === 'refreshing',
    error,
    refresh,
  };
}
