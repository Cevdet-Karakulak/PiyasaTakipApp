require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const original = Module._load;
const links = [];
const Tabs = ({ children, ...props }) => React.createElement('Tabs', props, children);
Tabs.Screen = props => React.createElement('TabScreen', props);
Module._load = function(request, parent, isMain) {
  if (request === 'react-native') return { Platform: { OS: 'ios' }, useColorScheme: () => 'dark',
    View: 'View', Text: 'Text', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator',
    StyleSheet: { create: value => value }, Linking: { openURL: async url => { links.push(url); } } };
  if (request === 'expo-router') return { Tabs };
  if (request === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ bottom: 20 }) };
  if (request === 'lucide-react-native') return new Proxy({}, { get: (_, name) => name });
  if (request === '@/utils/admob') return { recordAdInteraction() {} };
  return original.call(this, request, parent, isMain);
};
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX }, fileName: filename,
}).outputText, filename);
const TabsLayout = require('../src/app/(tabs)/_layout.tsx').default;
const { FuelChangeSummary } = require('../src/components/FuelChangeSummary.tsx');
const flatten = node => typeof node === 'string' ? node : (node?.children ?? []).map(flatten).join(' ');

test('account and settings are a visible sixth tab for every screen, including converter', async () => {
  let view; await act(async () => { view = create(React.createElement(TabsLayout)); });
  const tabs = view.root.findAllByType('TabScreen');
  assert.equal(tabs.length, 6);
  assert.ok(tabs.some(tab => tab.props.name === 'converter'));
  const account = tabs.find(tab => tab.props.name === 'settings');
  assert.equal(account.props.options.title, 'Hesap');
  assert.notEqual(account.props.options.href, null);
  assert.equal(account.props.options.tabBarAccessibilityLabel, 'Hesap ve ayarlar');
  await act(async () => view.unmount());
});
test('observations show historical dates, stale status, attribution and source link without no-increase claims', async () => {
  let view; await act(async () => { view = create(React.createElement(FuelChangeSummary, { report: {
    events: [{id:'2026-10-22:benzin',fuel:'benzin',date:'2026-10-22',delta:-3.3,samplePairs:25,agreePairs:25}],
    generatedAt: Date.parse('2026-10-22T11:50:39Z'), checkedAt: Date.now(), stale:true,error:true,
  } })); });
  const text = flatten(view.toJSON());
  assert.match(text, /22\.10\.2026/); assert.match(text, /3,30 TL/); assert.match(text, /Petrolistan/);
  assert.match(text, /Kaynağa ulaşılamadı/); assert.match(text, /geçmiş değişiklikler/);
  assert.doesNotMatch(text, /zam yok|Zam beklenmiyor|fiyatlar stabil/i);
  await act(async () => view.root.findByProps({accessibilityLabel:'Petrolistan fiyat değişikliklerini aç'}).props.onPress());
  assert.equal(links.at(-1), 'https://petrolistan.com/akaryakit/zam-indirim');
  await act(async () => view.unmount());
});
