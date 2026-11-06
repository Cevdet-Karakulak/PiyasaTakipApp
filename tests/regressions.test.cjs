const { storage } = require('./register.cjs');
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { parseHistory, deriveGoldHistory } = require('../src/utils/history.ts');
const { fetchHistoricalChart, buildGoldQuotes, quoteFromTruncgil, fetchMarketSnapshot } = require('../src/api/marketService.ts');
const { parseFuelPrices, fetchProvinceFuelPrices, FUEL_PROVINCES } = require('../src/api/fuelService.ts');
const { fetchFuelNews, fetchLiveNews } = require('../src/api/newsService.ts');
const { calculateFuelScenario } = require('../src/utils/fuelScenario.ts');
const worker = require('../cloudflare-worker/src/index.ts').default;
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; storage.clear(); });
const series = (values = [3000, 3010, 3020], times = [100, 200, 300]) => ({ timestamp: times, indicators: { quote: [{ close: values }] } });
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const point = (timestamp, value) => ({ timestamp, value });

test('history filters invalid data, sorts timestamps and keeps source gaps', () => {
  assert.deepEqual(parseHistory(series([3, null, 1, NaN, -2, 4], [300, 200, 100, 400, 500, 300])), [point(100000, 1), point(300000, 4)]);
});
test('gold uses the rate at each date, not the current TRY price', () => {
  const gold = deriveGoldHistory([point(100, 3110.34768), point(200, 3110.34768)], [point(100, 30), point(200, 40)], 'GRAM_ALTIN');
  assert.ok(Math.abs(gold[0].value - 3000) < 1e-8); assert.ok(Math.abs(gold[1].value - 4000) < 1e-8);
});
test('gold never uses a future FX observation or an indefinitely old rate', () => {
  assert.deepEqual(deriveGoldHistory([point(100, 3000)], [point(200, 30)], 'GRAM_ALTIN'), []);
  assert.deepEqual(deriveGoldHistory([point(5 * 86400000, 3000)], [point(100, 30)], 'GRAM_ALTIN'), []);
});
test('coin history applies gold weight and purity, not one common scaling ratio', () => {
  const gold = deriveGoldHistory([point(100, 3110.34768)], [point(100, 30)], 'CEYREK_ALTIN');
  assert.ok(Math.abs(gold[0].value - 3000 * 1.754 * 0.9166) < 1e-8);
});
for (const symbol of ['GRAM_ALTIN', 'CEYREK_ALTIN', 'YARIM_ALTIN', 'TAM_ALTIN', 'CUMHURIYET_ALTINI', 'GC=F'])
for (const [range, expectedRange, interval] of [['1d', '1d', '5m'], ['1w', '5d', '15m'], ['1mo', '1mo', '1d'], ['1y', '1y', '1wk']]) {
  test(`gold history ${symbol} ${range} uses the working batch route and historical FX`, async () => {
    const urls = [];
    global.fetch = async (url) => {
      urls.push(new URL(url)); const symbol = new URL(url).searchParams.get('symbols');
      return response({ results: { [symbol]: series(symbol === 'GC=F' ? [3110.34768, 3110.34768, 3110.34768] : [30, 35, 40]) } });
    };
    const points = await fetchHistoricalChart(symbol, range);
    assert.equal(points.length, 3); if (symbol !== 'GC=F') assert.ok(points[2].value > points[0].value);
    assert.equal(urls.length, symbol === 'GC=F' ? 1 : 2);
    assert.ok(urls.every((u) => u.pathname === '/batch' && u.searchParams.get('range') === expectedRange));
    assert.equal(urls.find((u) => u.searchParams.get('symbols') === 'GC=F').searchParams.get('interval'), interval);
    if (symbol !== 'GC=F') assert.equal(urls.find((u) => u.searchParams.get('symbols') === 'USDTRY=X').searchParams.get('interval'), range === '1y' ? '1d' : interval);
  });
}
test('chart falls back to single-symbol endpoint when batch fails', async () => {
  const urls = []; global.fetch = async (url) => { urls.push(url); return url.includes('/batch?') ? response({}, 502) : response({ chart: { result: [series()], error: null } }); };
  assert.equal((await fetchHistoricalChart('THYAO.IS', '1mo')).length, 3);
  assert.equal(urls.length, 2); assert.ok(urls[1].includes('/chart/THYAO.IS'));
});
test('chart errors stay errors and are not cached as empty success', async () => {
  global.fetch = async () => response({}, 503);
  await assert.rejects(fetchHistoricalChart('ASELS.IS', '1y'), /503/);
  global.fetch = async () => response({ results: { 'ASELS.IS': series() } });
  assert.equal((await fetchHistoricalChart('ASELS.IS', '1y')).length, 3);
});
test('concurrent identical chart requests are coalesced', async () => {
  let calls = 0; global.fetch = async () => { calls++; return response({ results: { 'GARAN.IS': series() } }); };
  const [a,b] = await Promise.all([fetchHistoricalChart('GARAN.IS'), fetchHistoricalChart('GARAN.IS')]);
  assert.deepEqual(a,b); assert.equal(calls, 1);
});
test('proxy decodes encoded symbols exactly once before Yahoo encoding', async () => {
  global.caches = { default: { match: async () => null, put: async () => {} } };
  const urls = []; global.fetch = async (url) => { urls.push(url); return response({ chart: { result: [series()], error: null } }); };
  for (const symbol of ['GC=F', 'USDTRY=X', 'THYAO.IS']) {
    const tasks = []; const res = await worker.fetch(new Request(`https://worker.test/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`), {}, { waitUntil: (p) => tasks.push(p) });
    assert.equal(res.status, 200); await Promise.all(tasks);
    const url = new URL(urls.at(-1)); assert.equal(decodeURIComponent(url.pathname.split('/').at(-1)), symbol);
    assert.ok(!url.pathname.includes('%25'));
  }
});
const district = (name, prices, code = 34) => ({ provinceCode: code, districtName: name, prices });
const item = (productCode, amount) => ({ productCode, amount });
test('fuel chooses the matching Istanbul side and never invents LPG', () => {
  const data = [district('KADIKÖY', [item('A100', 50), item('A121', 51)]), district('BEŞİKTAŞ', [item('A100', 52), item('A121', 53)])];
  assert.equal(parseFuelPrices(data, FUEL_PROVINCES[0]).benzin, 52);
  const asian = parseFuelPrices(data, FUEL_PROVINCES[1]);
  assert.equal(asian.benzin, 50); assert.equal(asian.lpg, null); assert.equal(asian.districtName, 'KADIKÖY');
});
test('fuel missing/invalid products stay null; wrong district is rejected', () => {
  assert.equal(parseFuelPrices([district('KADIKÖY', [item('A100', 50)])], FUEL_PROVINCES[0]), null);
  const prices = parseFuelPrices([district('KADIKÖY', [item('A100', -1), item('A121', 55)])], FUEL_PROVINCES[1]);
  assert.equal(prices.benzin, null); assert.equal(prices.motorin, 55);
});
test('offline without real cache returns unknown, not hardcoded pump prices', async () => {
  global.fetch = async () => { throw new Error('offline'); };
  const prices = await fetchProvinceFuelPrices(FUEL_PROVINCES[0]);
  assert.equal(prices.source, 'unavailable'); assert.equal(prices.benzin, null); assert.equal(prices.lpg, null); assert.equal(prices.updatedAt, null);
});
test('offline preserves actual saved time and marks old prices stale', async () => {
  const time = Date.now() - 7200000;
  storage.set('finanspulse:fuel-cache:v2:34_avrupa', JSON.stringify({ benzin: 50, motorin: 52, lpg: null, updatedAt: time, provinceName: FUEL_PROVINCES[0].name }));
  global.fetch = async () => response({}, 503);
  const prices = await fetchProvinceFuelPrices(FUEL_PROVINCES[0], true);
  assert.equal(prices.updatedAt, time); assert.equal(prices.source, 'cache'); assert.equal(prices.isStale, true);
});
test('offline never revives synthetic v1 or >24-hour cached prices', async () => {
  storage.set('finanspulse:fuel-cache:34_avrupa', JSON.stringify({ benzin: 84, lpg: 30, updatedAt: Date.now() }));
  storage.set('finanspulse:fuel-cache:v2:34_avrupa', JSON.stringify({ benzin: 50, motorin: 52, lpg: null, updatedAt: Date.now() - 25 * 3600000, provinceName: FUEL_PROVINCES[0].name }));
  global.fetch = async () => response({}, 503);
  assert.equal((await fetchProvinceFuelPrices(FUEL_PROVINCES[0])).source, 'unavailable');
});
test('scenario distinguishes missing input from explicit zero and allows a discount', () => {
  assert.deepEqual(calculateFuelScenario(50, '50', ''), { currentTotal: 2500, deltaTotal: null, newTotal: null });
  assert.deepEqual(calculateFuelScenario(50, '50', '-1,50'), { currentTotal: 2500, deltaTotal: -75, newTotal: 2425 });
  assert.equal(calculateFuelScenario(50, '50', '0').deltaTotal, 0);
  assert.equal(calculateFuelScenario(null, '50', '-1,5').newTotal, null);
  assert.equal(calculateFuelScenario(50, '', '-1,5').deltaTotal, null);
  assert.equal(calculateFuelScenario(50, '501', '-1,5').currentTotal, null);
  assert.equal(calculateFuelScenario(50, '50', '-100').newTotal, null);
});
const rssItem = (title, date, link = 'https://news.google.com/rss/articles/abc') => `<item><title>${title}</title><link>${link}</link><pubDate>${date}</pubDate></item>`;
test('fuel headlines include discounts with dates, exclude old/invalid/unrelated entries', async () => {
  const xml = '<rss><channel>' + rssItem('Motorine indirim bekleniyor - Yayıncı', new Date().toUTCString()) + rssItem('Benzine zam', 'invalid') + rssItem('Benzine indirim', new Date(Date.now() - 5 * 86400000).toUTCString()) + rssItem('Altın fiyatı arttı', new Date().toUTCString()) + '</channel></rss>';
  global.fetch = async () => new Response(xml);
  const result = await fetchFuelNews();
  assert.equal(result.error, false); assert.equal(result.articles.length, 1); assert.match(result.articles[0].title, /indirim/);
});
test('fuel news failures are unknown, not stable or a fabricated headline', async () => {
  global.fetch = async () => response({}, 503);
  const result = await fetchFuelNews();
  assert.equal(result.error, true); assert.deepEqual(result.articles, []);
});
test('general news offline never returns the old fictional embedded articles', async () => {
  global.fetch = async () => response({}, 503);
  assert.deepEqual(await fetchLiveNews(true), []);
});
test('fuel news still works when one RSS source is blocked', async () => {
  global.fetch = async (url) => url.includes('google.com') ? new Response('<html>blocked</html>') : new Response('<rss>' + rssItem('Benzine indirim beklentisi', new Date().toUTCString(), 'https://www.bloomberght.com/benzin-haberi-1') + '</rss>');
  const result = await fetchFuelNews();
  assert.equal(result.error, false); assert.equal(result.articles.length, 1); assert.equal(result.articles[0].source, 'Bloomberg HT');
});
test('successful empty fuel feeds mean no headline, never no price change', async () => {
  global.fetch = async () => new Response('<rss><channel></channel></rss>');
  const result = await fetchFuelNews();
  assert.equal(result.error, false); assert.deepEqual(result.articles, []);
});

