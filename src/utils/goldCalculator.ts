/**
 * GoldCalculator
 *
 * Ons altın (USD) ve USD/TRY kurundan Türkiye'de yaygın altın türlerinin
 * teorik (has değer) TL fiyatlarını hesaplar.
 *
 *   Gram (24 ayar)      = Ons(USD) × USDTRY / 31.1034768
 *   Çeyrek / Cumhuriyet = Gram × (brüt ağırlık × milyem)
 *
 * Not: Kuyumcu fiyatları işçilik ve alış/satış makası içerir. Bu fark
 * `premiums` parametresiyle (ör. 0.02 = %2) modellenebilir.
 */

export const TROY_OUNCE_IN_GRAMS = 31.1034768;

/** Ziynet altınları 22 ayardır (916 milyem). */
const KARAT_22_PURITY = 0.916;

export const GOLD_SPECS = {
  gram: { weightGrams: 1, purity: 1 },
  ceyrek: { weightGrams: 1.754, purity: KARAT_22_PURITY },
  cumhuriyet: { weightGrams: 7.216, purity: KARAT_22_PURITY },
} as const;

export type GoldType = keyof typeof GOLD_SPECS;

export interface GoldPremiums {
  gram?: number;
  ceyrek?: number;
  cumhuriyet?: number;
}

export interface GoldPrices {
  gram: number;
  ceyrek: number;
  cumhuriyet: number;
}

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
