import { getDeviceDefaults } from '@/domains/onboarding';
import { getAdMobBannerUnitId } from '@/domains/ads/admob-config';
import { canRequestAds, isAdsConsentReady } from '@/domains/ads/consent';
import { adsRepository } from '@/domains/ads/repository';
import { shouldSuppressAdForUser } from '@/domains/billing/entitlements';
import { billingRepository } from '@/domains/billing/repository';
import type { AdSlotId, ResolvedCatalogAd, ResolvedSlotAd } from '@/domains/ads/types';
import { isOnline } from '@/sync/network';

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
  if (!params.isGuest && params.userId) {
    const premium = await billingRepository.getCachedPremiumState(params.userId);
    if (premium.tier !== 'free') {
      return null;
    }
  }

  const online = await isOnline();
  if (!online) {
    return null;
  }

  if (!isAdsConsentReady() || !(await canRequestAds())) {
    return null;
  }

  const unitId = getAdMobBannerUnitId(params.slotId);
  if (!unitId) {
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

/** @deprecated Use trackCatalogImpression */
export const trackAdImpression = trackCatalogImpression;
/** @deprecated Use trackCatalogClick */
export const trackAdClick = trackCatalogClick;
