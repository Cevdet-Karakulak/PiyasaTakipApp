const fs = require('fs');
const path = require('path');

const appJsonGradlePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-google-mobile-ads',
  'android',
  'app-json.gradle'
);

if (fs.existsSync(appJsonGradlePath)) {
  let content = fs.readFileSync(appJsonGradlePath, 'utf8');
  if (content.includes('rootProject.ext.googleAdsJson = false')) {
    content = content.replace(
      'rootProject.ext.googleAdsJson = false',
      'rootProject.ext.googleMobileAdsJson = false'
    );
    fs.writeFileSync(appJsonGradlePath, content, 'utf8');
    console.log('[patch-admob-gradle] Fixed googleMobileAdsJson typo in app-json.gradle');
  }
}

const buildGradlePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-google-mobile-ads',
  'android',
  'build.gradle'
);

if (fs.existsSync(buildGradlePath)) {
  let content = fs.readFileSync(buildGradlePath, 'utf8');

  if (content.includes('(rootProject.ext.googleMobileAdsJson')) {
    content = content.replace(
      '(rootProject.ext.googleMobileAdsJson',
      '(rootProject.ext.has("googleMobileAdsJson") && rootProject.ext.googleMobileAdsJson'
    );
  }

  if (!content.includes('compileSdk getExtOrDefault')) {
    content = content.replace(
      /android\s*\{\s*\r?\n\s*defaultConfig\s*\{/,
      'android {\n  namespace "io.invertase.googlemobileads"\n  compileSdk getExtOrDefault("compileSdkVersion", jsonCompileSdk as int)\n  defaultConfig {\n    minSdk getExtOrDefault("minSdkVersion", jsonMinSdk as int)\n    targetSdk getExtOrDefault("targetSdkVersion", jsonTargetSdk as int)'
    );
  }

  fs.writeFileSync(buildGradlePath, content, 'utf8');
  console.log('[patch-admob-gradle] Patched react-native-google-mobile-ads/android/build.gradle');
}
