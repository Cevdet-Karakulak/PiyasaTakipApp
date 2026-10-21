import { Platform } from 'react-native';
import type { AssetDefinition, GoldSymbol, MarketSymbol, YahooSymbol } from '@/types/market';

/** Cloudflare Edge Cache & Rate-Limit Korumalı Proxy Sunucu Adresleri */
export const CLOUDFLARE_PROXY_BASE = 'https://piyasaradari-proxypiyasaradari-proxy.cevdetkarakulak.workers.dev';
export const CLOUDFLARE_BATCH_URL = 'https://piyasaradari-proxypiyasaradari-proxy.cevdetkarakulak.workers.dev/batch?symbols=';
export const CLOUDFLARE_CHART_URL = 'https://piyasaradari-proxypiyasaradari-proxy.cevdetkarakulak.workers.dev/chart';

export const YAHOO_CHART_URL = CLOUDFLARE_CHART_URL;
export const YAHOO_BATCH_URL = CLOUDFLARE_BATCH_URL;
export const TRUNCGIL_URL = 'https://finans.truncgil.com/v4/today.json';

/** Web platformunda CORS engeline takılmamak için kullanılan proxy adresi */
export const CORS_PROXY_PREFIX = 'https://corsproxy.io/?';

/**
 * Platform web ise ve doğrudan CORS desteği olmayan harici URL ise CORS proxy üzerinden yönlendirir.
 * Cloudflare Worker sunucumuz zaten Access-Control-Allow-Origin: * döndüğü için web'de ek proxy gerektirmez.
 */
export function resolveApiUrl(rawUrl: string): string {
  if (Platform.OS === 'web' && !rawUrl.includes('workers.dev')) {
    return `${CORS_PROXY_PREFIX}${encodeURIComponent(rawUrl)}`;
  }
  return rawUrl;
}

/** Smart Cache süresi: bu süre dolmadan API'ye tekrar istek atılmaz. */
export const CACHE_TTL_MS = 60_000;

/** Tek bir HTTP isteği için zaman aşımı. */
export const REQUEST_TIMEOUT_MS = 10_000;

/** AsyncStorage anahtarı (şema değişirse versiyonu artırın). */
export const MARKET_CACHE_KEY = 'finanspulse:market-cache';

/** Favori varlıklar için depolama anahtarı */
export const FAVORITES_STORAGE_KEY = 'finanspulse:favorites';

/** Portföy pozisyonları için depolama anahtarı */
export const PORTFOLIO_STORAGE_KEY = 'finanspulse:portfolio';

export const YAHOO_SYMBOLS: YahooSymbol[] = [
  'USDTRY=X',
  'EURTRY=X',
  'GC=F',
  'BZ=F',
  'XU100.IS',
  'THYAO.IS',
  'ASELS.IS',
  'TUPRS.IS',
  'GARAN.IS',
  'ISCTR.IS',
  'AKBNK.IS',
  'YKBNK.IS',
  'EREGL.IS',
  'SISE.IS',
  'BIMAS.IS',
  'KCHOL.IS',
  'SAHOL.IS',
  'FROTO.IS',
  'TOASO.IS',
  'ENKAI.IS',
  'KRDMD.IS',
  'PETKM.IS',
  'EKGYO.IS',
];

export const GOLD_SYMBOLS: GoldSymbol[] = ['GRAM_ALTIN', 'CEYREK_ALTIN', 'YARIM_ALTIN', 'TAM_ALTIN', 'CUMHURIYET_ALTINI'];

export const ASSET_DISPLAY_ORDER: MarketSymbol[] = [
  'USDTRY=X',
  'EURTRY=X',
  'GRAM_ALTIN',
  'CEYREK_ALTIN',
  'YARIM_ALTIN',
  'TAM_ALTIN',
  'CUMHURIYET_ALTINI',
  'GC=F',
  'BZ=F',
  'XU100.IS',
  'THYAO.IS',
  'ASELS.IS',
  'TUPRS.IS',
  'GARAN.IS',
  'ISCTR.IS',
  'AKBNK.IS',
  'YKBNK.IS',
  'EREGL.IS',
  'SISE.IS',
  'BIMAS.IS',
  'KCHOL.IS',
  'SAHOL.IS',
  'FROTO.IS',
  'TOASO.IS',
  'ENKAI.IS',
  'KRDMD.IS',
  'PETKM.IS',
  'EKGYO.IS',
];

/** Sabit/Varsayılan tanımlı tüm varlık sembolleri */
export const DEFAULT_SYMBOLS: MarketSymbol[] = ASSET_DISPLAY_ORDER;

/** Bir sembolün varsayılan sabit listede olup olmadığını kontrol eder */
export function isDefaultSymbol(symbol: MarketSymbol): boolean {
  return (DEFAULT_SYMBOLS as string[]).includes(symbol);
}

