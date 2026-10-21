/**
 * FinansPulse - Cloudflare Worker Yahoo Finance Proxy & Edge Cache
 *
 * Özellikler:
 * 1. Yahoo Finance chart API (/v8/finance/chart/{symbol}) için ters proxy.
 * 2. Tekil (/chart/THYAO.IS) ve Çoklu/Toplu (/chart?symbols=THYAO.IS,GARAN.IS... veya /batch?symbols=...) istek desteği.
 * 3. Cloudflare Cache API (caches.default) ile 60 saniyelik Edge Önbellek (Smart Cache).
 * 4. Sembol sıralamasından bağımsız normalize edilmiş Cache Key mekanizması (Cache Hit oranını maksimize eder).
 * 5. 10'arlı eşzamanlı sorgu havuzu (Concurrency Chunking) ile Yahoo Finance rate limit ve IP blokajı koruması.
 * 6. Tam CORS desteği (Mobil uygulama ve Web tarayıcıları için).
 */

export interface Env {
  // Opsiyonel ortam değişkeni: varsayılan önbellek süresi (saniye)
  CACHE_TTL?: string;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const DEFAULT_CACHE_TTL_SEC = 60; // 60 saniye Edge önbellekleme
const BATCH_CONCURRENCY = 10; // Yahoo'ya aynı anda en fazla 10 paralel istek

// Standart CORS Başlıkları
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

// Yahoo Finance bot filtresine takılmamak için gerçekçi User-Agent
const YAHOO_FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1. CORS Preflight (OPTIONS) İsteğini Hemen Karşıla
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Yalnızca GET ve HEAD isteklerini kabul et
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return jsonResponse({ error: 'Method Not Allowed' }, 405);
    }

    const url = new URL(request.url);
    const ttl = parseInt(env.CACHE_TTL || String(DEFAULT_CACHE_TTL_SEC), 10);

    // 2. Cache Key Normalizasyonu
    // (Örn: ?symbols=THYAO.IS,GARAN.IS ile ?symbols=GARAN.IS,THYAO.IS aynı önbellek kaydına eşleşir)
    const cacheKeyUrl = normalizeCacheKey(url);
    const cacheKey = new Request(cacheKeyUrl.toString(), {
      method: 'GET',
      headers: request.headers,
    });

    const cache = (caches as unknown as { default: Cache }).default;

    // 3. Cloudflare Edge Cache Kontrolü
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      // Önbellekten doğrudan yanıt dön (Cache HIT)
      const hitHeaders = new Headers(cachedResponse.headers);
      hitHeaders.set('X-Cache-Status', 'HIT');
      hitHeaders.set('X-Edge-Cache-TTL', `${ttl}s`);
      for (const [key, value] of Object.entries(CORS_HEADERS)) {
        hitHeaders.set(key, value);
      }

      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: hitHeaders,
      });
    }

    // 4. Önbellekte Yok (Cache MISS) -> Yahoo Finance'e İstek At
    try {
      let finalData: unknown;
      const pathname = url.pathname;

      // Durum A: Toplu / Çoklu Sembol İstekleri
      // Örnek: /batch?symbols=THYAO.IS,GARAN.IS,ASELS.IS veya /chart?symbols=...
      const symbolsParam = url.searchParams.get('symbols') || url.searchParams.get('s');
      if (symbolsParam || pathname.startsWith('/batch')) {
        const rawSymbols = (symbolsParam || '')
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);

        if (rawSymbols.length === 0) {
          return jsonResponse({ error: 'Lütfen en az bir sembol belirtin (örn: ?symbols=THYAO.IS,GARAN.IS)' }, 400);
        }

        const range = url.searchParams.get('range') || '1d';
        const interval = url.searchParams.get('interval') || '15m';

        finalData = await fetchBatchQuotes(rawSymbols, range, interval);
      }
      // Durum B: Tekil Sembol İsteği
      // Örnek: /chart/THYAO.IS veya /v8/finance/chart/THYAO.IS
      else {
        const symbol = extractSymbolFromPath(pathname);
        if (!symbol) {
          return jsonResponse(
            {
              message: 'FinansPulse Yahoo Finance Cache Proxy aktif.',
              usage: {
                single: '/chart/{SYMBOL}?range=1d&interval=15m',
                batch: '/batch?symbols=THYAO.IS,GARAN.IS,ASELS.IS&range=1d&interval=15m',
              },
            },
            200,
          );
        }

        const range = url.searchParams.get('range') || '1d';
        const interval = url.searchParams.get('interval') || '15m';
        const includePrePost = url.searchParams.get('includePrePost') || 'false';

        const yahooUrl = `${YAHOO_BASE_URL}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=${includePrePost}`;
        const yahooRes = await fetch(yahooUrl, { headers: YAHOO_FETCH_HEADERS });

        if (!yahooRes.ok) {
          return jsonResponse(
            {
              error: `Yahoo Finance API Hatası: ${yahooRes.status} ${yahooRes.statusText}`,
              symbol,
            },
            yahooRes.status,
          );
        }

        finalData = await yahooRes.json();
      }

      // 5. Yanıtı Oluştur ve Edge Cache'e Kaydet
      const responseBody = JSON.stringify(finalData);
      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
      responseHeaders.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}`);
      responseHeaders.set('X-Cache-Status', 'MISS');
      responseHeaders.set('X-Edge-Cache-TTL', `${ttl}s`);
      for (const [key, value] of Object.entries(CORS_HEADERS)) {
        responseHeaders.set(key, value);
      }

      const freshResponse = new Response(responseBody, {
        status: 200,
        headers: responseHeaders,
      });

      // Cloudflare Cache API'ye asenkron kaydet (kullanıcıyı bekletmez)
      ctx.waitUntil(cache.put(cacheKey, freshResponse.clone()));

      return freshResponse;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen proxy hatası';
      return jsonResponse({ error: message }, 500);
    }
  },
};

/* ------------------------------------------------------------------ */
/* Yardımcı Fonksiyonlar                                              */
/* ------------------------------------------------------------------ */

/**
 * URL Yolundan hisse sembolünü çıkartır
 * /chart/THYAO.IS -> THYAO.IS
 * /v8/finance/chart/THYAO.IS -> THYAO.IS
 */
function extractSymbolFromPath(pathname: string): string | null {
  const clean = pathname.replace(/\/+$/, '');
  const parts = clean.split('/');
  const lastPart = parts[parts.length - 1];
  if (!lastPart || lastPart === 'chart' || lastPart === 'batch' || lastPart === 'v8') {
    return null;
  }
  try {
    const symbol = decodeURIComponent(lastPart).toUpperCase();
    return /^[A-Z0-9^=.-]+$/.test(symbol) ? symbol : null;
  } catch {
    return null;
  }
}

/**
 * Birden fazla sembolü eşzamanlılık sınırı (10'ar adet) ile Yahoo'dan çeker
 */
async function fetchBatchQuotes(
  symbols: string[],
  range: string,
  interval: string,
): Promise<{ count: number; results: Record<string, unknown>; failed: string[] }> {
  const results: Record<string, unknown> = {};
  const failed: string[] = [];

  // Sembolleri 10'arlı gruplara böl (Yahoo rate limit'ten kaçınmak için)
  for (let i = 0; i < symbols.length; i += BATCH_CONCURRENCY) {
    const chunk = symbols.slice(i, i + BATCH_CONCURRENCY);

    const chunkPromises = chunk.map(async (symbol) => {
      try {
        const yahooUrl = `${YAHOO_BASE_URL}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
        const res = await fetch(yahooUrl, { headers: YAHOO_FETCH_HEADERS });

        if (res.ok) {
          const json = (await res.json()) as { chart?: { result?: unknown[] } };
          results[symbol] = json.chart?.result?.[0] ?? json;
        } else {
          failed.push(symbol);
        }
      } catch {
        failed.push(symbol);
      }
    });

    await Promise.all(chunkPromises);
  }

  return {
    count: Object.keys(results).length,
    results,
    failed,
  };
}

/**
 * Cache Key'i normalize eder:
 * Query string'deki parametreleri ve 'symbols' listesini alfabetik sıralar.
 * Böylece ?symbols=B,A ile ?symbols=A,B aynı cache key'e sahip olur.
 */
function normalizeCacheKey(url: URL): URL {
  const normalized = new URL(url.toString());

  // symbols parametresini alfabetik sırala
  const symbols = normalized.searchParams.get('symbols') || normalized.searchParams.get('s');
  if (symbols) {
    const sorted = symbols
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .sort()
      .join(',');
    normalized.searchParams.delete('s');
    normalized.searchParams.set('symbols', sorted);
  }

  // Tüm query parametrelerini alfabetik sırala
  normalized.searchParams.sort();
  return normalized;
}

/**
 * Standart CORS başlıklarıyla JSON yanıtı döner
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

