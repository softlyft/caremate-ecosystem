import type { ConfigContext, ExpoConfig } from 'expo/config';

import appJson from './app.json';

const GOOGLE_SAMPLE_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const GOOGLE_SAMPLE_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
const GOOGLE_SAMPLE_ADMOB_PREFIX = 'ca-app-pub-3940256099942544';

function androidVersionCode(base: ExpoConfig): number {
  const fromEnv = Number.parseInt(process.env.ANDROID_VERSION_CODE ?? '', 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  return base.android?.versionCode ?? 1;
}

function requireLiveAdMobAppId(platform: 'android' | 'ios', value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    throw new Error(
      `EXPO_PUBLIC_ADMOB_APP_ID_${platform.toUpperCase()} is required when EXPO_PUBLIC_APP_ENV=production`,
    );
  }
  if (trimmed.startsWith(GOOGLE_SAMPLE_ADMOB_PREFIX)) {
    throw new Error(
      `EXPO_PUBLIC_ADMOB_APP_ID_${platform.toUpperCase()} must not use Google sample IDs in production`,
    );
  }
  return trimmed;
}

function productionAssociatedDomains(domains: string[] | undefined): string[] | undefined {
  if (!domains?.length) return domains;
  return domains.filter(
    (domain) => domain === 'applinks:getcaremate.com' || domain === 'applinks:www.getcaremate.com',
  );
}

function asDataList(
  data: NonNullable<NonNullable<ExpoConfig['android']>['intentFilters']>[number]['data'],
): Array<Record<string, unknown>> {
  if (!data) return [];
  return (Array.isArray(data) ? data : [data]) as Array<Record<string, unknown>>;
}

function productionIntentFilters(
  filters: NonNullable<ExpoConfig['android']>['intentFilters'],
): NonNullable<ExpoConfig['android']>['intentFilters'] {
  if (!filters?.length) return filters;
  return filters.map((filter) => {
    const data = asDataList(filter.data).filter((entry) => {
      const host = typeof entry.host === 'string' ? entry.host : undefined;
      return host === 'getcaremate.com' || host === 'www.getcaremate.com';
    });
    return {
      ...filter,
      data,
    };
  });
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = (appJson.expo ?? config) as ExpoConfig;
  const isProductionAppEnv =
    (process.env.EXPO_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? '').trim() === 'production';
  const androidAppId = isProductionAppEnv
    ? requireLiveAdMobAppId('android', process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID)
    : GOOGLE_SAMPLE_ANDROID_APP_ID;
  const iosAppId = isProductionAppEnv
    ? requireLiveAdMobAppId('ios', process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS)
    : GOOGLE_SAMPLE_IOS_APP_ID;

  const plugins: NonNullable<ExpoConfig['plugins']> = [...(base.plugins ?? [])];

  if (!plugins.some((p) => (Array.isArray(p) ? p[0] : p) === 'react-native-google-mobile-ads')) {
    plugins.push([
      'react-native-google-mobile-ads',
      {
        androidAppId,
        iosAppId,
        delayAppMeasurementInit: true,
        // Runtime requests non-personalized ads only (see domains/ads/consent.ts).
        userTrackingUsageDescription:
          'This identifier may be used to measure ad performance and keep ads relevant. CareMate requests non-personalized ads.',
      },
    ]);
  }

  if (!plugins.some((p) => (Array.isArray(p) ? p[0] : p) === 'expo-build-properties')) {
    plugins.push([
      'expo-build-properties',
      {
        android: {
          // Expo 57 ships Kotlin 2.1.x; keep Ads SDK aligned via package pin (see package.json).
          extraProguardRules: '-keep class com.google.android.gms.internal.consent_sdk.** { *; }',
        },
      },
    ]);
  }

  if (!plugins.some((p) => (Array.isArray(p) ? p[0] : p) === 'expo-localization')) {
    plugins.push('expo-localization');
  }

  if (!plugins.some((p) => (Array.isArray(p) ? p[0] : p) === 'expo-iap')) {
    plugins.push('expo-iap');
  }

  if (
    !plugins.some((p) => {
      const name = Array.isArray(p) ? p[0] : p;
      return name === '@sentry/react-native' || name === '@sentry/react-native/expo';
    })
  ) {
    plugins.push([
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io/',
        organization: process.env.SENTRY_ORG ?? 'softlyft',
        project: process.env.SENTRY_PROJECT ?? 'caremate',
        // Auth token via SENTRY_AUTH_TOKEN env / CI secret — never embed in config.
      },
    ]);
  }

  const appleTeamId = process.env.EXPO_APPLE_TEAM_ID?.trim();

  const { associatedDomains: _associatedDomains, ...iosWithoutAssociatedDomains } = base.ios ?? {};
  const { intentFilters: _intentFilters, ...androidWithoutIntentFilters } = base.android ?? {};

  return {
    ...base,
    ios: {
      ...iosWithoutAssociatedDomains,
      ...(appleTeamId ? { appleTeamId } : {}),
      // Associated domains require a signing team even for Simulator builds.
      // Keep them production-only so local `expo run:ios` works unsigned.
      ...(isProductionAppEnv
        ? { associatedDomains: productionAssociatedDomains(base.ios?.associatedDomains) }
        : {}),
    },
    android: {
      ...androidWithoutIntentFilters,
      versionCode: androidVersionCode(base),
      ...(isProductionAppEnv
        ? { intentFilters: productionIntentFilters(base.android?.intentFilters) }
        : {}),
    },
    plugins,
  };
};
