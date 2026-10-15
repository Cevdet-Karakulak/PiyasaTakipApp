import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveApiUrl } from './config';

export interface FuelProvince {
  code: number;
  id: string;
  name: string;
}

export const FUEL_PROVINCES: FuelProvince[] = [
  { code: 34, id: '34_avrupa', name: 'İstanbul (Avrupa)' },
  { code: 34, id: '34_anadolu', name: 'İstanbul (Anadolu)' },
  { code: 6, id: '06', name: 'Ankara' },
  { code: 35, id: '35', name: 'İzmir' },
  { code: 16, id: '16', name: 'Bursa' },
  { code: 7, id: '07', name: 'Antalya' },
  { code: 1, id: '01', name: 'Adana' },
  { code: 22, id: '22', name: 'Edirne' },
  { code: 61, id: '61', name: 'Trabzon' },
  { code: 21, id: '21', name: 'Diyarbakır' },
  { code: 42, id: '42', name: 'Konya' },
  { code: 55, id: '55', name: 'Samsun' },
];

export interface FuelPrices {
  benzin: number;
  motorin: number;
  lpg: number;
  updatedAt: number;
  provinceName: string;
  source: 'live' | 'cache' | 'fallback';
}

const FUEL_CACHE_KEY_PREFIX = 'finanspulse:fuel-cache:';
const FUEL_CACHE_TTL = 30 * 60 * 1000; // 30 dakika

/** Güvenilir baz fiyat tablosu (Ağ hatası veya çevrimdışı durum için) */
const FALLBACK_PRICES: Record<string, { benzin: number; motorin: number; lpg: number }> = {
  '34_avrupa': { benzin: 83.69, motorin: 96.53, lpg: 30.85 },
  '34_anadolu': { benzin: 83.65, motorin: 96.48, lpg: 30.75 },
  '06': { benzin: 84.84, motorin: 97.72, lpg: 31.40 },
  '35': { benzin: 85.12, motorin: 98.02, lpg: 31.25 },
  '16': { benzin: 84.94, motorin: 97.62, lpg: 31.15 },
  '07': { benzin: 86.13, motorin: 99.07, lpg: 31.80 },
  '01': { benzin: 85.60, motorin: 98.45, lpg: 31.50 },
  '22': { benzin: 84.98, motorin: 97.88, lpg: 31.30 },
  '61': { benzin: 85.80, motorin: 98.70, lpg: 31.65 },
  '21': { benzin: 86.25, motorin: 99.15, lpg: 32.10 },
  '42': { benzin: 85.40, motorin: 98.20, lpg: 31.45 },
  '55': { benzin: 85.50, motorin: 98.35, lpg: 31.55 },
};

interface OpetPriceItem {
  id: string;
  productName: string;
  productShortName: string;
  amount: number;
  productCode: string;
}

interface OpetDistrictItem {
  provinceCode: number;
  provinceName: string;
  districtCode: string;
  districtName: string;
  prices: OpetPriceItem[];
}

/**
 * Seçilen il için güncel akaryakıt (Benzin, Motorin, LPG) fiyatlarını getirir.
 */
export async function fetchProvinceFuelPrices(province: FuelProvince, forceRefresh = false): Promise<FuelPrices> {
  const cacheKey = `${FUEL_CACHE_KEY_PREFIX}${province.id}`;

  if (!forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as FuelPrices;
        if (Date.now() - parsed.updatedAt < FUEL_CACHE_TTL) {
          return { ...parsed, source: 'cache' };
        }
      }
    } catch {
      // Önbellek hatasında canlı isteğe devam et
    }
  }

  try {
    const rawUrl = `https://api.opet.com.tr/api/fuelprices/prices?ProvinceCode=${province.code}`;
    const url = resolveApiUrl(rawUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as OpetDistrictItem[];
      if (Array.isArray(data) && data.length > 0) {
        // İlk ilçenin veya merkezi ilçenin fiyatlarını al
        const district = data[0];
        let benzinPrice: number | undefined;
        let motorinPrice: number | undefined;

        for (const p of district.prices) {
          if (p.productCode === 'A100') benzinPrice = p.amount;
          if (p.productCode === 'A121' || p.productCode === 'A128') {
            if (!motorinPrice || p.amount > 0) motorinPrice = p.amount;
          }
        }

        const fallback = FALLBACK_PRICES[province.id] ?? FALLBACK_PRICES['34_avrupa'];
        const finalBenzin = benzinPrice && benzinPrice > 0 ? benzinPrice : fallback.benzin;
        const finalMotorin = motorinPrice && motorinPrice > 0 ? motorinPrice : fallback.motorin;
        const finalLpg = Number((finalBenzin * 0.368).toFixed(2));

        const result: FuelPrices = {
          benzin: finalBenzin,
          motorin: finalMotorin,
          lpg: finalLpg,
          updatedAt: Date.now(),
          provinceName: province.name,
          source: 'live',
        };

        AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
        return result;
      }
    }
  } catch (err) {
    console.warn(`Opet akaryakıt verisi (${province.name}) alınamadı, yedek değer kullanılıyor:`, err);
  }

  // Fallback
  const fallback = FALLBACK_PRICES[province.id] ?? FALLBACK_PRICES['34_avrupa'];
  return {
    benzin: fallback.benzin,
    motorin: fallback.motorin,
    lpg: fallback.lpg,
    updatedAt: Date.now(),
    provinceName: province.name,
    source: 'fallback',
  };
}

