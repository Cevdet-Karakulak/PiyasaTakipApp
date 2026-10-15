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

const NEWS_CACHE_KEY = 'finanspulse:news-cache-v1';
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
    const publishedAt = Number.isNaN(parsedTime) ? Date.now() - index * 600000 : parsedTime;

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

/** Yedek yerleşik haberler (Çevrimdışı veya aşırı ağ engeli durumunda gösterilir) */
const FALLBACK_NEWS: NewsArticle[] = [
  {
    id: 'fb-1',
    title: 'BIST 100 Endeksinde Bankacılık ve Havacılık Hisseleriyle Güçlü Seyir',
    summary: 'Borsa İstanbul\'da BIST 100 endeksi, yabancı kurumların olumlu raporları ve bankacılık hisseleri liderliğinde işlem hacmini artırarak yükselişini sürdürüyor.',
    link: 'https://www.bloomberght.com/borsa',
    source: 'Bloomberg HT',
    pubDate: new Date().toUTCString(),
    publishedAt: Date.now() - 15 * 60 * 1000,
    timeAgo: '15 dk önce',
    category: 'BIST',
  },
  {
    id: 'fb-2',
    title: 'Ons Altın ve Gram Altında Küresel Jeopolitik Risk Fiyatlaması',
    summary: 'Merkez bankalarının aralıksız rezerv altın alımları ve küresel faiz indirim döngüsüne ilişkin beklentiler altın fiyatlarını destekliyor.',
    link: 'https://www.bloomberght.com/altin',
    source: 'Bloomberg HT',
    pubDate: new Date().toUTCString(),
    publishedAt: Date.now() - 42 * 60 * 1000,
    timeAgo: '42 dk önce',
    category: 'Altın',
  },
  {
    id: 'fb-3',
    title: 'TCMB Rezervlerinde İstikrarlı Artış Eğilimi Devam Ediyor',
    summary: 'Türkiye Cumhuriyet Merkez Bankası toplam brüt rezervleri ve swap hariç net rezerv pozisyonundaki toparlanma eğilimi piyasa güvenini destekliyor.',
    link: 'https://www.bloomberght.com/tcmb-rezervlerinde-toparlanma-3791468',
    source: 'Bloomberg HT',
    pubDate: new Date().toUTCString(),
    publishedAt: Date.now() - 75 * 60 * 1000,
    timeAgo: '1 saat önce',
    category: 'Makro',
  },
  {
    id: 'fb-4',
    title: 'Brent Petrol Fiyatlarında Arz Endişeleriyle Dalgalı Seyir',
    summary: 'OPEC+ üretim kısıntısı stratejileri ve Ortadoğu enerji koridorundaki jeopolitik gelişmeler ham petrol kontratlarında oynaklığı artırıyor.',
    link: 'https://www.bloomberght.com/enerji',
    source: 'Bloomberg HT',
    pubDate: new Date().toUTCString(),
    publishedAt: Date.now() - 120 * 60 * 1000,
    timeAgo: '2 saat önce',
    category: 'Küresel',
  },
  {
    id: 'fb-5',
    title: 'Dolar/TL ve Euro/TL Paritesinde Küresel Veri Akışı İzleniyor',
    summary: 'İç piyasada döviz kurları dengeli görünümünü korurken küresel dolar endeksi (DXY) ve ABD tahvil getirileri yakından izleniyor.',
    link: 'https://www.bloomberght.com/doviz',
    source: 'Bloomberg HT',
    pubDate: new Date().toUTCString(),
    publishedAt: Date.now() - 180 * 60 * 1000,
    timeAgo: '3 saat önce',
    category: 'Döviz',
  },
];

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

  return FALLBACK_NEWS;
}
