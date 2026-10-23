const { storage } = require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseFuelChanges, fetchFuelChanges } = require('../src/api/fuelChanges.ts');
// Subset of the provider's public JSON retrieved on 2026-10-23, not future predictions.
const now = Date.parse('2026-10-23T12:00:00Z');
const sample = {
  generatedAt: '2026-10-22T11:50:39.608917204Z',
  events: [
    { date: '2026-10-22', fuel: 'gasoline', direction: 'down', delta: -3.3, samplePairs: 25, agreePairs: 25 },
    { date: '2026-10-10', fuel: 'diesel', direction: 'up', delta: 6.4, samplePairs: 23, agreePairs: 23 },
    { date: '2026-10-02', fuel: 'lpg', direction: 'up', delta: 4.71, samplePairs: 15, agreePairs: 15 },
  ],
};
test('provider observations retain actual dates and median deltas; old generation time stays stale', () => {
  const result = parseFuelChanges(sample, now);
  assert.equal(result.events.length, 3);
  assert.equal(result.events[0].fuel, 'benzin');
  assert.equal(result.events[0].delta, -3.3);
  assert.equal(result.stale, true);
  assert.equal(result.generatedAt, Date.parse(sample.generatedAt));
});
test('future, malformed, contradictory and low-consensus events are not confirmed records', () => {
  const row = sample.events[0];
  for (const patch of [{date: '2026-10-24'}, {date: '2026-02-31'}, {direction: 'up'}, {delta: NaN}, {agreePairs: 26}, {agreePairs: 10}, {samplePairs: 2}, {fuel: 'unknown'}]) {
    assert.equal(parseFuelChanges({...sample, events: [{...row, ...patch}]}, now), null);
  }
  assert.equal(parseFuelChanges({...sample, generatedAt: '2026-10-24T00:00:00Z'}, now), null);
  assert.equal(parseFuelChanges({...sample, generatedAt: '2026-01-01T00:00:00Z'}, now), null);
});
test('events are sorted and deduplicated; malformed schema is different from empty history', () => {
  assert.equal(parseFuelChanges({...sample, events: [...sample.events].reverse().concat(sample.events)}, now).events.length, 3);
  assert.equal(parseFuelChanges({...sample, events: []}, now).events.length, 0);
  assert.equal(parseFuelChanges({...sample, events: [{}]}, now), null);
});
test('requests coalesce, respect TTL, and offline data preserves source time instead of claiming no increase', async t => {
  const oldFetch = global.fetch, oldNow = Date.now;
  t.after(() => { global.fetch = oldFetch; Date.now = oldNow; storage.clear(); });
  Date.now = () => now; storage.clear(); let calls = 0;
  global.fetch = async () => { calls++; return new Response(JSON.stringify(sample)); };
  const [a, b] = await Promise.all([fetchFuelChanges(), fetchFuelChanges()]);
  assert.equal(calls, 1); assert.deepEqual(a, b);
  await fetchFuelChanges(); assert.equal(calls, 1);
  global.fetch = async () => { throw new Error('offline'); };
  const cached = await fetchFuelChanges(true);
  assert.equal(cached.error, true); assert.equal(cached.stale, true);
  assert.equal(cached.generatedAt, a.generatedAt); assert.equal(cached.events.length, 3);
  storage.clear(); const empty = await fetchFuelChanges(true);
  assert.equal(empty.error, true); assert.equal(empty.generatedAt, null); assert.deepEqual(empty.events, []);
});
