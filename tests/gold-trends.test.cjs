require('./register.cjs');
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { GOLD_SYMBOLS, TRUNCGIL_KEY_MAP } = require('../src/api/config.ts');
const { deriveGoldDayTrend, istanbulDate } = require('../src/utils/goldTrend.ts');
const { calculateGoldPrices, GOLD_SYMBOL_TO_TYPE } = require('../src/utils/goldCalculator.ts');

const NOW = Date.UTC(2026, 9, 22, 12);
const times = [NOW - 30 * 60_000, NOW - 15 * 60_000, NOW];
const points = values => values.map((value, i) => ({ timestamp: times[i], value }));
const ons = points([3110.34768, 6220.69536, 3110.34768]);
const fx = points([50, 20, 30]);
const raw = values => ({ timestamp: times.map(t => t / 1000), indicators: { quote: [{ close: values }] } });
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const response = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
const freshService = () => {
  delete require.cache[require.resolve('../src/api/marketService.ts')];
  return require('../src/api/marketService.ts');
};
const retail = () => Object.fromEntries(GOLD_SYMBOLS.map((symbol, index) => [TRUNCGIL_KEY_MAP[symbol], {
  Selling: 7000 * (index + 1), Buying: 6990 * (index + 1), Change: 2,
}]));
function sourceFetch({ missingHistory = false, recover = false, failHistory = false } = {}) {
  const calls = [];
  global.fetch = async url => {
    calls.push(url);
    if (url.includes('truncgil')) return response({ Update_Date: '2026-10-22 15:00:00', ...retail() });
    const u = new URL(url);
    const symbols = u.searchParams.get('symbols')?.split(',');
    if (symbols) {
      const result = {};
      for (const symbol of symbols) {
        const base = symbol === 'GC=F' ? [3110.34768, 6220.69536, 3110.34768] : symbol === 'USDTRY=X' ? [50, 20, 30] : [100, 101, 100];
        const recovering = !u.searchParams.get('interval')?.includes('15m');
        if (recovering && failHistory) return response({ results: {} });
        result[symbol] = { meta: { regularMarketPrice: base.at(-1), previousClose: base[0], regularMarketTime: NOW / 1000 },
          ...(!missingHistory || (recovering && recover) ? raw(base) : {}) };
      }
      return response({ results: result });
    }
    throw new Error('source unavailable');
  };
  return calls;
}

