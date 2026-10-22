require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
global.__DEV__ = false;
let platform = 'ios';
let iosEnabled = false;
let canRequestAds = true;
let sdkLoads = 0;
let initializes = 0;
let loads = 0;
let destroys = 0;
let throwOnShow = false;
const constants = { executionEnvironment: 'standalone', expoConfig: { extra: {} } };
const events = {};
const sdk = {
  default: () => ({ initialize: async () => { initializes++; } }),
  AdsConsent: { gatherConsent: async () => ({ canRequestAds }) },
  AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
  TestIds: { INTERSTITIAL: 'test-interstitial' },
  InterstitialAd: { createForAdRequest: () => ({
    addAdEventListener: (type, callback) => { events[type] = callback; },
    load: () => { loads++; }, show: () => { if (throwOnShow) throw new Error('destroyed'); return Promise.resolve(); }, destroy: () => { destroys++; },
  }) },
};
Module._load = function (request, parent, isMain) {
  if (request === 'react-native') return { Platform: { OS: platform } };
  if (request === 'expo-constants') {
    constants.expoConfig.extra.iosAdsEnabled = iosEnabled;
    return { __esModule: true, default: constants, ExecutionEnvironment: { StoreClient: 'storeClient' } };
  }
  if (request === 'react-native-google-mobile-ads') { sdkLoads++; return sdk; }
  return originalLoad.call(this, request, parent, isMain);
};
function fresh(os, enabled = false) {
  platform = os; iosEnabled = enabled; sdkLoads = initializes = loads = destroys = 0;
  delete require.cache[require.resolve('../src/utils/admob.ts')];
  return require('../src/utils/admob.ts');
}
test('iOS diagnostic gate never loads or initializes the native ads SDK', async () => {
  const ads = fresh('ios');
  await ads.initAdMob(); ads.recordAdInteraction(); ads.preloadInterstitialAd();
  assert.equal(sdkLoads, 0); assert.equal(initializes, 0); assert.equal(loads, 0);
  assert.equal(require('../app.json').expo.extra.iosAdsEnabled, false);
});
test('Android imports are side-effect free and preloading is blocked until consent', async () => {
  canRequestAds = false;
  const ads = fresh('android');
  assert.equal(sdkLoads, 0);
  ads.preloadInterstitialAd(); assert.equal(loads, 0);
  await ads.initAdMob(); assert.equal(initializes, 0); assert.equal(loads, 0);
});
test('parallel initialization coalesces and initializes once after consent', async () => {
  canRequestAds = true;
  const ads = fresh('android');
  await Promise.all([ads.initAdMob(), ads.initAdMob(), ads.initAdMob()]);
  assert.equal(initializes, 1); assert.equal(loads, 1);
  events.loaded();
  ads.preloadInterstitialAd(); assert.equal(loads, 1);
});
test('v17 synchronous show failures do not escape the tab press handler', async t => {
  const now = Date.now;
  t.after(() => { Date.now = now; throwOnShow = false; });
  canRequestAds = true; throwOnShow = true;
  const ads = fresh('android');
  await ads.initAdMob(); events.loaded();
  Date.now = () => now() + 91_000;
  for (let count = 0; count < 3; count++) assert.doesNotThrow(() => ads.recordAdInteraction());
  assert.equal(destroys, 1);
});
