const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { withBuildProperties } = require('expo-build-properties');

const projectRoot = path.resolve(__dirname, '..');
const config = require('../app.json').expo;
const template = fs.readFileSync(path.join(__dirname, 'fixtures/ios-sdk57-AppDelegate.swift'), 'utf8');

function configuredPlugin() {
  const entries = config.plugins.filter(p => (Array.isArray(p) ? p[0] : p) === 'expo-build-properties');
  assert.equal(entries.length, 1, 'Scene support must not be shadowed by a duplicate plugin');
  assert.equal(entries[0][1].ios.enableSceneSupport, true);
  return withBuildProperties({ ...config, _internal: { projectRoot } }, entries[0][1]);
}

test('SDK 57 prebuild declares the built-in Expo scene delegate', async () => {
  const plugin = configuredPlugin();
  const output = await plugin.mods.ios.infoPlist({ modResults: {}, modRequest: {} });
  const manifest = output.modResults.UIApplicationSceneManifest;
  assert.equal(manifest.UIApplicationSupportsMultipleScenes, false);
  assert.equal(manifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication[0].UISceneDelegateClassName, 'EXExpoAppSceneDelegate');
});

test('SDK 57 startup transfers window ownership to the scene without dropping bundle or link handlers', async () => {
  const plugin = configuredPlugin();
  const output = await plugin.mods.ios.appDelegate({ modResults: { language: 'swift', contents: template }, modRequest: {} });
  const result = output.modResults.contents;
  assert.match(result, /class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider/);
  assert.doesNotMatch(result, /window = UIWindow\(frame: UIScreen.main.bounds\)/);
  assert.doesNotMatch(result, /factory.startReactNative\(/);
  assert.match(result, /reactNativeFactory = factory/);
  assert.match(result, /Bundle.main.url\(forResource: "main", withExtension: "jsbundle"\)/);
  assert.match(result, /RCTLinkingManager.application\(app, open: url, options: options\)/);
  assert.match(result, /continue userActivity: NSUserActivity/);
  const repeated = await plugin.mods.ios.appDelegate({ modResults: { language: 'swift', contents: result }, modRequest: {} });
  assert.equal(repeated.modResults.contents, result);
});
