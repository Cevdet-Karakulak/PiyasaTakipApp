const { storage } = require('./register.cjs');
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parsePetrolOfisiTable, normalizeFuelLocation } = require('../src/api/fuelSources.ts');
const { fetchProvinceFuelPrices, FUEL_PROVINCES, parseFuelPrices } = require('../src/api/fuelService.ts');
const { fuelDeltaText } = require('../src/utils/fuelScenario.ts');
// Factual table captured from the public Petrol Ofisi source on 2026-10-22.
const html = fs.readFileSync(path.join(__dirname, 'fixtures/petrol-ofisi-prices.html'), 'utf8');
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; storage.clear(); });

test('real provider table resolves 82 regions, including separate Istanbul sides and LPG', () => {
  const prices = parsePetrolOfisiTable(html);
  assert.equal(prices.size, 82);
  assert.deepEqual(prices.get(normalizeFuelLocation('İstanbul (Avrupa)')), { benzin: 76.3, motorin: 96.8, lpg: 41.2 });
  assert.deepEqual(prices.get(normalizeFuelLocation('İstanbul (Anadolu)')), { benzin: 76.1, motorin: 96.6, lpg: 40.6 });
  for (const province of FUEL_PROVINCES) {
    const value = prices.get(normalizeFuelLocation(province.name));
    assert.ok(value, province.name);
    assert.ok(value.benzin > 0 && value.motorin > 0 && value.lpg > 0, province.name);
  }
});
test('parser selects columns by product, only VAT-inclusive spans, and rejects unavailable cells', () => {
  const table = '<table><thead><tr><th>Şehir</th><th>PO/gaz Otogaz</th><th>V/Max Diesel</th><th>V/Max Kurşunsuz 95</th></tr></thead><tr><td>İZMİR</td><td><span class="without-tax">20</span><span class="with-tax">24,50</span></td><td><span class="without-tax">40</span></td><td><span class="with-tax">—</span></td></tr></table>';
  assert.deepEqual(parsePetrolOfisiTable(table).get('izmir'), { benzin: null, motorin: null, lpg: 24.5 });
  assert.equal(parsePetrolOfisiTable('<html>Access denied</html>').size, 0);
});
test('one live city query fills other cities from the same real catalog with original timestamp', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; return new Response(html); };
  const europe = await fetchProvinceFuelPrices(FUEL_PROVINCES[0]);
  const ankara = await fetchProvinceFuelPrices(FUEL_PROVINCES[2]);
  assert.equal(calls, 1);
  assert.equal(europe.provider, 'Petrol Ofisi'); assert.equal(europe.lpg, 41.2);
  assert.equal(ankara.provider, 'Petrol Ofisi'); assert.equal(ankara.lpg, 41.29);
  assert.equal(ankara.source, 'cache'); assert.equal(ankara.updatedAt, europe.updatedAt);
});
test('simultaneous city requests share the download and retain their own region', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; await new Promise(resolve => setImmediate(resolve)); return new Response(html); };
  const [europe, asia] = await Promise.all(FUEL_PROVINCES.slice(0, 2).map(province => fetchProvinceFuelPrices(province, true)));
  assert.equal(calls, 1); assert.equal(europe.lpg, 41.2); assert.equal(asia.lpg, 40.6);
});
test('PO failure uses an actual Opet quote and never copies another brand LPG into it', async () => {
  global.fetch = async url => url.includes('petrolofisi') ? new Response('blocked', { status: 503 }) : new Response(JSON.stringify([{ provinceCode: '034', districtName: 'BESIKTAS', prices: [{ productCode: 'A100', amount: 77 }, { productCode: 'A121', amount: 98 }] }]));
  const quote = await fetchProvinceFuelPrices(FUEL_PROVINCES[0], true);
  assert.equal(quote.benzin, 77); assert.equal(quote.motorin, 98); assert.equal(quote.provider, 'Opet'); assert.equal(quote.lpg, null);
});
test('real LPG cache survives offline without changing the actual saved time', async () => {
  const updatedAt = Date.now() - 7200000;
  storage.set('finanspulse:fuel-cache:v3:34_avrupa', JSON.stringify({ provider: 'Petrol Ofisi', benzin: 77, motorin: 98, lpg: 42, updatedAt, provinceName: FUEL_PROVINCES[0].name }));
  global.fetch = async () => { throw new Error('offline'); };
  const quote = await fetchProvinceFuelPrices(FUEL_PROVINCES[0], true);
  assert.equal(quote.lpg, 42); assert.equal(quote.updatedAt, updatedAt); assert.equal(quote.isStale, true);
});
test('ASCII and Turkish district spellings match only the correct Istanbul side', () => {
  const data = [{ provinceCode: 34, districtName: 'BESIKTAS', prices: [{ productCode: 'A100', amount: 77 }] }];
  assert.equal(parseFuelPrices(data, FUEL_PROVINCES[0]).benzin, 77);
  assert.equal(parseFuelPrices(data, FUEL_PROVINCES[1]), null);
});
test('discount/increase share a positive magnitude without needing a minus key', () => {
  assert.equal(fuelDeltaText('1,50', 'discount'), '-1,50');
  assert.equal(fuelDeltaText('1,50', 'increase'), '1,50');
  assert.equal(fuelDeltaText('', 'discount'), ''); assert.equal(fuelDeltaText('-1,5', 'discount'), '');
});
