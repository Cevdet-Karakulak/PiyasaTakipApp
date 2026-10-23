import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveApiUrl } from './config';

export const FUEL_CHANGES_URL = 'https://petrolistan.com/api/fuel/changes';
export const FUEL_CHANGES_SOURCE = 'https://petrolistan.com/akaryakit/zam-indirim';
export type ChangedFuel = 'benzin' | 'motorin' | 'lpg';
export interface FuelChange {
  id: string;
  fuel: ChangedFuel;
  date: string;
  delta: number;
  samplePairs: number;
  agreePairs: number;
}
export interface FuelChangeReport {
  events: FuelChange[];
  generatedAt: number | null;
  checkedAt: number;
  stale: boolean;
  error: boolean;
}
const KEY = 'piyasaradari:fuel-changes:v1';
const TTL = 15 * 60_000;
const MAX_AGE = 7 * 86_400_000;
const STALE_AGE = 24 * 60 * 60_000;
const fuels: Record<string, ChangedFuel> = { gasoline: 'benzin', diesel: 'motorin', lpg: 'lpg' };
const istanbulDay = (now: number) => new Date(now + 3 * 60 * 60_000).toISOString().slice(0, 10);

/** Provider observations, never an official decision or a future announcement. */
export function parseFuelChanges(input: unknown, now = Date.now()): FuelChangeReport | null {
  if (!input || typeof input !== 'object') return null;
  const data = input as Record<string, unknown>;
  const generatedAt = typeof data.generatedAt === 'string' ? Date.parse(data.generatedAt) : NaN;
  if (!Number.isFinite(generatedAt) || generatedAt > now || now - generatedAt > MAX_AGE || !Array.isArray(data.events)) return null;
  const unique = new Map<string, FuelChange>();
  for (const item of data.events) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const fuel = typeof row.fuel === 'string' && Object.hasOwn(fuels, row.fuel) ? fuels[row.fuel] : undefined;
    const { date, delta, samplePairs, agreePairs } = row;
    if (!fuel || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > istanbulDay(now) || date > istanbulDay(generatedAt)) continue;
    const day = new Date(`${date}T00:00:00Z`);
    if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) continue;
    if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100) continue;
    if ((delta > 0 && row.direction !== 'up') || (delta < 0 && row.direction !== 'down')) continue;
    if (!Number.isInteger(samplePairs) || !Number.isInteger(agreePairs) || (samplePairs as number) < 3 || (agreePairs as number) > (samplePairs as number) || (agreePairs as number) / (samplePairs as number) < 0.6) continue;
    const id = `${date}:${fuel}`;
    unique.set(id, { id, fuel, date, delta, samplePairs: samplePairs as number, agreePairs: agreePairs as number });
  }
  // A changed schema must not be presented as a successful "no changes" response.
  if (data.events.length && !unique.size) return null;
  return { events: [...unique.values()].sort((a, b) => b.date.localeCompare(a.date)), generatedAt, checkedAt: now, stale: now - generatedAt > STALE_AGE, error: false };
}

let inFlight: Promise<FuelChangeReport> | null = null;
export async function fetchFuelChanges(force = false): Promise<FuelChangeReport> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    let cached: FuelChangeReport | null = null;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        const parsed = parseFuelChanges(stored.payload);
        if (parsed && typeof stored.checkedAt === 'number' && stored.checkedAt <= Date.now()) {
          cached = { ...parsed, checkedAt: stored.checkedAt };
          if (!force && Date.now() - stored.checkedAt < TTL) return cached;
        }
      }
    } catch { /* A corrupt cache must not prevent a live query. */ }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(resolveApiUrl(FUEL_CHANGES_URL), { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Fiyat değişikliği kaynağına ulaşılamadı.');
      const payload: unknown = await response.json();
      const report = parseFuelChanges(payload);
      if (!report) throw new Error('Fiyat değişikliği verisi doğrulanamadı.');
      await AsyncStorage.setItem(KEY, JSON.stringify({ payload, checkedAt: report.checkedAt })).catch(() => {});
      return report;
    } catch {
      return cached ? { ...cached, stale: true, error: true } : { events: [], generatedAt: null, checkedAt: Date.now(), stale: true, error: true };
    } finally { clearTimeout(timeout); }
  })();
  try { return await inFlight; } finally { inFlight = null; }
}
