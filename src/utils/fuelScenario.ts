/** User-entered what-if calculation, never a prediction. Missing is not zero. */
export function calculateFuelScenario(price: number | null | undefined, litersText: string, deltaText: string) {
  const parse = (text: string) => /^-?\d+(?:[.,]\d+)?$/.test(text.trim()) ? Number(text.trim().replace(',', '.')) : NaN;
  const liters = parse(litersText);
  const delta = parse(deltaText);
  const validLiters = Number.isFinite(liters) && liters > 0 && liters <= 500;
  const validPrice = typeof price === 'number' && Number.isFinite(price) && price > 0;
  const currentTotal = validLiters && validPrice ? liters * price : null;
  const deltaTotal = validLiters && Number.isFinite(delta) ? liters * delta : null;
  const newTotal = currentTotal !== null && deltaTotal !== null && currentTotal + deltaTotal >= 0 ? currentTotal + deltaTotal : null;
  return { currentTotal, deltaTotal, newTotal };
}

/** Magnitude comes from the decimal keyboard; direction is chosen separately. */
export function fuelDeltaText(amount: string, direction: 'discount' | 'increase'): string {
  const value = amount.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(value)) return '';
  return direction === 'discount' ? `-${value}` : value;
}
