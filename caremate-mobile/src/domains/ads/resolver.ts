import { getDeviceDefaults } from '@/domains/onboarding';
import { getAdMobBannerUnitId } from '@/domains/ads/admob-config';
import { canRequestAds, isAdsConsentReady } from '@/domains/ads/consent';
import { adsRepository } from '@/domains/ads/repository';
import { shouldSuppressAdForUser } from '@/domains/billing/entitlements';
import { billingRepository } from '@/domains/billing/repository';
import type { AdSlotId, ResolvedCatalogAd, ResolvedSlotAd } from '@/domains/ads/types';
import { isOnline } from '@/sync/network';

/** Session-scoped dedupe so React Query refetches do not flood skip events. */
const loggedAdMobSkips = new Set<string>();

export type AdMobSkipReason =
  | 'premium'
  | 'offline'
  | 'consent_denied'
  | 'missing_unit_id'
  | 'slot_suppressed';

/**
 * Resolve what to show in a banner slot.
 * Each slot has exactly one admin-selected mode — no cross-source fallback.
 */
export async function resolveAdForSlot(params: {
  slotId: AdSlotId;
  userId: string | null;
  isGuest: boolean;
}): Promise<ResolvedSlotAd | null> {
  const remote = await adsRepository.getRemoteConfig();
  if (!remote.adsEnabled) {
    return null;
  }

  const mode = remote.slotMode[params.slotId];
  if (!mode || mode === 'off') {
    return null;
  }

  if (!params.isGuest && params.userId) {
    const premium = await billingRepository.getCachedPremiumState(params.userId);
    if (shouldSuppressAdForUser(premium.tier, params.slotId, params.isGuest)) {
      if (mode === 'admob') {
        void trackAdMobSkip({
          userId: params.userId,
          slotId: params.slotId,
          reason: 'slot_suppressed',
        });
      }
      return null;
    }
  }

  if (mode === 'admob') {
    return resolveAdMobSlot(params);
  }

  if (mode === 'house' || mode === 'sponsored') {
    return resolveCatalogSlot(params.slotId, mode);
  }

  return null;
}

async function resolveAdMobSlot(params: {
  slotId: AdSlotId;
  userId: string | null;
  isGuest: boolean;
}): Promise<ResolvedSlotAd | null> {
  const userIdForEvents = params.isGuest ? null : params.userId;

  if (!params.isGuest && params.userId) {
    const premium = await billingRepository.getCachedPremiumState(params.userId);
    if (premium.tier !== 'free') {
      void trackAdMobSkip({
        userId: userIdForEvents,
        slotId: params.slotId,
        reason: 'premium',
      });
      return null;
    }
  }

  const online = await isOnline();
  if (!online) {
    void trackAdMobSkip({
      userId: userIdForEvents,
      slotId: params.slotId,
      reason: 'offline',
    });
    return null;
  }

  if (!isAdsConsentReady()) {
    // Not a permanent miss — consent init is still running. Throw so React Query retries
    // instead of caching null for staleTime.
    throw new Error('ADS_CONSENT_PENDING');
  }

  if (!(await canRequestAds())) {
    void trackAdMobSkip({
      userId: userIdForEvents,
      slotId: params.slotId,
      reason: 'consent_denied',
    });
    return null;
  }

  const unitId = getAdMobBannerUnitId(params.slotId);
  if (!unitId) {
    void trackAdMobSkip({
      userId: userIdForEvents,
      slotId: params.slotId,
      reason: 'missing_unit_id',
    });
    return null;
  }

  return {
    kind: 'admob',
    source: 'admob',
    slotId: params.slotId,
    unitId,
  };
}

async function resolveCatalogSlot(
  slotId: AdSlotId,
  mode: 'house' | 'sponsored',
): Promise<ResolvedCatalogAd | null> {
  const defaults = await getDeviceDefaults();
  const countryCode = defaults.countryCode;

  const eligible = await adsRepository.listEligibleForSlot(slotId, mode, { countryCode });
  if (eligible.length === 0) {
    return null;
  }

  for (const item of eligible) {
    const shown = await adsRepository.countImpressionsToday(item.campaignId, slotId);
    if (shown >= item.frequencyCapPerDay) {
      continue;
    }

    return {
      kind: 'catalog',
      source: item.source,
      campaignId: item.campaignId,
      creativeId: item.creativeId,
      slotId,
      title: item.title,
      body: item.body,
      ctaLabel: item.ctaLabel,
      ctaHref: item.ctaHref,
      imageUrl: item.imageUrl,
      badgeLabel: item.badgeLabel,
      advertiserName: item.advertiserName,
    };
  }

  return null;
}

