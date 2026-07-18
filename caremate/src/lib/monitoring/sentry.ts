import * as Sentry from '@sentry/react-native';

import { config } from '@/constants/env';

let initialized = false;

/** Initialize Sentry once at app start. No-ops when DSN is unset. */
export function initSentry(): void {
  if (initialized || !config.isSentryConfigured) {
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.appEnv,
    release: `caremate@${config.appVersion}`,
    enableAutoSessionTracking: true,
    tracesSampleRate: __DEV__ ? 0 : 0.2,
    sendDefaultPii: false,
    enabled: !__DEV__ || config.sentryEnableInDev,
  });

  initialized = true;
}

export function setSentryUser(user: { id: string; email?: string | null } | null): void {
  if (!config.isSentryConfigured) {
    return;
  }
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!config.isSentryConfigured) {
    if (__DEV__) {
      console.error('[sentry:disabled]', error, context);
    }
    return;
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export { Sentry };
