/**
 * GoldCalculator
 *
 * Ons altın (USD) ve USD/TRY kurundan Türkiye'de yaygın altın türlerinin
 * teorik (has değer) TL fiyatlarını hesaplar.
 *
 *   Gram (24 ayar)      = Ons(USD) × USDTRY / 31.1034768
 *   Ziynet / Cumhuriyet = Gram × (brüt ağırlık × milyem)
 *
 * Not: Kuyumcu fiyatları işçilik ve alış/satış makası içerir. Bu fark
 * `premiums` parametresiyle (ör. 0.02 = %2) modellenebilir.
 */

import type { GoldSymbol, MarketSymbol } from '../types/market';

export const TROY_OUNCE_IN_GRAMS = 31.1034768;

/** Darphane: 22 ayar = 916,6 milyem. Ziynet ve sikke ağırlıkları farklıdır.
 * https://www.darphane.gov.tr/cumhuriyet-altini-uretimi
 */
const KARAT_22_PURITY = 0.9166;

export const GOLD_SPECS = {
  gram: { weightGrams: 1, purity: 1 },
  ceyrek: { weightGrams: 1.754, purity: KARAT_22_PURITY },
  yarim: { weightGrams: 3.508, purity: KARAT_22_PURITY },
  tam: { weightGrams: 7.016, purity: KARAT_22_PURITY },
  cumhuriyet: { weightGrams: 7.216, purity: KARAT_22_PURITY },
} as const;

export type GoldType = keyof typeof GOLD_SPECS;

export type GoldPremiums = Partial<Record<GoldType, number>>;
export type GoldPrices = Record<GoldType, number>;

/** Shared by quote generation and history so new gold types cannot be omitted. */
export const GOLD_SYMBOL_TO_TYPE: Record<GoldSymbol, GoldType> = {
  GRAM_ALTIN: 'gram',
  CEYREK_ALTIN: 'ceyrek',
  YARIM_ALTIN: 'yarim',
  TAM_ALTIN: 'tam',
  CUMHURIYET_ALTINI: 'cumhuriyet',
};
export const isDerivedGoldSymbol = (symbol: MarketSymbol): symbol is GoldSymbol =>
  Object.hasOwn(GOLD_SYMBOL_TO_TYPE, symbol);

const isPositive = (n: number | null | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

/** Bir altın türündeki saf (has) altın miktarı, gram cinsinden. */
export const getFineGoldGrams = (type: GoldType): number =>
  GOLD_SPECS[type].weightGrams * GOLD_SPECS[type].purity;

/** 24 ayar gram altın TL fiyatı. Girdiler geçersizse `null`. */
export function calculateGramGold(onsUsd: number | null | undefined, usdTry: number | null | undefined): number | null {
  if (!isPositive(onsUsd) || !isPositive(usdTry)) return null;
  return (onsUsd * usdTry) / TROY_OUNCE_IN_GRAMS;
}

/** Tüm altın türlerini tek seferde hesaplar. Girdiler geçersizse `null`. */
export function calculateGoldPrices(
  onsUsd: number | null | undefined,
  usdTry: number | null | undefined,
  premiums: GoldPremiums = {},
): GoldPrices | null {
  const gram = calculateGramGold(onsUsd, usdTry);
  if (gram === null) return null;

  const priceOf = (type: GoldType) => gram * getFineGoldGrams(type) * (1 + (premiums[type] ?? 0));

  return {
    gram: priceOf('gram'),
    ceyrek: priceOf('ceyrek'),
    yarim: priceOf('yarim'),
    tam: priceOf('tam'),
    cumhuriyet: priceOf('cumhuriyet'),
  };
}

export const GoldCalculator = {
  TROY_OUNCE_IN_GRAMS,
  GOLD_SPECS,
  getFineGoldGrams,
  calculateGramGold,
  calculateGoldPrices,
};

