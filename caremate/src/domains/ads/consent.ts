import { Platform } from 'react-native';

let consentReady = false;
let canRequest = false;
let initStarted = false;

type AdsConsentModule = typeof import('react-native-google-mobile-ads').AdsConsent;
type MobileAdsModule = typeof import('react-native-google-mobile-ads').default;

async function loadAdsModules(): Promise<{
  AdsConsent: AdsConsentModule;
  mobileAds: MobileAdsModule;
} | null> {
  try {
    const mod = await import('react-native-google-mobile-ads');
    return { AdsConsent: mod.AdsConsent, mobileAds: mod.default };
  } catch {
    return null;
  }
}

/** Gather UMP consent and initialize the Mobile Ads SDK. Safe to call multiple times. */
export async function initializeAdsConsentAndSdk(): Promise<void> {
  if (initStarted) {
    // Wait for the in-flight init so callers can invalidate ads after consent is ready.
    while (initStarted && !consentReady) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return;
  }
  initStarted = true;

  const modules = await loadAdsModules();
  if (!modules) {
    // Mark ready so resolvers stop waiting; ads simply cannot request.
    consentReady = true;
    canRequest = false;
    return;
  }

  const { AdsConsent, mobileAds } = modules;

  try {
    const info = await AdsConsent.gatherConsent();
    canRequest = info.canRequestAds;
    if (canRequest) {
      await mobileAds().initialize();
    }
  } catch {
    canRequest = false;
  } finally {
    consentReady = true;
  }
}

export function isAdsConsentReady(): boolean {
  return consentReady;
}

export async function canRequestAds(): Promise<boolean> {
  if (!consentReady) {
    return false;
  }
  return canRequest;
}

/** Non-personalized by default per ads strategy. */
export function getAdMobRequestOptions(): {
  requestNonPersonalizedAdsOnly: boolean;
} {
  return {
    requestNonPersonalizedAdsOnly: true,
  };
}

/** iOS banners should reload when app returns to foreground. */
export function shouldReloadBannerOnForeground(): boolean {
  return Platform.OS === 'ios';
}

/** Reset state for tests. */
export function resetAdsConsentStateForTests(): void {
  consentReady = false;
  canRequest = false;
  initStarted = false;
}
