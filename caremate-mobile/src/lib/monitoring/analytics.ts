import type { PostHogEventProperties } from '@posthog/core';
import type { PostHog } from 'posthog-react-native';
import { InteractionManager } from 'react-native';

import { config } from '@/constants/env';
import {
  bindAnalyticsSender,
  enqueueAnalyticsEvent,
  flushAnalyticsQueue,
  requestAnalyticsFlush,
} from '@/lib/monitoring/analytics-queue';

type AnalyticsProps = Record<string, string | number | boolean | null>;

let client: PostHog | null = null;

/** Called from PostHogProvider once the SDK is ready. */
export function bindPostHogClient(instance: PostHog | null): void {
  client = instance;
  if (!instance) {
    bindAnalyticsSender(null);
    return;
  }
  bindAnalyticsSender({
    capture: (event, properties) => {
      instance.capture(event, properties as PostHogEventProperties | undefined);
    },
    screen: (name, properties) => {
      return instance.screen(name, properties as PostHogEventProperties | undefined);
    },
  });
  void flushAnalyticsQueue();
}

export function isAnalyticsEnabled(): boolean {
  return config.isPostHogConfigured && (!__DEV__ || config.posthogEnableInDev);
}

export function identifyAnalyticsUser(user: {
  id: string;
  email?: string | null;
  isGuest?: boolean;
}): void {
  if (!isAnalyticsEnabled() || !client) {
    return;
  }
  if (user.isGuest) {
    client.reset();
    return;
  }
  const traits: PostHogEventProperties = {};
  if (user.email) {
    traits.email = user.email;
  }
  client.identify(user.id, traits);
}

export function resetAnalytics(): void {
  if (!client) {
    return;
  }
  client.reset();
}

/**
 * Persist to the SQLite analytics outbox, then flush when online.
 * Safe to call before PostHog is bound — events drain once the SDK is ready.
 */
export function trackEvent(event: string, properties?: AnalyticsProps): void {
  if (!isAnalyticsEnabled()) {
    return;
  }
  void enqueueAnalyticsEvent({ kind: 'event', name: event, properties }).catch(() => {
    // Outbox must never break product flows.
  });
}

export function trackScreen(screenName: string, properties?: AnalyticsProps): void {
  if (!isAnalyticsEnabled()) {
    return;
  }
  // Defer SQLite outbox writes so navigation transitions stay on the JS thread.
  InteractionManager.runAfterInteractions(() => {
    void enqueueAnalyticsEvent({ kind: 'screen', name: screenName, properties }).catch(() => {
      // Outbox must never break product flows.
    });
  });
}

/** Expose flush for sync-engine reconnect / tests. */
export { flushAnalyticsQueue, requestAnalyticsFlush };

/** Stable product event names used across the app. */
export const AnalyticsEvents = {
  signIn: 'auth_sign_in',
  signUp: 'auth_sign_up',
  signOut: 'auth_sign_out',
  deleteAccount: 'auth_delete_account',
  onboardingComplete: 'onboarding_complete',
  checkoutStart: 'billing_checkout_start',
  checkoutSuccess: 'billing_checkout_success',
  familyRequestSent: 'family_request_sent',
} as const;
