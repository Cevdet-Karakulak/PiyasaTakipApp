/**
 * FinansPulse — Piyasa veri katmanı tip tanımları.
 */

export type AssetCategory = 'currency' | 'gold' | 'commodity' | 'energy' | 'index' | 'stock';

/** Verinin nereden geldiği (UI'da rozet / güvenilirlik göstergesi için). */
export type DataSource = 'yahoo' | 'truncgil' | 'calculated' | 'cache';

export type QuoteCurrency = 'TRY' | 'USD';

/** Uygulama içinde kullanılan sabit tanımlı semboller. */
export type KnownYahooSymbol =
  | 'USDTRY=X'
  | 'EURTRY=X'
  | 'GC=F'
  | 'BZ=F'
  | 'XU100.IS'
  | 'THYAO.IS'
  | 'ASELS.IS'
  | 'TUPRS.IS'
  | 'GARAN.IS'
  | 'ISCTR.IS'
  | 'AKBNK.IS'
  | 'YKBNK.IS'
  | 'EREGL.IS'
  | 'SISE.IS'
  | 'BIMAS.IS'
  | 'KCHOL.IS'
  | 'SAHOL.IS'
  | 'FROTO.IS'
  | 'TOASO.IS'
  | 'ENKAI.IS'
  | 'KRDMD.IS'
  | 'PETKM.IS'
  | 'EKGYO.IS';

/** Dinamik BIST 500 hisselerini de (SASA.IS, HEKTS.IS vb.) kabul eden açık sembol tipi */
export type YahooSymbol = KnownYahooSymbol | (string & {});

export type GoldSymbol = 'GRAM_ALTIN' | 'AYAR22_ALTIN' | 'CEYREK_ALTIN' | 'YARIM_ALTIN' | 'TAM_ALTIN' | 'CUMHURIYET_ALTINI';

export type MarketSymbol = YahooSymbol | GoldSymbol;

export interface AssetDefinition {
  symbol: MarketSymbol;
  name: string;
  shortName: string;
  category: AssetCategory;
  currency: QuoteCurrency;
  /** Fiyat gösterimindeki ondalık hane sayısı. */
  decimals: number;
}

export interface MarketQuote {
  symbol: MarketSymbol;
  name: string;
  shortName: string;
  category: AssetCategory;
  currency: QuoteCurrency;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  /** Alış / satış (yalnızca truncgil kaynaklı verilerde). */
  bid: number | null;
  ask: number | null;
  /** Gün içi kapanış serisi (mini grafik için). */
  sparkline: number[];
  source: DataSource;
  /** Kaynağın bildirdiği piyasa zamanı (ms). */
  marketTime: number;
  /** Son istekte güncellenemedi, önceki önbellek değeri gösteriliyor. */
  isStale: boolean;
}

export type QuoteMap = Partial<Record<MarketSymbol, MarketQuote>>;

export interface MarketSnapshot {
  quotes: QuoteMap;
  /** Snapshot'ın API'den çekildiği zaman (ms). */
  fetchedAt: number;
  /** Kısmi hatalar (ör. tek bir sembol çekilemediyse). */
  warnings: string[];
}

export type HistoricalRange = '1d' | '1w' | '1mo' | '1y';

export interface ChartPoint {
  timestamp: number;
  value: number;
}


/* ------------------------------------------------------------------ */
/* Ham API yanıt tipleri                                               */
/* ------------------------------------------------------------------ */

export interface YahooChartMeta {
  currency?: string;
  symbol: string;
  regularMarketPrice?: number;
  regularMarketTime?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  shortName?: string;
  longName?: string;
}

export interface YahooChartResponse {
  chart: {
    result:
      | {
          meta: YahooChartMeta;
          timestamp?: number[];
          indicators?: { quote?: { close?: (number | null)[] }[] };
        }[]
      | null;
    error: { code: string; description: string } | null;
  };
}

export interface TruncgilItem {
  Buying: number;
  Selling: number;
  /** Yüzde değişim. */
  Change: number;
  Type: string;
  Name?: string;
}

export type TruncgilResponse = { Update_Date: string } & Record<string, TruncgilItem | string>;