/* ------------------------------------------------------------------ */
/* Akaryakıt Zam / İndirim Tahmin Motoru (EPDK & CIF Akdeniz Modeli)     */
/* ------------------------------------------------------------------ */

export type FuelHikeStatus = 'HIKE_RISK' | 'DISCOUNT_CHANCE' | 'STABLE';

export interface FuelPredictionResult {
  compositeChange: number; // Bileşik maliyet değişimi (%)
  status: FuelHikeStatus;
  title: string;
  badgeText: string;
  description: string;
  estimatedBenzinDelta: number; // TL / Litre
  estimatedMotorinDelta: number; // TL / Litre
  brentWeight: number; // %60
  currencyWeight: number; // %40
}

/**
 * EPDK & CIF Akdeniz simülasyonu:
 * Rafineri maliyet etkisi = (%60 Brent Petrol değişimi) + (%40 Dolar/TL değişimi)
 * Pompa yansıması: Ürün maliyeti + %20 KDV etkisi
 */
export function calculateFuelPrediction(
  brentChangePercent: number = 0,
  usdTryChangePercent: number = 0,
  benzinPrice: number = 84,
  motorinPrice: number = 97,
): FuelPredictionResult {
  const brentWeight = 0.6;
  const currencyWeight = 0.4;

  const compositeChange = brentChangePercent * brentWeight + usdTryChangePercent * currencyWeight;

  // Ham ürün payı (~%45) ve KDV (%20) çarpanı: (Fiyat * 0.45 * (değişim/100)) * 1.20
  const benzinDelta = Number((benzinPrice * 0.45 * (compositeChange / 100) * 1.2).toFixed(2));
  const motorinDelta = Number((motorinPrice * 0.45 * (compositeChange / 100) * 1.2).toFixed(2));

  if (compositeChange >= 1.2) {
    return {
      compositeChange: Number(compositeChange.toFixed(2)),
      status: 'HIKE_RISK',
      title: 'ZAM RİSKİ YÜKSEK',
      badgeText: '⚠️ YÜKSEK ZAM RİSKİ',
      description: 'Brent petrol ve döviz kurundaki yukarı yönlü hareket rafineri maliyetlerini artırıyor. Pompa fiyatlarına zam yansıması bekleniyor.',
      estimatedBenzinDelta: benzinDelta > 0 ? benzinDelta : 0.85,
      estimatedMotorinDelta: motorinDelta > 0 ? motorinDelta : 1.15,
      brentWeight: 60,
      currencyWeight: 40,
    };
  }

  if (compositeChange <= -1.2) {
    return {
      compositeChange: Number(compositeChange.toFixed(2)),
      status: 'DISCOUNT_CHANCE',
      title: 'İNDİRİM İHTİMALİ',
      badgeText: '🟢 İNDİRİM İHTİMALİ',
      description: 'Küresel petrol ve döviz kurundaki gevşeme Akdeniz rafineri maliyetlerini düşürüyor. Pompa fiyatlarına indirim potansiyeli mevcut.',
      estimatedBenzinDelta: benzinDelta < 0 ? benzinDelta : -0.75,
      estimatedMotorinDelta: motorinDelta < 0 ? motorinDelta : -0.95,
      brentWeight: 60,
      currencyWeight: 40,
    };
  }

  return {
    compositeChange: Number(compositeChange.toFixed(2)),
    status: 'STABLE',
    title: 'POMPA FİYATLARI STABİL',
    badgeText: '⚖️ DEĞİŞİM BEKLENMİYOR',
    description: 'Bileşik maliyet hareketleri EPDK eşik sınırlarının altında kalıyor. Kısa vadede pompa fiyatlarında değişim beklenmiyor.',
    estimatedBenzinDelta: 0,
    estimatedMotorinDelta: 0,
    brentWeight: 60,
    currencyWeight: 40,
  };
}