test('all five gold trends use matching timestamps and their own purity/weight', () => {
  for (const symbol of GOLD_SYMBOLS) {
    const trend = deriveGoldDayTrend(ons, fx, symbol, NOW);
    assert.equal(trend.sessionDate, '2026-10-22');
    const expected = ons.map((point, i) => calculateGoldPrices(point.value, fx[i].value)[GOLD_SYMBOL_TO_TYPE[symbol]]);
    assert.deepEqual(trend.points.map(p => p.value), expected);
    assert.equal(trend.high, Math.max(...expected));
    assert.equal(trend.low, Math.min(...expected));
  }
  const gram = deriveGoldDayTrend(ons, fx, 'GRAM_ALTIN', NOW);
  assert.ok(Math.abs(gram.high - 5000) < 1e-8);
  assert.ok(Math.abs(gram.low - 3000) < 1e-8);
  // Independent gold and FX maxima occur at different times; multiplying them would invent 10000.
  assert.ok(gram.high < 10000);
});
test('intraday conversion never takes future FX, mismatched indexes, or a stale FX observation', () => {
  const rates = [{ timestamp: times[0] + 1, value: 100 }, ...fx.slice(1)];
  const trend = deriveGoldDayTrend(ons, rates, 'GRAM_ALTIN', NOW);
  assert.deepEqual(trend.points.map(p => p.timestamp), times.slice(1));
  assert.equal(deriveGoldDayTrend(ons, [{ timestamp: times[0] - 31 * 60_000, value: 30 }], 'GRAM_ALTIN', NOW), undefined);
  assert.equal(deriveGoldDayTrend(ons, [{ timestamp: NOW + 1, value: 30 }], 'GRAM_ALTIN', NOW), undefined);
});
test('the previous Istanbul day cannot inflate the daily high/low', () => {
  const midnight = Date.UTC(2026, 9, 21, 21);
  const stamps = [midnight - 60_000, midnight + 60_000, midnight + 16 * 60_000];
  const trend = deriveGoldDayTrend(stamps.map((timestamp, i) => ({ timestamp, value: i ? 3110.34768 : 99999 })),
    stamps.map(timestamp => ({ timestamp, value: 30 })), 'GRAM_ALTIN', midnight + 20 * 60_000);
  assert.equal(istanbulDate(midnight), '2026-10-22');
  assert.equal(trend.sessionDate, '2026-10-22');
  assert.equal(trend.points.length, 2);
  assert.ok(Math.abs(trend.high - 3000) < 1e-8);
});
test('one observation, invalid values, and mismatched sessions never become a fabricated chart', () => {
  assert.equal(deriveGoldDayTrend(ons.slice(0, 1), fx, 'GRAM_ALTIN', NOW), undefined);
  assert.equal(deriveGoldDayTrend(points([null, NaN, -5]), fx, 'GRAM_ALTIN', NOW), undefined);
  const duplicate = [{ timestamp: times[0], value: 3110.34768 }, { timestamp: times[0], value: 3111 }];
  assert.equal(deriveGoldDayTrend(duplicate, fx, 'GRAM_ALTIN', NOW), undefined);
  assert.equal(deriveGoldDayTrend(ons, fx, 'GRAM_ALTIN', NOW + 5 * 86_400_000), undefined);
});
test('recent previous sessions retain their actual date and future samples are discarded', () => {
  const trend = deriveGoldDayTrend([...ons, { timestamp: NOW + 3 * 86_400_000, value: 99999 }], fx,
    'GRAM_ALTIN', NOW + 2 * 86_400_000);
  assert.equal(trend.sessionDate, '2026-10-22');
  assert.equal(trend.points.length, 3);
});
test('snapshot populates every gold mini chart from existing batch data without changing retail prices', async t => {
  t.mock.method(Date, 'now', () => NOW);
  const calls = sourceFetch();
  const service = freshService();
  const snapshot = await service.fetchMarketSnapshot();
  const onlyRetail = retail();
  for (const symbol of GOLD_SYMBOLS) {
    const quote = snapshot.quotes[symbol];
    const original = service.quoteFromTruncgil({ Update_Date: '2026-10-22 15:00:00', ...onlyRetail }, symbol);
    for (const key of ['price', 'bid', 'ask', 'change', 'changePercent', 'previousClose', 'source', 'marketTime']) {
      assert.equal(quote[key], original[key], `${symbol}.${key} must remain the original retail quote`);
    }
    assert.equal(quote.dayHigh, null); assert.equal(quote.dayLow, null);
    assert.equal(quote.goldTrend.sessionDate, '2026-10-22');
    assert.equal(quote.sparkline.length, 3);
    assert.deepEqual(quote.sparkline, quote.goldTrend.points.map(p => p.value));
  }
  assert.ok(calls.every(url => !url.includes('interval=5m')), 'complete batch needs no extra chart request');
});
test('missing batch timestamps recover two shared histories, not ten per-gold requests', async t => {
  t.mock.method(Date, 'now', () => NOW);
  const calls = sourceFetch({ missingHistory: true, recover: true });
  const snapshot = await freshService().fetchMarketSnapshot();
  for (const symbol of GOLD_SYMBOLS) assert.equal(snapshot.quotes[symbol].sparkline.length, 3);
  const recovery = calls.filter(url => url.includes('interval=5m'));
  assert.equal(recovery.length, 2);
  assert.deepEqual(recovery.map(url => new URL(url).searchParams.get('symbols')).sort(), ['GC=F', 'USDTRY=X']);
});
test('history failure leaves valid retail prices usable and never manufactures range or trend', async t => {
  t.mock.method(Date, 'now', () => NOW);
  sourceFetch({ missingHistory: true, failHistory: true });
  const snapshot = await freshService().fetchMarketSnapshot();
  for (const symbol of GOLD_SYMBOLS) {
    const quote = snapshot.quotes[symbol];
    assert.ok(quote.price > 0); assert.equal(quote.source, 'truncgil');
    assert.equal(quote.goldTrend, undefined); assert.deepEqual(quote.sparkline, []);
    assert.equal(quote.dayHigh, null); assert.equal(quote.dayLow, null);
  }
  assert.ok(snapshot.warnings.some(text => text.includes('günlük grafik')));
});
