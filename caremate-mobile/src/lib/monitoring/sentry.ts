import * as Sentry from '@sentry/react-native';

import { config } from '@/constants/env';

let initialized = false;

/**
 * Initialize Sentry once at app start.
 * Always calls `Sentry.init` (even when disabled) so `Sentry.wrap` can finish App Start
 * without warning. Events are only sent when a DSN is set and enabled for this build.
 */
export function initSentry(): void {
  if (initialized) {
    return;
  }

  const enabled = config.isSentryConfigured && (!__DEV__ || config.sentryEnableInDev);

  Sentry.init({
    dsn: config.isSentryConfigured ? config.sentryDsn : undefined,
    environment: config.appEnv,
    release: `caremate@${config.appVersion}`,
    enableAutoSessionTracking: true,
    tracesSampleRate: __DEV__ ? 0 : 0.2,
    sendDefaultPii: false,
    enabled,
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
