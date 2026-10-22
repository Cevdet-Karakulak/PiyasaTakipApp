require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
let dismissals = 0;
let requests = [];
const provinces = require('../src/api/fuelService.ts').FUEL_PROVINCES;
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'react-native') return {
    Platform: { OS: 'ios' }, useColorScheme: () => 'dark', StyleSheet: { create: styles => styles },
    Keyboard: { dismiss: () => { dismissals++; } },
    Text: 'Text', View: 'View', Pressable: 'Pressable', TextInput: 'TextInput',
    ScrollView: 'ScrollView', RefreshControl: 'RefreshControl', ActivityIndicator: 'ActivityIndicator', Linking: { openURL: async () => {} },
  };
  if (request === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
  if (request === 'lucide-react-native') return new Proxy({}, { get: (_, name) => name });
  if (request === '@/api/fuelService') return { FUEL_PROVINCES: provinces,
    fetchProvinceFuelPrices: province => new Promise(resolve => { requests.push({ province, resolve }); }) };
  if (request === '@/api/newsService') return { fetchFuelNews: async () => ({ articles: [], error: false, fetchedAt: Date.now() }), formatTimeAgo: () => 'Az önce' };
  return originalLoad.call(this, request, parent, isMain);
};
require.extensions['.tsx'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
  }, fileName: filename }).outputText;
  module._compile(output, filename);
};
const { FuelCalculator } = require('../src/components/FuelCalculator.tsx');
const FuelScreen = require('../src/app/(tabs)/fuel.tsx').default;
const quote = { benzin: 76.3, motorin: 96.8, lpg: 41.2, provinceName: provinces[0].name, provider: 'Petrol Ofisi', updatedAt: Date.now(), isStale: false, source: 'live' };
const byId = (renderer, id) => renderer.root.findByProps({ testID: id });
const content = (renderer, id) => byId(renderer, id).children.join('');

test('each litre preset changes selection, input, and total on the first press', async () => {
  let renderer;
  await act(async () => { renderer = create(React.createElement(FuelCalculator, { prices: quote })); });
  for (const liters of [30, 40, 60, 50]) {
    await act(async () => byId(renderer, `liters-${liters}`).props.onPress());
    assert.equal(byId(renderer, `liters-${liters}`).props.accessibilityState.selected, true);
    assert.equal(byId(renderer, 'liters-input').props.value, String(liters));
    assert.ok(content(renderer, 'tank-total').includes(new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(liters * 96.8)));
    assert.equal(renderer.root.findAll(node => node.type === 'Pressable' && /^liters-/.test(node.props.testID ?? '') && node.props.accessibilityState.selected).length, 1);
  }
  assert.ok(dismissals >= 4);
  await act(async () => byId(renderer, 'liters-input').props.onChangeText('45,5'));
  assert.equal(renderer.root.findAll(node => node.type === 'Pressable' && /^liters-/.test(node.props.testID ?? '') && node.props.accessibilityState.selected).length, 0);
  await act(async () => renderer.unmount());
});
test('fuel type and discount/increase update calculated results without a negative keyboard key', async () => {
  let renderer;
  await act(async () => { renderer = create(React.createElement(FuelCalculator, { prices: quote })); });
  await act(async () => byId(renderer, 'fuel-lpg').props.onPress());
  assert.equal(content(renderer, 'tank-total'), '2.060,00 TL');
  await act(async () => byId(renderer, 'toggle-change').props.onPress());
  await act(async () => byId(renderer, 'change-input').props.onChangeText('1,50'));
  assert.equal(content(renderer, 'tank-difference'), '75,00 TL daha az');
  assert.ok(content(renderer, 'changed-total').includes('1.985,00'));
  await act(async () => byId(renderer, 'change-increase').props.onPress());
  assert.equal(content(renderer, 'tank-difference'), '75,00 TL daha fazla');
  assert.ok(content(renderer, 'changed-total').includes('2.135,00'));
  await act(async () => renderer.unmount());
});
test('city switches reject late responses and scroll views allow taps with the keyboard open', async () => {
  requests = [];
  let renderer;
  await act(async () => { renderer = create(React.createElement(FuelScreen)); });
  assert.equal(requests.length, 1);
  assert.ok(renderer.root.findAllByType('ScrollView').every(view => view.props.keyboardShouldPersistTaps === 'handled'));
  const cityButtons = renderer.root.findAll(node => node.type === 'Pressable' && node.props.accessibilityState && !node.props.testID);
  await act(async () => cityButtons[1].props.onPress());
  assert.equal(requests.length, 2);
  await act(async () => requests[1].resolve({ ...quote, provinceName: provinces[1].name, motorin: 90 }));
  assert.equal(content(renderer, 'tank-total'), '4.500,00 TL');
  await act(async () => requests[0].resolve(quote));
  assert.equal(content(renderer, 'tank-total'), '4.500,00 TL');
  await act(async () => renderer.unmount());
});
