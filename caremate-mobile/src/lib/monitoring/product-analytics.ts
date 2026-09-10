import { Platform } from 'react-native';

import { config } from '@/constants/env';
import type { MiniAppId } from '@/mini-apps/_kit/registry';
import { trackEvent } from '@/lib/monitoring/analytics';

/**
 * PostHog v1 product events.
 * Spec: caremate-mobile/docs/posthog-analytics.md
 *
 * `caremate_active` is the only qualifying event for WAU, MAU, D7, and D30.
 * Do not put health values, names, contact details, or message text in properties.
 */

export const ProductEvents = {
  caremateActive: 'caremate_active',
  appOpened: 'app_opened',
  userSignedUp: 'user_signed_up',
  onboardingStarted: 'onboarding_started',
  onboardingCompleted: 'onboarding_completed',
  miniAppViewed: 'mini_app_viewed',
  miniAppStarted: 'mini_app_started',
  miniAppUsed: 'mini_app_used',
  miniAppCompleted: 'mini_app_completed',
  emergencyProfileViewed: 'emergency_profile_viewed',
  emergencyProfileCompleted: 'emergency_profile_completed',
  emergencyProfileShared: 'emergency_profile_shared',
  learningOpened: 'learning_opened',
  learningContentViewed: 'learning_content_viewed',
  learningContentCompleted: 'learning_content_completed',
  nearbyOpened: 'nearby_opened',
  nearbySearch: 'nearby_search',
  nearbyResultViewed: 'nearby_result_viewed',
  nearbyEntitySelected: 'nearby_entity_selected',
  messagingOpened: 'messaging_opened',
  conversationStarted: 'conversation_started',
  messageSent: 'message_sent',
  broadcastViewed: 'broadcast_viewed',
  familyOpened: 'family_opened',
  familyMemberAdded: 'family_member_added',
  familyInvitationSent: 'family_invitation_sent',
  familyInvitationAccepted: 'family_invitation_accepted',
  familyMemberViewed: 'family_member_viewed',
  providerSearched: 'provider_searched',
  providerViewed: 'provider_viewed',
  providerConnectionStarted: 'provider_connection_started',
  providerConnectionCompleted: 'provider_connection_completed',
  payerSearched: 'payer_searched',
  payerViewed: 'payer_viewed',
  payerConnectionStarted: 'payer_connection_started',
  payerConnectionCompleted: 'payer_connection_completed',
} as const;

export type NearbyEntityType = 'provider' | 'payer' | 'pharmacy' | 'laboratory' | 'hospital';

type AnalyticsValue = string | number | boolean | null;
type AnalyticsProps = Record<string, AnalyticsValue>;

type ActivityType = 'feature_used' | 'content_viewed' | 'connection_completed';

const VITAL_ACTIONS: Record<string, string> = {
  blood_pressure: 'blood_pressure_recorded',
  blood_sugar: 'blood_glucose_recorded',
  heart_rate: 'heart_rate_recorded',
  weight: 'weight_recorded',
};

let sessionId = createSessionId();
let context: { country: string | null; language: string | null } = {
  country: null,
  language: null,
};
const onceKeys = new Set<string>();

/** Clears session-scoped dedupe. Used by unit tests. */
export function resetProductAnalyticsForTests(): void {
  onceKeys.clear();
  sessionId = createSessionId();
}

function createSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function setProductAnalyticsContext(next: {
  country?: string | null;
  language?: string | null;
}): void {
  context = {
    country: next.country?.trim() || context.country,
    language: next.language?.trim() || context.language,
  };
}

function baseProps(): AnalyticsProps {
  return {
    country: context.country ?? 'unknown',
    language: context.language ?? 'unknown',
    app_version: config.appVersion,
    platform: Platform.OS,
  };
}

function track(name: string, properties?: AnalyticsProps): void {
  trackEvent(name, {
    ...baseProps(),
    ...properties,
  });
}

