/**
 * marketService — FinansPulse veri servisi.
 *
 * Birincil kaynak : Yahoo Finance public chart endpoint + Truncgil (yerel altın fiyatları)
 * Öncelik Kuralı  : Gram / Çeyrek / Cumhuriyet altını için Truncgil'den gelen geçerli (>0)
 *                   piyasa verileri önceliklidir. Truncgil alınamazsa GoldCalculator (Ons × USDTRY) formülü çalışır.
 * Web Desteği     : Platform.OS === 'web' olduğunda istekler CORS proxy üzerinden iletilir.
 */
import {
  ASSETS,
  CLOUDFLARE_BATCH_URL,
  GOLD_SYMBOLS,
  REQUEST_TIMEOUT_MS,
  resolveApiUrl,
  TRUNCGIL_KEY_MAP,
  TRUNCGIL_URL,
  YAHOO_CHART_URL,
  YAHOO_SYMBOLS,
} from '@/api/config';
import type {
  AssetCategory,
  ChartPoint,
  GoldSymbol,
  HistoricalRange,
  MarketQuote,
  MarketSnapshot,
  MarketSymbol,
  QuoteCurrency,
  QuoteMap,
  TruncgilItem,
  TruncgilResponse,
  YahooChartResponse,
  YahooSymbol,
} from '@/types/market';
import { calculateGoldPrices, type GoldPrices } from '@/utils/goldCalculator';
import { deriveGoldHistory, parseHistory, type RawHistory } from '@/utils/history';

/* ------------------------------------------------------------------ */
/* HTTP yardımcıları                                                   */
/* ------------------------------------------------------------------ */

export class MarketServiceError extends Error {
  constructor(
    message: string,
    public readonly source: 'yahoo' | 'truncgil',
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'MarketServiceError';
  }
}

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (FinansPulse Mobile)',
};

async function fetchJson<T>(rawUrl: string, source: 'yahoo' | 'truncgil'): Promise<T> {
  const url = resolveApiUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: DEFAULT_HEADERS, signal: controller.signal });
    if (!res.ok) {
      throw new MarketServiceError(`${source} HTTP ${res.status}`, source, res.status);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof MarketServiceError) throw err;
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new MarketServiceError(aborted ? `${source} zaman aşımı` : `${source} ağ hatası`, source);
  } finally {
    clearTimeout(timer);
  }
}

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

function buildQuote(
  symbol: MarketSymbol,
  data: Pick<MarketQuote, 'price' | 'source'> & Partial<MarketQuote>,
): MarketQuote {
  const def = ASSETS[symbol];
  const previousClose = data.previousClose ?? null;
  const change = data.change ?? (isNum(previousClose) ? data.price - previousClose : null);
  const changePercent =
    data.changePercent ?? (isNum(previousClose) && previousClose !== 0 ? ((data.price - previousClose) / previousClose) * 100 : null);

  const cleanSymbol = symbol.replace('.IS', '');
  const name = def?.name ?? data.name ?? cleanSymbol;
  const shortName = def?.shortName ?? data.shortName ?? cleanSymbol;
  const category: AssetCategory = def?.category ?? (symbol.endsWith('.IS') ? 'stock' : 'commodity');
  const currency: QuoteCurrency = def?.currency ?? 'TRY';

  return {
    symbol,
    name,
    shortName,
    category,
    currency,
    price: data.price,
    previousClose,
    change,
    changePercent,
    dayHigh: data.dayHigh ?? null,
    dayLow: data.dayLow ?? null,
    bid: data.bid ?? null,
    ask: data.ask ?? null,
    sparkline: data.sparkline ?? [],
    source: data.source,
    marketTime: data.marketTime ?? Date.now(),
    isStale: false,
  };
}

/* ------------------------------------------------------------------ */
/* Yahoo Finance                                                       */
/* ------------------------------------------------------------------ */

/**
 * Tek sembol için Yahoo chart verisi.
 */
