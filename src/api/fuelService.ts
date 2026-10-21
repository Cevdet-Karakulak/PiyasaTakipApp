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
  benzin: number | null;
  motorin: number | null;
  lpg: number | null;
  /** Time the source was successfully queried, not a source publication time. */
  updatedAt: number | null;
  provinceName: string;
  districtName?: string;
  source: 'live' | 'cache' | 'unavailable';
  isStale: boolean;
}

// v2 discards v1's synthetic LPG and hardcoded fallback prices.
const FUEL_CACHE_KEY_PREFIX = 'finanspulse:fuel-cache:v2:';
const FUEL_CACHE_TTL = 30 * 60 * 1000;
const MAX_OFFLINE_AGE = 24 * 60 * 60 * 1000;

interface OpetDistrictItem {
  provinceCode: number;
  districtName: string;
  prices: { productCode: string; productName: string; amount: number }[];
}

const normalize = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü]/g, '');
const ASIAN_DISTRICTS = ['adalar', 'ataşehir', 'beykoz', 'çekmeköy', 'kadıköy', 'kartal', 'maltepe', 'pendik', 'sancaktepe', 'sultanbeyli', 'şile', 'tuzla', 'ümraniye', 'üsküdar'];
const EUROPEAN_DISTRICTS = ['arnavutköy', 'avcılar', 'bağcılar', 'bahçelievler', 'bakırköy', 'başakşehir', 'bayrampaşa', 'beşiktaş', 'beylikdüzü', 'beyoğlu', 'büyükçekmece', 'çatalca', 'esenler', 'esenyurt', 'eyüp', 'eyüpsultan', 'fatih', 'gaziosmanpaşa', 'güngören', 'kağıthane', 'küçükçekmece', 'sarıyer', 'silivri', 'sultangazi', 'şişli', 'zeytinburnu'];

export function parseFuelPrices(data: unknown, province: FuelProvince, now = Date.now()): FuelPrices | null {
  if (!Array.isArray(data)) return null;
  const candidates = (data as OpetDistrictItem[]).filter((d) => d && d.provinceCode === province.code && Array.isArray(d.prices));
  const districts = province.id === '34_anadolu' ? ASIAN_DISTRICTS : province.id === '34_avrupa' ? EUROPEAN_DISTRICTS : null;
  const district = candidates.find((d) => !districts || (typeof d.districtName === 'string' && districts.includes(normalize(d.districtName))));
  if (!district) return null;
  const price = (codes: string[]) => {
    for (const code of codes) {
      const p = district.prices.find((item) => item?.productCode === code && typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount > 0);
      if (p) return p.amount;
    }
    return null;
  };
  const benzin = price(['A100']);
  const motorin = price(['A121', 'A128']);
  // No verified LPG product mapping: do not manufacture an LPG quote from petrol.
  if (benzin === null && motorin === null) return null;
  return { benzin, motorin, lpg: null, provinceName: province.name, districtName: district.districtName, updatedAt: now, source: 'live', isStale: false };
}

export async function fetchProvinceFuelPrices(province: FuelProvince, forceRefresh = false): Promise<FuelPrices> {
  const cacheKey = `${FUEL_CACHE_KEY_PREFIX}${province.id}`;
  let cached: FuelPrices | null = null;
  try {
    const text = await AsyncStorage.getItem(cacheKey);
    if (text) {
      const value = JSON.parse(text) as FuelPrices;
      const valid = (n: unknown) => n === null || (typeof n === 'number' && Number.isFinite(n) && n > 0);
      if (typeof value.updatedAt === 'number' && value.updatedAt <= Date.now() && Date.now() - value.updatedAt < MAX_OFFLINE_AGE && value.provinceName === province.name && valid(value.benzin) && valid(value.motorin) && value.lpg === null && (value.benzin !== null || value.motorin !== null)) cached = value;
    }
  } catch { /* Try network if cache is corrupt. */ }
  if (!forceRefresh && cached?.updatedAt && Date.now() - cached.updatedAt < FUEL_CACHE_TTL) {
    return { ...cached, source: 'cache', isStale: false };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = resolveApiUrl(`https://api.opet.com.tr/api/fuelprices/prices?ProvinceCode=${province.code}`);
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Opet HTTP ${res.status}`);
    const prices = parseFuelPrices(await res.json(), province);
    if (!prices) throw new Error('Kaynakta uygun ilçe/ürün fiyatı yok.');
    await AsyncStorage.setItem(cacheKey, JSON.stringify(prices)).catch(() => {});
    return prices;
  } catch {
    if (cached) return { ...cached, source: 'cache', isStale: true };
    return { benzin: null, motorin: null, lpg: null, updatedAt: null, provinceName: province.name, source: 'unavailable', isStale: true };
  } finally { clearTimeout(timeout); }
}
