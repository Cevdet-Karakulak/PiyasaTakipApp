#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseArgs } = require('node:util');

function versionCode(value) {
  if (!/^\d+$/.test(value ?? '')) throw new Error('--version-code pozitif bir tam sayi olmali.');
  const code = Number(value);
  if (!Number.isSafeInteger(code) || code < 1 || code > 2100000000) {
    throw new Error('--version-code 1 ile 2100000000 arasinda olmali.');
  }
  return code;
}

function readCredentials(projectRoot) {
  const file = path.join(projectRoot, 'credentials.json');
  if (!fs.existsSync(file)) throw new Error('credentials.json bulunamadi. EAS credentials ile indirin.');
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch { throw new Error('credentials.json gecerli bir JSON dosyasi olmali.'); }
  const key = data.android?.keystore;
  for (const field of ['keystorePath', 'keystorePassword', 'keyAlias', 'keyPassword']) {
    if (typeof key?.[field] !== 'string' || !key[field].length) {
      throw new Error(`credentials.json: android.keystore.${field} eksik.`);
    }
  }
  const keystore = path.resolve(projectRoot, key.keystorePath);
  if (!fs.existsSync(keystore) || !fs.statSync(keystore).isFile()) {
    throw new Error('credentials.json icinde belirtilen keystore dosyasi bulunamadi.');
  }
  return file;
}

function run(command, args, options) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error || result.signal || result.status !== 0) {
    throw new Error('Komut basarisiz oldu. Yukaridaki ilk hata mesajini kontrol edin.');
  }
}

function gradleBuildCommand() {
  // Limit system-wide pressure, not just the Gradle heap. Native allocations
  // can fail while Java's heap is still below its limit on a 16 GB machine.
  return [
    'gradlew.bat :app:assembleRelease :app:bundleRelease',
    '--init-script ../scripts/android-local-signing.gradle',
    '--no-configuration-cache --no-daemon --no-parallel --max-workers=1',
    '"-Dorg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -XX:ActiveProcessorCount=2 -Dfile.encoding=UTF-8"',
    '-Pkotlin.compiler.execution.strategy=in-process',
    '-PreactNativeArchitectures=armeabi-v7a,arm64-v8a',
  ].join(' ');
}

function main() {
  const { values } = parseArgs({ options: { 'version-code': { type: 'string' } } });
  const code = versionCode(values['version-code']);
  if (process.platform !== 'win32') throw new Error('Bu komut Windows Android derlemesi icindir.');
  const root = path.resolve(__dirname, '..');
  const credentials = readCredentials(root);
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT ||
    (process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'));
  if (!sdk) throw new Error('Android SDK bulunamadi. ANDROID_HOME ayarlayin.');
  for (const component of ['platforms/android-36/android.jar', 'build-tools/36.0.0/aapt2.exe',
    'ndk/27.1.12297006/source.properties']) {
    if (!fs.existsSync(path.join(sdk, component))) throw new Error(`SDK bileseni eksik: ${component}`);
  }
  const env = { ...process.env, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk,
    NODE_ENV: 'production', PIYASA_ANDROID_CREDENTIALS: credentials,
    PIYASA_ANDROID_ROOT: root, PIYASA_ANDROID_VERSION_CODE: String(code),
    PIYASA_ANDROID_LOW_MEMORY: '1' };
  run('java', ['-version'], { cwd: root, env });
  console.log(`Android release hazirlaniyor. versionCode=${code}`);
  console.log('Bellek siniri: Gradle 1 isci, C++ 1 is, Metro 2 isci, Gradle heap 2 GB.');
  run(process.execPath, [require.resolve('expo/bin/cli'), 'prebuild', '--platform', 'android',
    '--no-install'], { cwd: root, env });
  run('cmd.exe', ['/d', '/s', '/c', gradleBuildCommand()],
  { cwd: path.join(root, 'android'), env, windowsVerbatimArguments: true });

  const outputs = [
    ['app/build/outputs/apk/release/app-release.apk', `PiyasaRadari-v${code}.apk`],
    ['app/build/outputs/bundle/release/app-release.aab', `PiyasaRadari-v${code}.aab`],
  ];
  for (const [relative] of outputs) {
    if (!fs.existsSync(path.join(root, 'android', relative))) {
      throw new Error(`Beklenen imzali cikti bulunamadi: ${relative}`);
    }
  }
  const destination = path.join(root, 'artifacts', 'android');
  fs.mkdirSync(destination, { recursive: true });
  for (const [relative, name] of outputs) {
    const file = path.join(destination, name);
    fs.copyFileSync(path.join(root, 'android', relative), file);
    console.log(`Hazir: ${file}`);
  }
}

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { versionCode, readCredentials, gradleBuildCommand };