test('all gold types are registered for market list, data and history', () => {
  const { ASSETS, GOLD_SYMBOLS, ASSET_DISPLAY_ORDER, TRUNCGIL_KEY_MAP } = require('../src/api/config.ts');
  const { GOLD_SYMBOL_TO_TYPE, isDerivedGoldSymbol } = require('../src/utils/goldCalculator.ts');
  assert.deepEqual([...GOLD_SYMBOLS].sort(), Object.keys(GOLD_SYMBOL_TO_TYPE).sort());
  for (const symbol of GOLD_SYMBOLS) {
    assert.ok(ASSET_DISPLAY_ORDER.includes(symbol)); assert.equal(ASSETS[symbol].category, 'gold');
    assert.equal(isDerivedGoldSymbol(symbol), true); assert.ok(TRUNCGIL_KEY_MAP[symbol]);
  }
  assert.equal(isDerivedGoldSymbol('GC=F'), false);
  assert.equal(isDerivedGoldSymbol('toString'), false);
});
test('half/full ziynet and Ata have distinct Darphane weights and theoretical values', () => {
  const { calculateGoldPrices, GOLD_SPECS } = require('../src/utils/goldCalculator.ts');
  const values = calculateGoldPrices(3110.34768, 30);
  assert.equal(GOLD_SPECS.ayar22.weightGrams, 1); assert.equal(GOLD_SPECS.ayar22.purity, 0.9166);
  assert.ok(Math.abs(values.ayar22 - values.gram * 0.9166) < 1e-8);
  assert.equal(GOLD_SPECS.yarim.weightGrams, 3.508); assert.equal(GOLD_SPECS.tam.weightGrams, 7.016);
  assert.equal(GOLD_SPECS.cumhuriyet.weightGrams, 7.216); assert.equal(GOLD_SPECS.yarim.purity, 0.9166);
  assert.ok(Math.abs(values.yarim - values.ceyrek * 2) < 1e-8);
  assert.ok(Math.abs(values.tam - values.ceyrek * 4) < 1e-8);
  assert.ok(values.cumhuriyet > values.tam);
  assert.equal(calculateGoldPrices(null, 30), null);
  assert.equal(calculateGoldPrices(3110.34768, NaN), null);
});
test('gold quote fallback creates separate half/full entries and matches chart calculation', () => {
  const q = (price, previousClose) => ({ price, previousClose, marketTime: 100 });
  const quotes = buildGoldQuotes(q(3110.34768, 3000), q(30, 29));
  for (const [symbol, quote] of Object.entries(quotes)) {
    const history = deriveGoldHistory([point(100, 3110.34768)], [point(100, 30)], symbol);
    assert.equal(quote.source, 'calculated'); assert.equal(quote.category, 'gold');
    assert.equal(quote.currency, 'TRY'); assert.equal(quote.price, history[0].value);
    assert.ok(quote.previousClose > 0);
  }
  assert.ok(quotes.YARIM_ALTIN); assert.ok(quotes.TAM_ALTIN); assert.ok(quotes.AYAR22_ALTIN);
  assert.deepEqual(buildGoldQuotes(undefined, q(30, 29)), {});
});
test('half/full Truncgil values are separate; missing values never become another gold type', () => {
  const data = { Update_Date: '2026-10-21 20:00:00', YARIMALTIN: { Selling: 20000, Buying: 19900, Change: 1 }, TAMALTIN: { Selling: 40000, Buying: 39800, Change: 2 } };
  assert.equal(quoteFromTruncgil(data, 'YARIM_ALTIN').price, 20000);
  assert.equal(quoteFromTruncgil(data, 'TAM_ALTIN').price, 40000);
  assert.equal(quoteFromTruncgil(data, 'CEYREK_ALTIN'), null);
});
test('missing retail gold uses Truncgil FX/ons if Yahoo omitted those symbols', async () => {
  global.fetch = async (url) => {
    if (url.includes('truncgil')) return response({ Update_Date: '2026-10-21 20:00:00', ONS: { Selling: 3110.34768 }, USD: { Selling: 30 } });
    if (url.includes('/batch?')) return response({ results: {} });
    return response({}, 503);
  };
  const snapshot = await fetchMarketSnapshot();
  assert.ok(snapshot.quotes.YARIM_ALTIN.price > 0); assert.ok(snapshot.quotes.TAM_ALTIN.price > 0);
  assert.equal(snapshot.quotes.YARIM_ALTIN.source, 'calculated');
});
