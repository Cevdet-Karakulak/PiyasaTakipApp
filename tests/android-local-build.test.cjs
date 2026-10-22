const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { versionCode, readCredentials } = require('../scripts/build-android-windows.cjs');

test('local Android release requires an explicit Play-compatible version code', () => {
  for (const value of [undefined, '', '0', '-1', '1.5', 'NaN', '2100000001']) {
    assert.throws(() => versionCode(value));
  }
  assert.equal(versionCode('6'), 6);
  assert.equal(versionCode('2100000000'), 2100000000);
});

test('EAS credentials are validated without exposing passwords in errors', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'piyasa-signing-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'credentials.json');
  assert.throws(() => readCredentials(root), /bulunamadi/);
  fs.writeFileSync(file, '{"password":"private-test-value",');
  assert.throws(() => readCredentials(root), error => !error.message.includes('private-test-value'));
  const key = { keystorePath: './credentials/upload.jks', keystorePassword: "special'\\$value",
    keyAlias: 'upload', keyPassword: 'secret\nvalue' };
  fs.writeFileSync(file, JSON.stringify({ android: { keystore: key } }));
  assert.throws(() => readCredentials(root), /keystore dosyasi bulunamadi/);
  fs.mkdirSync(path.join(root, 'credentials'));
  fs.writeFileSync(path.join(root, key.keystorePath), 'test-keystore');
  assert.equal(readCredentials(root), file);
  fs.writeFileSync(file, '\uFEFF' + JSON.stringify({ android: { keystore: key } }));
  assert.equal(readCredentials(root), file);
  delete key.keyPassword;
  fs.writeFileSync(file, JSON.stringify({ android: { keystore: key } }));
  assert.throws(() => readCredentials(root), /keyPassword eksik/);
});
