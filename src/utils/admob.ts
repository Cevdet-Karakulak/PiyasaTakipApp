import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const ADMOB_CONFIG = {
  androidAppId: 'ca-app-pub-9426623468970945~8428164597',
  iosAppId: 'ca-app-pub-9426623468970945~6133173748',
  androidInterstitialUnitId: 'ca-app-pub-9426623468970945/5509612352',
  iosInterstitialUnitId: 'ca-app-pub-9426623468970945/4397420245',
} as const;

// Google AdMob politikası gereği minimum bekleme süresi ve etkileşim eşiği
const MIN_INTERSTITIAL_COOLDOWN_MS = 90 * 1000; // 90 saniye
const INTERACTIONS_BEFORE_AD = 3;

let isInitialized = false;
let isAdLoaded = false;
let isAdLoading = false;
let lastAdShownAt = 0;
let interactionCount = 0;
let interstitialInstance: {
  load: () => void;
  show: () => Promise<void>;
} | null = null;

function isNativeAdsSupported(): boolean {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }
  // Expo Go içinde özel native modüller bulunmadığı için güvenli şekilde devre dışı bırakılır
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return false;
  }
  return true;
}

export async function initAdMob(): Promise<void> {
  if (isInitialized || !isNativeAdsSupported()) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mobileAdsModule = require('react-native-google-mobile-ads');
    const mobileAds = mobileAdsModule.default;
    if (typeof mobileAds === 'function') {
      await mobileAds().initialize();
      isInitialized = true;
      preloadInterstitialAd();
    }
  } catch {
    // Web veya Expo Go ortamında sessizce geç
  }
}

export function preloadInterstitialAd(): void {
  if (!isNativeAdsSupported() || isAdLoading || isAdLoaded) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { InterstitialAd, AdEventType, TestIds } = require('react-native-google-mobile-ads');

    const unitId = __DEV__
      ? TestIds.INTERSTITIAL
      : Platform.OS === 'ios'
        ? ADMOB_CONFIG.iosInterstitialUnitId
        : ADMOB_CONFIG.androidInterstitialUnitId;

    const interstitial = InterstitialAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    isAdLoading = true;

    interstitial.addAdEventListener(AdEventType.LOADED, () => {
      isAdLoaded = true;
      isAdLoading = false;
    });

    interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      isAdLoaded = false;
      isAdLoading = false;
      interstitialInstance = null;
      // Kapatıldıktan sonra bir sonraki geçiş için arka planda yeni reklam hazırla
      setTimeout(() => {
        preloadInterstitialAd();
      }, 1500);
    });

    interstitial.addAdEventListener(AdEventType.ERROR, () => {
      isAdLoaded = false;
      isAdLoading = false;
      interstitialInstance = null;
    });

    interstitialInstance = interstitial;
    interstitial.load();
  } catch {
    isAdLoading = false;
  }
}

/**
 * Sekme değişimi veya önemli ekran etkileşimlerinde çağrılır.
 * Her 3 geçişte bir (ve en az 90 saniye arayla) hazır olan geçiş reklamını gösterir.
 */
export function recordAdInteraction(): void {
  if (!isNativeAdsSupported()) {
    return;
  }

  interactionCount += 1;

  if (!isAdLoaded && !isAdLoading) {
    preloadInterstitialAd();
    return;
  }

  const now = Date.now();
  if (
    interactionCount >= INTERACTIONS_BEFORE_AD &&
    isAdLoaded &&
    interstitialInstance &&
    now - lastAdShownAt >= MIN_INTERSTITIAL_COOLDOWN_MS
  ) {
    interactionCount = 0;
    lastAdShownAt = now;
    interstitialInstance.show().catch(() => {
      isAdLoaded = false;
      interstitialInstance = null;
    });
  }
}
