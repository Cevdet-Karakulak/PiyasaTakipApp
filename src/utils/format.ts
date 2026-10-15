import type { QuoteCurrency } from '@/types/market';

const LOCALE = 'tr-TR';

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

/**
 * Fiyat formatı:
 * TRY için "49,3480 ₺" şeklinde sağda simge kullanır (böylece font uyumsuzluklarında ▯ çıkmaz).
 * USD için "$4.180,50" formatı kullanılır.
 */
export function formatPrice(value: number | null | undefined, currency: QuoteCurrency = 'TRY', digits?: number): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const fractionDigits = digits ?? (value >= 1000 ? 2 : value >= 1 ? 2 : 4);
  const formattedNum = formatNumber(value, fractionDigits);

  if (currency === 'TRY') {
    return `${formattedNum} TL`;
  }
  if (currency === 'USD') {
    return `$${formattedNum}`;
  }
  return `${formattedNum} ${currency}`;
}

/** "+1,23%" / "-0,45%" */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value, 2)}%`;
}

export type Trend = 'up' | 'down' | 'flat';

export const getTrend = (changePercent: number | null | undefined): Trend =>
  changePercent == null || Math.abs(changePercent) < 0.005 ? 'flat' : changePercent > 0 ? 'up' : 'down';

/** "14:08:01" */
export function formatTime(date: Date | number | null | undefined): string {
  if (date == null) return '—';
  return new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
}
