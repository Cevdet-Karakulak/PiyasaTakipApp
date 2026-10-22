import type { ChartPoint, GoldDayTrend, GoldSymbol } from '../types/market';
import { deriveGoldHistory } from './history';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function istanbulDate(timestamp: number): string {
  const parts = dayFormatter.formatToParts(timestamp);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function cleanPoints(points: ChartPoint[], now: number): ChartPoint[] {
  const unique = new Map<number, number>();
  for (const point of points) {
    if (Number.isFinite(point.timestamp) && point.timestamp > 0 && point.timestamp <= now &&
        Number.isFinite(point.value) && point.value > 0) unique.set(point.timestamp, point.value);
  }
  return [...unique].sort(([a], [b]) => a - b).map(([timestamp, value]) => ({ timestamp, value }));
}

/** Observed theoretical sample extrema, never retail highs/lows or products of unrelated maxima. */
export function deriveGoldDayTrend(
  ons: ChartPoint[], fx: ChartPoint[], symbol: GoldSymbol, now = Date.now(),
): GoldDayTrend | undefined {
  const gold = cleanPoints(ons, now);
  const rates = cleanPoints(fx, now);
  const last = gold.at(-1);
  // A recent previous session is useful on weekends, but must retain its actual date.
  if (!last || now - last.timestamp > 4 * 86_400_000) return undefined;
  const sessionDate = istanbulDate(last.timestamp);
  // The daily source interval is 15m. Never carry stale FX for days into an intraday trend.
  const points = deriveGoldHistory(gold, rates, symbol, 30 * 60_000)
    .filter((point) => istanbulDate(point.timestamp) === sessionDate);
  if (points.length < 2) return undefined;
  let high = -Infinity;
  let low = Infinity;
  for (const point of points) { high = Math.max(high, point.value); low = Math.min(low, point.value); }
  return { points, sessionDate, high, low };
}