function trackOnce(key: string, emit: () => void): void {
  if (onceKeys.has(key)) {
    return;
  }
  onceKeys.add(key);
  emit();
}

export function trackCaremateActive(params: {
  activityType: ActivityType;
  feature: string;
  surface: string;
}): void {
  track(ProductEvents.caremateActive, {
    activity_type: params.activityType,
    feature: params.feature,
    surface: params.surface,
  });
}

export function trackAppOpened(): void {
  if (onceKeys.has('app_opened')) {
    return;
  }
  onceKeys.add('app_opened');
  track(ProductEvents.appOpened, { session_id: sessionId });
}

export function trackUserSignedUp(signupMethod: 'email' | 'phone'): void {
  track(ProductEvents.userSignedUp, { signup_method: signupMethod });
}

export function trackOnboardingStarted(): void {
  trackOnce('onboarding_started', () => {
    track(ProductEvents.onboardingStarted);
  });
}

export function trackOnboardingCompleted(): void {
  track(ProductEvents.onboardingCompleted);
}

export function trackMiniAppViewed(miniApp: MiniAppId): void {
  trackOnce(`mini_app_viewed:${miniApp}`, () => {
    track(ProductEvents.miniAppViewed, { mini_app: miniApp });
  });
}

export function trackMiniAppStarted(miniApp: MiniAppId): void {
  track(ProductEvents.miniAppStarted, { mini_app: miniApp });
}

export function trackMiniAppUsed(miniApp: MiniAppId, action: string): void {
  track(ProductEvents.miniAppUsed, { mini_app: miniApp, action });
  trackCaremateActive({
    activityType: 'feature_used',
    feature: miniApp,
    surface: 'mini_app',
  });
}

export function trackMiniAppCompleted(miniApp: MiniAppId): void {
  track(ProductEvents.miniAppCompleted, { mini_app: miniApp });
  trackCaremateActive({
    activityType: 'feature_used',
    feature: miniApp,
    surface: 'mini_app',
  });
}

export function vitalActionForType(vitalType: string): string {
  return VITAL_ACTIONS[vitalType] ?? `${vitalType}_recorded`;
}

export function nearbyEntityTypeForProvider(
  providerType: string | null | undefined,
): NearbyEntityType {
  if (providerType === 'pharmacy' || providerType === 'laboratory' || providerType === 'hospital') {
    return providerType;
  }
  if (providerType === 'insurance') {
    return 'payer';
  }
  return 'provider';
}

export function trackEmergencyProfileViewed(): void {
  trackOnce('emergency_profile_viewed', () => {
    track(ProductEvents.emergencyProfileViewed);
  });
}

export function trackEmergencyProfileCompleted(): void {
  track(ProductEvents.emergencyProfileCompleted);
  trackCaremateActive({
    activityType: 'feature_used',
    feature: 'emergency_profile',
    surface: 'emergency',
  });
}

export function trackEmergencyProfileShared(): void {
  track(ProductEvents.emergencyProfileShared);
  trackCaremateActive({
    activityType: 'feature_used',
    feature: 'emergency_profile',
    surface: 'emergency',
  });
}

export function trackLearningOpened(): void {
  trackOnce('learning_opened', () => {
    track(ProductEvents.learningOpened);
  });
}

export function trackLearningContentViewed(params: {
  contentId: string;
  contentCategory: string;
  contentType: string;
}): void {
  trackOnce(`learning_content_viewed:${params.contentId}`, () => {
    track(ProductEvents.learningContentViewed, {
      content_id: params.contentId,
      content_category: params.contentCategory,
      content_type: params.contentType,
    });
    trackCaremateActive({
      activityType: 'content_viewed',
      feature: 'learning',
      surface: 'learning',
    });
  });
}

