import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveApiUrl } from './config';

export type NewsCategory = 'Tümü' | 'BIST' | 'Altın' | 'Döviz' | 'Makro' | 'Küresel' | 'Ekonomi';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  link: string;
  source: string;
  pubDate: string;
  publishedAt: number;
  timeAgo: string;
  category: 'BIST' | 'Altın' | 'Döviz' | 'Makro' | 'Küresel' | 'Ekonomi';
  imageUrl?: string;
}

const NEWS_CACHE_KEY = 'finanspulse:news-cache-v2';
const NEWS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika

const BLOOMBERG_HT_RSS = 'https://www.bloomberght.com/rss';
const GOOGLE_NEWS_TR_RSS = 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=tr&gl=TR&ceid=TR:tr';

/** HTML etiketlerini ve özel karakter kodlarını temizler */
function cleanHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Haberin başlık ve içeriğine göre akıllı finansal kategori belirler */
function detectCategory(title: string, desc: string, rawCategory?: string): 'BIST' | 'Altın' | 'Döviz' | 'Makro' | 'Küresel' | 'Ekonomi' {
  const combined = `${title} ${desc} ${rawCategory ?? ''}`.toLowerCase();

  if (combined.includes('bist') || combined.includes('borsa') || combined.includes('hisse') || combined.includes('thyao') || combined.includes('garan') || combined.includes('endeks') || combined.includes('temettü')) {
    return 'BIST';
  }
  if (combined.includes('altın') || combined.includes('ons') || combined.includes('gram altın') || combined.includes('çeyrek') || combined.includes('gümüş') || combined.includes('emtia')) {
    return 'Altın';
  }
  if (combined.includes('dolar') || combined.includes('euro') || combined.includes('döviz') || combined.includes('tcmb') || combined.includes('kur') || combined.includes('faiz') || combined.includes('parite') || combined.includes('tl')) {
    return 'Döviz';
  }
  if (combined.includes('petrol') || combined.includes('brent') || combined.includes('opec') || combined.includes('fed') || combined.includes('ecb') || combined.includes('wall street') || combined.includes('küresel') || combined.includes('nasdaq')) {
    return 'Küresel';
  }
  if (combined.includes('enflasyon') || combined.includes('tüfe') || combined.includes('büyüme') || combined.includes('ihracat') || combined.includes('işsizlik') || combined.includes('bütçe') || combined.includes('hazine')) {
    return 'Makro';
  }
  return 'Ekonomi';
}

/** Göreli zaman hesaplayıcı (12 dk önce, 2 saat önce...) */
export function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Az önce';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat önce`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} gün önce`;
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' }).format(timestamp);
}

