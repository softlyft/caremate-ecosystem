import type { ConfigContext, ExpoConfig } from 'expo/config';

import appJson from './app.json';

const GOOGLE_SAMPLE_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const GOOGLE_SAMPLE_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

function androidVersionCode(base: ExpoConfig): number {
  const fromEnv = Number.parseInt(process.env.ANDROID_VERSION_CODE ?? '', 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  return base.android?.versionCode ?? 1;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = (appJson.expo ?? config) as ExpoConfig;
  const androidAppId =
    process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID?.trim() || GOOGLE_SAMPLE_ANDROID_APP_ID;
  const iosAppId = process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS?.trim() || GOOGLE_SAMPLE_IOS_APP_ID;

  const plugins: NonNullable<ExpoConfig['plugins']> = [...(base.plugins ?? [])];

  if (!plugins.some((p) => (Array.isArray(p) ? p[0] : p) === 'react-native-google-mobile-ads')) {
    plugins.push([
      'react-native-google-mobile-ads',
      {
        androidAppId,
        iosAppId,
        delayAppMeasurementInit: true,
        userTrackingUsageDescription:
          'This identifier will be used to deliver personalized ads to you.',
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

  return {
    ...base,
    ios: {
      ...base.ios,
      ...(appleTeamId ? { appleTeamId } : {}),
    },
    android: {
      ...base.android,
      versionCode: androidVersionCode(base),
    },
    plugins,
  };
};