export async function trackCatalogImpression(params: {
  userId: string | null;
  ad: ResolvedCatalogAd;
}): Promise<void> {
  try {
    await adsRepository.recordCatalogEvent({
      userId: params.userId,
      eventType: 'impression',
      ad: params.ad,
    });
  } catch {
    // Tracking must never break the feed.
  }
}

export async function trackCatalogClick(params: {
  userId: string | null;
  ad: ResolvedCatalogAd;
}): Promise<void> {
  try {
    await adsRepository.recordCatalogEvent({
      userId: params.userId,
      eventType: 'click',
      ad: params.ad,
    });
  } catch {
    // Tracking must never break navigation.
  }
}

export async function trackAdMobImpression(params: {
  userId: string | null;
  slotId: AdSlotId;
  unitId: string;
}): Promise<void> {
  try {
    await adsRepository.recordAdMobEvent({
      userId: params.userId,
      eventType: 'impression',
      slotId: params.slotId,
      unitId: params.unitId,
    });
  } catch {
    // Best-effort.
  }
}

export async function trackAdMobClick(params: {
  userId: string | null;
  slotId: AdSlotId;
  unitId: string;
}): Promise<void> {
  try {
    await adsRepository.recordAdMobEvent({
      userId: params.userId,
      eventType: 'click',
      slotId: params.slotId,
      unitId: params.unitId,
    });
  } catch {
    // Best-effort.
  }
}

/** Fired when the BannerAd component issues a network request. */
export async function trackAdMobRequest(params: {
  userId: string | null;
  slotId: AdSlotId;
  unitId: string;
}): Promise<void> {
  try {
    if (__DEV__) {
      console.info('[ads] AdMob request', params.slotId, params.unitId);
    }
    await adsRepository.recordAdMobEvent({
      userId: params.userId,
      eventType: 'request',
      slotId: params.slotId,
      unitId: params.unitId,
    });
  } catch {
    // Best-effort.
  }
}

/** Fired when the SDK fails to fill or load a banner. */
export async function trackAdMobLoadError(params: {
  userId: string | null;
  slotId: AdSlotId;
  unitId: string;
  error: unknown;
}): Promise<void> {
  const detail = formatAdMobError(params.error);
  try {
    console.warn('[ads] AdMob load_error', params.slotId, params.unitId, detail);
    await adsRepository.recordAdMobEvent({
      userId: params.userId,
      eventType: 'load_error',
      slotId: params.slotId,
      unitId: params.unitId,
      detail,
    });
  } catch {
    // Best-effort.
  }
}

/** Resolver skipped AdMob before a banner request (once per slot+reason per session). */
export async function trackAdMobSkip(params: {
  userId: string | null;
  slotId: AdSlotId;
  reason: AdMobSkipReason;
  unitId?: string | null;
}): Promise<void> {
  const key = `${params.slotId}:${params.reason}`;
  if (loggedAdMobSkips.has(key)) {
    return;
  }
  loggedAdMobSkips.add(key);

  try {
    console.warn('[ads] AdMob skip', params.slotId, params.reason);
    await adsRepository.recordAdMobEvent({
      userId: params.userId,
      eventType: 'skip',
      slotId: params.slotId,
      unitId: params.unitId ?? null,
      detail: params.reason,
    });
  } catch {
    // Best-effort.
  }
}

/** @internal tests */
export function resetAdMobSkipLogForTests(): void {
  loggedAdMobSkips.clear();
}

function formatAdMobError(error: unknown): string {
  if (error == null) {
    return 'unknown';
  }
  if (typeof error === 'string') {
    return error.slice(0, 500);
  }
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }
  if (typeof error === 'object') {
    const record = error as { message?: unknown; code?: unknown; messageAndroid?: unknown };
    const parts = [record.code, record.message, record.messageAndroid]
      .filter((part) => part != null && String(part).length > 0)
      .map((part) => String(part));
    if (parts.length > 0) {
      return parts.join(' · ').slice(0, 500);
    }
    try {
      return JSON.stringify(error).slice(0, 500);
    } catch {
      return 'unknown';
    }
  }
  return String(error).slice(0, 500);
}

/** @deprecated Use trackCatalogImpression */
export const trackAdImpression = trackCatalogImpression;
/** @deprecated Use trackCatalogClick */
export const trackAdClick = trackCatalogClick;