/** RSS XML içeriğinden makaleleri parse eder */
function parseRssXml(xml: string, defaultSource: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const itemRegex = /<item[\s\S]*?>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  const extractTag = (xmlChunk: string, tag: string): string => {
    // CDATA veya doğrudan metin içeren tag
    const reg = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'i');
    const m = xmlChunk.match(reg);
    return m ? cleanHtmlEntities(m[1] ?? m[2] ?? '') : '';
  };

  const extractAttr = (xmlChunk: string, tag: string, attr: string): string | undefined => {
    const reg = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*>`, 'i');
    const m = xmlChunk.match(reg);
    return m?.[1];
  };

  let index = 0;
  while ((match = itemRegex.exec(xml)) !== null && articles.length < 35) {
    const chunk = match[1];
    const title = extractTag(chunk, 'title');
    const link = extractTag(chunk, 'link');
    const description = extractTag(chunk, 'description');
    const pubDateStr = extractTag(chunk, 'pubDate');
    const rawCategory = extractTag(chunk, 'category');

    // Görsel çıkarma
    const imgUrl =
      extractAttr(chunk, 'media:content', 'url') ??
      extractAttr(chunk, 'enclosure', 'url') ??
      extractAttr(chunk, 'media:thumbnail', 'url');

    if (!title || !link) continue;

    const parsedTime = pubDateStr ? Date.parse(pubDateStr) : NaN;
    if (!Number.isFinite(parsedTime) || parsedTime > Date.now() + 5 * 60_000) continue;
    const publishedAt = parsedTime;

    articles.push({
      id: `${defaultSource}-${index}-${publishedAt}`,
      title,
      summary: description || title,
      link,
      source: defaultSource,
      pubDate: pubDateStr,
      publishedAt,
      timeAgo: formatTimeAgo(publishedAt),
      category: detectCategory(title, description, rawCategory),
      imageUrl: imgUrl,
    });
    index++;
  }

  return articles;
}

/**
 * Gerçek ekonomi/piyasa haberlerini çeker.
 * Önce Bloomberg HT RSS beslemesini dener, başarısız olursa Google News TR RSS dener.
 * Smart Cache (5 dk) ile AsyncStorage üzerinden hızlı açılış sağlar.
 */
export async function fetchLiveNews(forceRefresh = false): Promise<NewsArticle[]> {
  // Önbellek kontrolü
  if (!forceRefresh) {
    try {
      const cachedStr = await AsyncStorage.getItem(NEWS_CACHE_KEY);
      if (cachedStr) {
        const parsed = JSON.parse(cachedStr) as { timestamp: number; articles: NewsArticle[] };
        if (Date.now() - parsed.timestamp < NEWS_CACHE_TTL_MS && parsed.articles.length > 0) {
          // Göreli zamanları tazele
          return parsed.articles.map((item) => ({
            ...item,
            timeAgo: formatTimeAgo(item.publishedAt),
          }));
        }
      }
    } catch {
      // Önbellek okuma hatasında ağa geç
    }
  }

  // 1. Bloomberg HT RSS Çekimi
  try {
    const url = resolveApiUrl(BLOOMBERG_HT_RSS);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const xml = await res.text();
      const articles = parseRssXml(xml, 'Bloomberg HT');
      if (articles.length >= 3) {
        // Önbelleğe kaydet
        AsyncStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), articles })).catch(() => {});
        return articles;
      }
    }
  } catch (err) {
    console.warn('Bloomberg HT RSS çekilemedi, ikincil kaynak deneniyor:', err);
  }

  // 2. İkincil Kaynak: Google News TR Ekonomi RSS
  try {
    const url = resolveApiUrl(GOOGLE_NEWS_TR_RSS);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const xml = await res.text();
      const articles = parseRssXml(xml, 'Google Finans');
      if (articles.length >= 3) {
        AsyncStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), articles })).catch(() => {});
        return articles;
      }
    }
  } catch (err) {
    console.warn('Google News RSS çekilemedi:', err);
  }

  // 3. Her iki kaynak da yanıt vermezse önbellekten ya da yerleşik listeden dön
  try {
    const cachedStr = await AsyncStorage.getItem(NEWS_CACHE_KEY);
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr) as { timestamp: number; articles: NewsArticle[] };
      if (parsed.articles.length > 0) {
        return parsed.articles.map((item) => ({
          ...item,
          timeAgo: formatTimeAgo(item.publishedAt),
        }));
      }
    }
  } catch {
    // ignore
  }

  return [];
}


/** Fuel headlines are publisher reports, never automatic price-change confirmations. */
export async function fetchFuelNews(): Promise<{ articles: NewsArticle[]; error: boolean; fetchedAt: number }> {
  const googleUrl = 'https://news.google.com/rss/search?q=' + encodeURIComponent('akaryakıt (benzin OR motorin OR otogaz) (indirim OR zam) when:3d') + '&hl=tr&gl=TR&ceid=TR:tr';
  const sources = [{ url: googleUrl, name: 'Google Haberler' }, { url: BLOOMBERG_HT_RSS, name: 'Bloomberg HT' }];
  const results = await Promise.allSettled(sources.map(async (source) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(resolveApiUrl(source.url), { signal: controller.signal, headers: { Accept: 'application/rss+xml, application/xml, text/xml' } });
      if (!res.ok) throw new Error('Haber kaynağına ulaşılamadı.');
      const xml = await res.text();
      if (!/<rss[\s>]/i.test(xml)) throw new Error('Geçersiz haber yanıtı.');
      return parseRssXml(xml, source.name);
    } finally { clearTimeout(timeout); }
  }));
  const now = Date.now();
  const byLink = new Map<string, NewsArticle>();
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const article of result.value) {
      const title = article.title.toLocaleLowerCase('tr-TR');
      if (/akaryakıt|benzin|motorin|otogaz|lpg/.test(title) && /indirim|zam/.test(title) && article.publishedAt >= now - 3 * 86_400_000 && /^https:\/\/(?:news\.google\.com|www\.bloomberght\.com)\//.test(article.link)) byLink.set(article.link, article);
    }
  }
  return {
    articles: [...byLink.values()].sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 6),
    error: results.every((result) => result.status === 'rejected'),
    fetchedAt: now,
  };
}