export const ASSETS: Record<MarketSymbol, AssetDefinition> = {
  'USDTRY=X': { symbol: 'USDTRY=X', name: 'Dolar / TL', shortName: 'USD/TRY', category: 'currency', currency: 'TRY', decimals: 4 },
  'EURTRY=X': { symbol: 'EURTRY=X', name: 'Euro / TL', shortName: 'EUR/TRY', category: 'currency', currency: 'TRY', decimals: 4 },
  GRAM_ALTIN: { symbol: 'GRAM_ALTIN', name: 'Gram Altın', shortName: 'GRAM ALTIN', category: 'gold', currency: 'TRY', decimals: 2 },
  CEYREK_ALTIN: { symbol: 'CEYREK_ALTIN', name: 'Çeyrek Altın', shortName: 'ÇEYREK', category: 'gold', currency: 'TRY', decimals: 2 },
  YARIM_ALTIN: { symbol: 'YARIM_ALTIN', name: 'Yarım Altın (Ziynet)', shortName: 'YARIM', category: 'gold', currency: 'TRY', decimals: 2 },
  TAM_ALTIN: { symbol: 'TAM_ALTIN', name: 'Tam Altın (Ziynet)', shortName: 'TAM', category: 'gold', currency: 'TRY', decimals: 2 },
  CUMHURIYET_ALTINI: {
    symbol: 'CUMHURIYET_ALTINI',
    name: 'Cumhuriyet Altını (Ata)',
    shortName: 'CUMHURİYET',
    category: 'gold',
    currency: 'TRY',
    decimals: 2,
  },
  'GC=F': { symbol: 'GC=F', name: 'Ons Altın', shortName: 'ONS ALTIN', category: 'gold', currency: 'USD', decimals: 2 },
  'BZ=F': { symbol: 'BZ=F', name: 'Brent Petrol', shortName: 'BRENT', category: 'energy', currency: 'USD', decimals: 2 },
  'XU100.IS': { symbol: 'XU100.IS', name: 'BIST 100', shortName: 'XU100', category: 'index', currency: 'TRY', decimals: 2 },
  'THYAO.IS': { symbol: 'THYAO.IS', name: 'Türk Hava Yolları', shortName: 'THYAO', category: 'stock', currency: 'TRY', decimals: 2 },
  'ASELS.IS': { symbol: 'ASELS.IS', name: 'Aselsan', shortName: 'ASELS', category: 'stock', currency: 'TRY', decimals: 2 },
  'TUPRS.IS': { symbol: 'TUPRS.IS', name: 'Tüpraş', shortName: 'TUPRS', category: 'stock', currency: 'TRY', decimals: 2 },
  'GARAN.IS': { symbol: 'GARAN.IS', name: 'Garanti BBVA', shortName: 'GARAN', category: 'stock', currency: 'TRY', decimals: 2 },
  'ISCTR.IS': { symbol: 'ISCTR.IS', name: 'İş Bankası (C)', shortName: 'ISCTR', category: 'stock', currency: 'TRY', decimals: 2 },
  'AKBNK.IS': { symbol: 'AKBNK.IS', name: 'Akbank', shortName: 'AKBNK', category: 'stock', currency: 'TRY', decimals: 2 },
  'YKBNK.IS': { symbol: 'YKBNK.IS', name: 'Yapı Kredi Bankası', shortName: 'YKBNK', category: 'stock', currency: 'TRY', decimals: 2 },
  'EREGL.IS': { symbol: 'EREGL.IS', name: 'Ereğli Demir Çelik', shortName: 'EREGL', category: 'stock', currency: 'TRY', decimals: 2 },
  'SISE.IS': { symbol: 'SISE.IS', name: 'Şişecam', shortName: 'SISE', category: 'stock', currency: 'TRY', decimals: 2 },
  'BIMAS.IS': { symbol: 'BIMAS.IS', name: 'BİM Birleşik Mağazalar', shortName: 'BIMAS', category: 'stock', currency: 'TRY', decimals: 2 },
  'KCHOL.IS': { symbol: 'KCHOL.IS', name: 'Koç Holding', shortName: 'KCHOL', category: 'stock', currency: 'TRY', decimals: 2 },
  'SAHOL.IS': { symbol: 'SAHOL.IS', name: 'Sabancı Holding', shortName: 'SAHOL', category: 'stock', currency: 'TRY', decimals: 2 },
  'FROTO.IS': { symbol: 'FROTO.IS', name: 'Ford Otosan', shortName: 'FROTO', category: 'stock', currency: 'TRY', decimals: 2 },
  'TOASO.IS': { symbol: 'TOASO.IS', name: 'Tofaş Otomobil Fabrikası', shortName: 'TOASO', category: 'stock', currency: 'TRY', decimals: 2 },
  'ENKAI.IS': { symbol: 'ENKAI.IS', name: 'Enka İnşaat', shortName: 'ENKAI', category: 'stock', currency: 'TRY', decimals: 2 },
  'KRDMD.IS': { symbol: 'KRDMD.IS', name: 'Kardemir (D)', shortName: 'KRDMD', category: 'stock', currency: 'TRY', decimals: 2 },
  'PETKM.IS': { symbol: 'PETKM.IS', name: 'Petkim', shortName: 'PETKM', category: 'stock', currency: 'TRY', decimals: 2 },
  'EKGYO.IS': { symbol: 'EKGYO.IS', name: 'Emlak Konut GMYO', shortName: 'EKGYO', category: 'stock', currency: 'TRY', decimals: 2 },
};

/**
 * Truncgil API'deki karşılık gelen anahtarlar.
 */
export const TRUNCGIL_KEY_MAP: Partial<Record<MarketSymbol, string>> = {
  'USDTRY=X': 'USD',
  'EURTRY=X': 'EUR',
  'GC=F': 'ONS',
  'BZ=F': 'BRENT',
  'XU100.IS': 'XU100',
  GRAM_ALTIN: 'GRA',
  CEYREK_ALTIN: 'CEYREKALTIN',
  YARIM_ALTIN: 'YARIMALTIN',
  TAM_ALTIN: 'TAMALTIN',
  CUMHURIYET_ALTINI: 'CUMHURIYETALTINI',
};

