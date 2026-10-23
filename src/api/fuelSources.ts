/** Public, VAT-inclusive list published by Petrol Ofisi. Never infer LPG from petrol. */
export const PETROL_OFISI_FUEL_URL = 'https://www.petrolofisi.com.tr/akaryakit-fiyatlari';
export const OPET_FUEL_URL = 'https://www.opet.com.tr/akaryakit-fiyatlari';

export function normalizeFuelLocation(text: string): string {
  return text.toLocaleLowerCase('tr-TR').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]/g, '');
}

function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').trim();
}

/** Resolve products by column headings and read only explicitly VAT-inclusive spans. */
export function parsePetrolOfisiTable(html: string): Map<string, { benzin: number | null; motorin: number | null; lpg: number | null }> {
  const prices = new Map<string, { benzin: number | null; motorin: number | null; lpg: number | null }>();
  for (const table of html.match(/<table\b[\s\S]*?<\/table>/gi) ?? []) {
    const header = table.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)?.[1];
    if (!header) continue;
    const columns = [...header.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)]
      .map((match) => normalizeFuelLocation(plainText(match[1])));
    const petrolIndex = columns.findIndex((name) => name.includes('kursunsuz95'));
    const dieselIndex = columns.findIndex((name) => name.includes('diesel') || name.includes('motorin'));
    const lpgIndex = columns.findIndex((name) => name.includes('otogaz') || name.includes('lpg'));
    if (petrolIndex < 0 || dieselIndex < 0 || lpgIndex < 0) continue;
    for (const match of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1]);
      if (cells.length !== columns.length) continue;
      const city = normalizeFuelLocation(plainText(cells[0]));
      const price = (index: number): number | null => {
        const withTax = cells[index].match(/<span\b[^>]*class\s*=\s*["'][^"']*\bwith-tax\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1];
        if (!withTax) return null;
        const value = plainText(withTax);
        if (!/^\d+(?:[.,]\d+)?$/.test(value)) return null;
        const number = Number(value.replace(',', '.'));
        return Number.isFinite(number) && number > 0 ? number : null;
      };
      const row = { benzin: price(petrolIndex), motorin: price(dieselIndex), lpg: price(lpgIndex) };
      if (city && Object.values(row).some((value) => value !== null)) prices.set(city, row);
    }
    if (prices.size) break;
  }
  return prices;
}
