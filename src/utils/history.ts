import type { ChartPoint, GoldSymbol } from '../types/market';
import { calculateGoldPrices } from './goldCalculator';

export interface RawHistory {
  timestamp?: number[];
  indicators?: { quote?: { close?: (number | null)[] }[] };
}

/** Preserve source timestamps; never invent samples for missing observations. */
export function parseHistory(result: RawHistory): ChartPoint[] {
  const unique = new Map<number, number>();
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  for (const [i, seconds] of (result.timestamp ?? []).entries()) {
    const value = closes[i];
    if (Number.isFinite(seconds) && seconds > 0 && typeof value === 'number' && Number.isFinite(value) && value > 0) {
      unique.set(seconds * 1000, value);
    }
  }
  return [...unique].sort(([a], [b]) => a - b).map(([timestamp, value]) => ({ timestamp, value }));
}

/** Theoretical TRY value using the most recent preceding FX observation. */
export function deriveGoldHistory(ons: ChartPoint[], fx: ChartPoint[], symbol: GoldSymbol): ChartPoint[] {
  const key = { GRAM_ALTIN: 'gram', CEYREK_ALTIN: 'ceyrek', CUMHURIYET_ALTINI: 'cumhuriyet' } as const;
  const points: ChartPoint[] = [];
  let cursor = -1;
  for (const point of ons) {
    while (cursor + 1 < fx.length && fx[cursor + 1].timestamp <= point.timestamp) cursor++;
    const rate = fx[cursor];
    // Allow weekends/holidays, but never use a future rate or carry one indefinitely.
    if (!rate || point.timestamp - rate.timestamp > 4 * 86_400_000) continue;
    const values = calculateGoldPrices(point.value, rate.value);
    if (values) points.push({ timestamp: point.timestamp, value: values[key[symbol]] });
  }
  return points;
}