export async function fetchYahooQuote(symbol: YahooSymbol): Promise<MarketQuote> {
  const url = `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?interval=15m&range=1d&includePrePost=false`;
  const json = await fetchJson<YahooChartResponse>(url, 'yahoo');

  const result = json.chart?.result?.[0];
  if (!result || json.chart.error) {
    throw new MarketServiceError(`Yahoo ${symbol}: ${json.chart?.error?.description ?? 'boş yanıt'}`, 'yahoo');
  }

  const { meta } = result;
  if (!isNum(meta.regularMarketPrice)) {
    throw new MarketServiceError(`Yahoo ${symbol}: fiyat yok`, 'yahoo');
  }

  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const sparkline = closes.filter(isNum);

  return buildQuote(symbol, {
    name: meta.longName ?? meta.shortName,
    shortName: meta.shortName,
    price: meta.regularMarketPrice,
    previousClose: meta.previousClose ?? meta.chartPreviousClose ?? null,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    sparkline,
    marketTime: isNum(meta.regularMarketTime) ? meta.regularMarketTime * 1000 : Date.now(),
    source: 'yahoo',
  });
}

interface CloudflareBatchItem {
  meta?: {
    regularMarketPrice?: number;
    previousClose?: number;
    chartPreviousClose?: number;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketTime?: number;
    shortName?: string;
    longName?: string;
  };
  indicators?: {
    quote?: {
      close?: (number | null)[];
    }[];
  };
}

interface CloudflareBatchResponse {
  count?: number;
  results?: Record<string, CloudflareBatchItem>;
  failed?: string[];
}

const YAHOO_CHUNK_SIZE = 10;

/**
 * Yahoo sembollerini Cloudflare Worker Proxy üzerinden 10'arlı gruplar (chunks) halinde toplu (batch) çeker.
 * Base URL: https://piyasaradari-proxypiyasaradari-proxy.cevdetkarakulak.workers.dev/batch?symbols=
 */