export function trackLearningContentCompleted(params: {
  contentId: string;
  contentCategory: string;
  contentType: string;
}): void {
  trackOnce(`learning_content_completed:${params.contentId}`, () => {
    track(ProductEvents.learningContentCompleted, {
      content_id: params.contentId,
      content_category: params.contentCategory,
      content_type: params.contentType,
    });
    trackCaremateActive({
      activityType: 'feature_used',
      feature: 'learning',
      surface: 'learning',
    });
  });
}

export function trackNearbyOpened(): void {
  trackOnce('nearby_opened', () => {
    track(ProductEvents.nearbyOpened);
  });
}

export function trackNearbySearch(): void {
  track(ProductEvents.nearbySearch);
}

export function trackNearbyResultViewed(entityType: NearbyEntityType): void {
  track(ProductEvents.nearbyResultViewed, { entity_type: entityType });
}

export function trackNearbyEntitySelected(entityType: NearbyEntityType): void {
  track(ProductEvents.nearbyEntitySelected, { entity_type: entityType });
  trackCaremateActive({
    activityType: 'feature_used',
    feature: 'nearby',
    surface: 'nearby',
  });
}

export function trackMessagingOpened(): void {
  trackOnce('messaging_opened', () => {
    track(ProductEvents.messagingOpened);
  });
}

export function trackConversationStarted(): void {
  track(ProductEvents.conversationStarted);
  trackCaremateActive({
    activityType: 'feature_used',
    feature: 'messaging',
    surface: 'messaging',
  });
}

export function trackMessageSent(): void {
  track(ProductEvents.messageSent);
  trackCaremateActive({
    activityType: 'feature_used',
    feature: 'messaging',
    surface: 'messaging',
  });
}

export function trackFamilyOpened(): void {
  trackOnce('family_opened', () => {
    track(ProductEvents.familyOpened);
  });
}

export function trackFamilyMemberAdded(): void {
  track(ProductEvents.familyMemberAdded);
  trackCaremateActive({
    activityType: 'feature_used',
    feature: 'family',
    surface: 'family',
  });
}

export function trackFamilyInvitationSent(): void {
  track(ProductEvents.familyInvitationSent);
  trackCaremateActive({
    activityType: 'feature_used',
    feature: 'family',
    surface: 'family',
  });
}

export function trackFamilyInvitationAccepted(): void {
  track(ProductEvents.familyInvitationAccepted);
  trackCaremateActive({
    activityType: 'feature_used',
    feature: 'family',
    surface: 'family',
  });
}

export function trackFamilyMemberViewed(): void {
  track(ProductEvents.familyMemberViewed);
}

export function trackProviderSearched(): void {
  track(ProductEvents.providerSearched);
}

export function trackProviderViewed(providerId: string): void {
  trackOnce(`provider_viewed:${providerId}`, () => {
    track(ProductEvents.providerViewed, { provider_id: providerId });
  });
}

export function trackProviderConnectionStarted(providerId: string): void {
  track(ProductEvents.providerConnectionStarted, { provider_id: providerId });
}

export function trackProviderConnectionCompleted(providerId: string): void {
  track(ProductEvents.providerConnectionCompleted, { provider_id: providerId });
  trackCaremateActive({
    activityType: 'connection_completed',
    feature: 'provider',
    surface: 'provider',
  });
}

export function trackPayerSearched(): void {
  track(ProductEvents.payerSearched);
}

export function trackPayerViewed(payerId: string): void {
  trackOnce(`payer_viewed:${payerId}`, () => {
    track(ProductEvents.payerViewed, { payer_id: payerId });
  });
}

export function trackPayerConnectionStarted(payerId: string): void {
  track(ProductEvents.payerConnectionStarted, { payer_id: payerId });
}

export function trackPayerConnectionCompleted(payerId: string): void {
  track(ProductEvents.payerConnectionCompleted, { payer_id: payerId });
  trackCaremateActive({
    activityType: 'connection_completed',
    feature: 'payer',
    surface: 'payer',
  });
}
