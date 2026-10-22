require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'react-native') return {
    Platform: { OS: 'android' }, Dimensions: { get: () => ({ width: 390, height: 844 }) },
    useColorScheme: () => 'dark', useWindowDimensions: () => ({ width: 390 }), StyleSheet: { create: value => value },
    Text: 'Text', View: 'View', Pressable: 'Pressable', TextInput: 'TextInput', ScrollView: 'ScrollView', Modal: 'Modal',
  };
  if (request === 'lucide-react-native') return new Proxy({}, { get: (_, name) => name });
  if (request === '@/components/MiniSparkline') return { MiniSparkline: 'MiniSparkline' };
  if (request === '@/components/PriceChart') return { PriceChart: 'PriceChart' };
  if (request === '@/api/marketService') return { fetchHistoricalChart: async (_, range) => range === '1y'
    ? [{ timestamp: 1, value: 100 }, { timestamp: 2, value: 999999 }]
    : [{ timestamp: 1, value: 3000 }, { timestamp: 2, value: 5000 }] };
  return originalLoad.call(this, request, parent, isMain);
};
require.extensions['.tsx'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
  }, fileName: filename }).outputText;
  module._compile(output, filename);
};
const { AssetCard } = require('../src/components/AssetCard.tsx');
const { AssetDetailModal } = require('../src/components/AssetDetailModal.tsx');
const { ASSETS, GOLD_SYMBOLS } = require('../src/api/config.ts');
const quote = symbol => ({ ...ASSETS[symbol], symbol, price: 7000, previousClose: 6900, change: 100, changePercent: 2,
  dayHigh: null, dayLow: null, bid: 6990, ask: 7000, source: 'truncgil', marketTime: Date.now(), isStale: false,
  sparkline: [5000, 4000, 3000], goldTrend: { sessionDate: '2026-10-22', high: 5000, low: 3000,
    points: [{ timestamp: 1, value: 5000 }, { timestamp: 2, value: 4000 }, { timestamp: 3, value: 3000 }] } });
const text = (renderer, testID) => renderer.root.findByProps({ testID }).children.join('');

test('every gold card renders the real derived series and colors its own direction', async () => {
  for (const symbol of GOLD_SYMBOLS) {
    let renderer;
    await act(async () => { renderer = create(React.createElement(AssetCard, { quote: quote(symbol), onPress() {} })); });
    const mini = renderer.root.findByType('MiniSparkline');
    assert.deepEqual(mini.props.data, [5000, 4000, 3000]);
    assert.equal(mini.props.isPositive, false, 'positive retail change must not recolor a falling theoretical trend');
    assert.match(renderer.root.findByProps({ testID: `trend-${symbol}` }).props.accessibilityLabel, /Teorik/);
    await act(async () => renderer.unmount());
  }
});
test('gold daily high/low remain daily when switching the displayed chart to a year', async () => {
  let renderer;
  await act(async () => { renderer = create(React.createElement(AssetDetailModal, { quote: quote('GRAM_ALTIN'), visible: true, onClose() {} })); });
  assert.match(text(renderer, 'day-high'), /5\.000,00/);
  assert.match(text(renderer, 'day-low'), /3\.000,00/);
  assert.match(text(renderer, 'gold-day-range-note'), /22\.10\.2026.*teorik/);
  const year = renderer.root.findAllByType('Pressable').find(button => button.findAllByType('Text').some(node => node.children.join('') === '1Y'));
  await act(async () => year.props.onPress());
  assert.equal(renderer.root.findByType('PriceChart').props.points.at(-1).value, 999999);
  assert.match(text(renderer, 'day-high'), /5\.000,00/);
  assert.match(text(renderer, 'day-low'), /3\.000,00/);
  await act(async () => renderer.unmount());
});
test('provider-reported day range takes priority and missing data stays unknown', async () => {
  let renderer;
  const q = { ...quote('GRAM_ALTIN'), dayHigh: 7100, dayLow: 6800 };
  await act(async () => { renderer = create(React.createElement(AssetDetailModal, { quote: q, visible: true, onClose() {} })); });
  assert.match(text(renderer, 'day-high'), /7\.100,00/);
  assert.match(text(renderer, 'day-low'), /6\.800,00/);
  assert.equal(renderer.root.findAllByProps({ testID: 'gold-day-range-note' }).length, 0);
  await act(async () => renderer.update(React.createElement(AssetDetailModal, {
    quote: { ...q, dayHigh: null, dayLow: null, goldTrend: undefined, sparkline: [] }, visible: true, onClose() {},
  })));
  assert.equal(text(renderer, 'day-high'), '—'); assert.equal(text(renderer, 'day-low'), '—');
  await act(async () => renderer.unmount());
});