export async function fetchYahooQuotes(
  symbols: YahooSymbol[] = YAHOO_SYMBOLS,
): Promise<{ quotes: QuoteMap; failed: YahooSymbol[] }> {
  const quotes: QuoteMap = {};
  const failed: YahooSymbol[] = [];

  for (let i = 0; i < symbols.length; i += YAHOO_CHUNK_SIZE) {
    const chunk = symbols.slice(i, i + YAHOO_CHUNK_SIZE);
    const symbolsParam = chunk.join(',');
    const batchUrl = `${CLOUDFLARE_BATCH_URL}${symbolsParam}&range=1d&interval=15m`;

    try {
      const batchRes = await fetchJson<CloudflareBatchResponse>(batchUrl, 'yahoo');
      const results = batchRes.results ?? {};

      for (const sym of chunk) {
        const item = results[sym];
        if (item?.meta && isNum(item.meta.regularMarketPrice)) {
          const closes = item.indicators?.quote?.[0]?.close ?? [];
          const sparkline = closes.filter(isNum);

          quotes[sym] = buildQuote(sym, {
            name: item.meta.longName ?? item.meta.shortName,
            shortName: item.meta.shortName,
            price: item.meta.regularMarketPrice,
            previousClose: item.meta.previousClose ?? item.meta.chartPreviousClose ?? null,
            dayHigh: item.meta.regularMarketDayHigh ?? null,
            dayLow: item.meta.regularMarketDayLow ?? null,
            sparkline,
            marketTime: isNum(item.meta.regularMarketTime) ? item.meta.regularMarketTime * 1000 : Date.now(),
            source: 'yahoo',
          });
        } else {
          // Batch içinde eksik kaldıysa tekil chart proxy endpoint'inden dene
          try {
            const single = await fetchYahooQuote(sym);
            quotes[sym] = single;
          } catch {
            failed.push(sym);
          }
        }
      }
    } catch (batchErr) {
      console.warn(`Cloudflare Batch isteği (${chunk.join(',')}) başarısız, tekil deneniyor:`, batchErr);
      const settled = await Promise.allSettled(chunk.map(fetchYahooQuote));
      settled.forEach((r, idx) => {
        const sym = chunk[idx];
        if (r.status === 'fulfilled') {
          quotes[sym] = r.value;
        } else {
          failed.push(sym);
        }
      });
    }

    // Gruplar arasında kısa bekleme
    if (i + YAHOO_CHUNK_SIZE < symbols.length) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  return { quotes, failed };
}

/* ------------------------------------------------------------------ */
/* Truncgil Servisi                                                    */
/* ------------------------------------------------------------------ */

export async function fetchTruncgil(): Promise<TruncgilResponse> {
  return fetchJson<TruncgilResponse>(TRUNCGIL_URL, 'truncgil');
}

const parseTruncgilDate = (s: string | undefined): number => {
  if (!s) return Date.now();
  const t = Date.parse(`${s.replace(' ', 'T')}+03:00`);
  return Number.isNaN(t) ? Date.now() : t;
};

/** Truncgil yanıtından ilgili sembolü `MarketQuote`'a çevirir. */
export function quoteFromTruncgil(data: TruncgilResponse, symbol: MarketSymbol): MarketQuote | null {
  const key = TRUNCGIL_KEY_MAP[symbol];
  if (!key) return null;
  const item = data[key] as TruncgilItem | undefined;
  if (!item || typeof item !== 'object') return null;

  // 0 veya negatif fiyatlar geçersizdir
  const price = [item.Selling, item.Buying].find((v) => isNum(v) && v > 0);
  if (price === undefined) return null;

  const changePercent = isNum(item.Change) ? item.Change : null;
  const previousClose = changePercent !== null ? price / (1 + changePercent / 100) : null;

  return buildQuote(symbol, {
    price,
    previousClose,
    changePercent,
    bid: isNum(item.Buying) ? item.Buying : null,
    ask: isNum(item.Selling) ? item.Selling : null,
    marketTime: parseTruncgilDate(data.Update_Date),
    source: 'truncgil',
  });
}

/* ------------------------------------------------------------------ */
/* Altın hesaplama (Fallback)                                          */
/* ------------------------------------------------------------------ */

const GOLD_KEY: Record<GoldSymbol, keyof GoldPrices> = {
  GRAM_ALTIN: 'gram',
  CEYREK_ALTIN: 'ceyrek',
  CUMHURIYET_ALTINI: 'cumhuriyet',
};

/** Ons ve USD/TRY quote'larından gram/çeyrek/cumhuriyet quote'ları üretir. */
export function buildGoldQuotes(ons?: MarketQuote, usdTry?: MarketQuote): QuoteMap {
  if (!ons || !usdTry) return {};

  const current = calculateGoldPrices(ons.price, usdTry.price);
  if (!current) return {};
  const previous = calculateGoldPrices(ons.previousClose, usdTry.previousClose);

  const quotes: QuoteMap = {};
  for (const symbol of GOLD_SYMBOLS) {
    const k = GOLD_KEY[symbol];
    quotes[symbol] = buildQuote(symbol, {
      price: current[k],
      previousClose: previous?.[k] ?? null,
      marketTime: Math.min(ons.marketTime, usdTry.marketTime),
      source: 'calculated',
    });
  }
  return quotes;
}

/* ------------------------------------------------------------------ */
/* Ana giriş noktası                                                   */
/* ------------------------------------------------------------------ */

/**
 * Tüm piyasa verisini çeker ve tek bir snapshot döner.
 *
 * Öncelik Sıralaması:
 *  1. Yahoo'dan hisse/döviz/bist/emtia ve Truncgil'den altın & döviz paralel çekilir.
 *  2. Gram, Çeyrek ve Cumhuriyet altını için Truncgil'deki geçerli veriler önceliklidir.
 *  3. Truncgil'de altın verisi yoksa veya başarısız olursa GoldCalculator (Ons × USD/TRY) devreye girer.
 *  4. Yahoo'da eksik kalan kurlar Truncgil'den tamamlanır.
 *  5. Hâlâ ulaşılamayan kalemler varsa önceki önbellek (isStale: true) kullanılır.
 */
export async function fetchMarketSnapshot(
  previous?: MarketSnapshot | null,
  additionalSymbols: YahooSymbol[] = [],
): Promise<MarketSnapshot> {
  const warnings: string[] = [];
  const targetSymbols = Array.from(new Set([...YAHOO_SYMBOLS, ...additionalSymbols]));

  // Yahoo ve Truncgil paralel sorgulanır
  const [yahooResult, truncgilResult] = await Promise.allSettled([
    fetchYahooQuotes(targetSymbols),
    fetchTruncgil(),
  ]);

  const quotes: QuoteMap = {};
  let truncgilData: TruncgilResponse | null = null;

  if (truncgilResult.status === 'fulfilled') {
    truncgilData = truncgilResult.value;
  } else {
    warnings.push(`Truncgil servisine erişilemedi: ${truncgilResult.reason?.message ?? 'Hata'}`);
  }

  const failedYahoo: YahooSymbol[] = [];
  if (yahooResult.status === 'fulfilled') {
    Object.assign(quotes, yahooResult.value.quotes);
    failedYahoo.push(...yahooResult.value.failed);
  } else {
    warnings.push(`Yahoo servisine erişilemedi: ${yahooResult.reason?.message ?? 'Hata'}`);
    failedYahoo.push(...targetSymbols);
  }

  // 1. Kural: Gram, Çeyrek ve Cumhuriyet için Truncgil'den geçerli (>0) verilere ÖNCELİK ver
  const missingGold: GoldSymbol[] = [];
  for (const goldSym of GOLD_SYMBOLS) {
    let handled = false;
    if (truncgilData) {
      const q = quoteFromTruncgil(truncgilData, goldSym);
      if (q && q.price > 0) {
        quotes[goldSym] = q;
        handled = true;
      }
    }
    if (!handled) {
      missingGold.push(goldSym);
    }
  }

  // 2. Kural: Truncgil'den gelmeyen altınlar için GoldCalculator'ı yedek (fallback) olarak çalıştır
  if (missingGold.length > 0) {
    const calculatedGold = buildGoldQuotes(quotes['GC=F'], quotes['USDTRY=X']);
    for (const goldSym of missingGold) {
      if (calculatedGold[goldSym]) {
        quotes[goldSym] = calculatedGold[goldSym];
      }
    }
  }

  // 3. Kural: Yahoo'da eksik kalan semboller için Truncgil'den yedekleme yap
  if (truncgilData && failedYahoo.length > 0) {
    for (const sym of failedYahoo) {
      if (!quotes[sym] && TRUNCGIL_KEY_MAP[sym]) {
        const q = quoteFromTruncgil(truncgilData, sym);
        if (q && q.price > 0) {
          quotes[sym] = q;
        }
      }
    }
  }

  // 4. Kural: Hiçbir kaynaktan alınamayanlar için eski önbellek değerini koru
  const allSymbolsToCheck = Array.from(
    new Set([...(Object.keys(ASSETS) as MarketSymbol[]), ...additionalSymbols]),
  );
  for (const symbol of allSymbolsToCheck) {
    if (quotes[symbol]) continue;
    const old = previous?.quotes[symbol];
    const assetName = ASSETS[symbol]?.shortName ?? symbol.replace('.IS', '');
    if (old) {
      quotes[symbol] = { ...old, isStale: true };
      warnings.push(`${assetName} güncellenemedi, önceki önbellek değeri gösteriliyor.`);
    } else {
      warnings.push(`${assetName} verisi alınamadı.`);
    }
  }

  const freshCount = Object.values(quotes).filter((q) => q && !q.isStale).length;
  if (freshCount === 0) {
    throw new Error('Piyasa verisi hiçbir kaynaktan alınamadı. İnternet bağlantınızı kontrol edin.');
  }

  return { quotes, fetchedAt: Date.now(), warnings };
}

/* ------------------------------------------------------------------ */
/* Detay Ekranı Geçmiş Grafik Verisi                                  */
/* ------------------------------------------------------------------ */

const RANGE_CONFIG: Record<HistoricalRange, { interval: string; range: string }> = {
  '1d': { interval: '5m', range: '1d' },
  '1w': { interval: '15m', range: '5d' },
  '1mo': { interval: '1d', range: '1mo' },
  '1y': { interval: '1wk', range: '1y' },
};

const historyCache = new Map<string, { at: number; points: ChartPoint[] }>();
const pendingHistory = new Map<string, Promise<ChartPoint[]>>();

async function fetchHistorySeries(symbol: string, range: HistoricalRange, interval: string): Promise<ChartPoint[]> {
  const cfg = RANGE_CONFIG[range];
  const query = `interval=${interval}&range=${cfg.range}&includePrePost=false`;
  // Batch query parameters decode '=' correctly even on older deployed Workers.
  // The old single-symbol Worker double-encoded GC%3DF / USDTRY%3DX.
  try {
    const batch = await fetchJson<{ results?: Record<string, RawHistory> }>(
      `${CLOUDFLARE_BATCH_URL}${encodeURIComponent(symbol)}&${query}`, 'yahoo',
    );
    const result = batch.results?.[symbol];
    if (result) {
      const points = parseHistory(result);
      if (points.length >= 2) return points;
    }
  } catch {
    // A transient batch failure can still succeed through the single route.
  }
  const json = await fetchJson<YahooChartResponse>(
    `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?${query}`, 'yahoo',
  );
  const result = json.chart?.result?.[0];
  if (json.chart?.error || !result) throw new MarketServiceError('Geçmiş fiyat kaynağına ulaşılamadı.', 'yahoo');
  const points = parseHistory(result);
  if (points.length < 2) throw new MarketServiceError('Kaynak bu dönem için yeterli geçmiş veri döndürmedi.', 'yahoo');
  return points;
}

/**
 * Varlık detay sayfası için seçilen periyotta geçmiş fiyat serisi getirir.
 */
export async function fetchHistoricalChart(
  symbol: MarketSymbol,
  range: HistoricalRange = '1d',
): Promise<ChartPoint[]> {
  const key = `${symbol}:${range}`;
  const cached = historyCache.get(key);
  if (cached && Date.now() - cached.at < 60_000) return cached.points;
  const pending = pendingHistory.get(key);
  if (pending) return pending;
  const request = (async () => {
    const interval = RANGE_CONFIG[range].interval;
    let points: ChartPoint[];
    if (GOLD_SYMBOLS.includes(symbol as GoldSymbol)) {
      const [ons, fx] = await Promise.all([
        fetchHistorySeries('GC=F', range, interval),
        fetchHistorySeries('USDTRY=X', range, range === '1y' ? '1d' : interval),
      ]);
      points = deriveGoldHistory(ons, fx, symbol as GoldSymbol);
    } else {
      points = await fetchHistorySeries(symbol, range, interval);
    }
    if (points.length < 2) throw new MarketServiceError('Bu dönem için eşleşen geçmiş veri yetersiz. Başka bir dönem seçebilir veya yeniden deneyebilirsiniz.', 'yahoo');
    historyCache.set(key, { at: Date.now(), points });
    return points;
  })();
  pendingHistory.set(key, request);
  try { return await request; } finally { pendingHistory.delete(key); }
}

export const marketService = {
  fetchMarketSnapshot,
  fetchYahooQuote,
  fetchYahooQuotes,
  fetchTruncgil,
  quoteFromTruncgil,
  buildGoldQuotes,
  fetchHistoricalChart,
};

