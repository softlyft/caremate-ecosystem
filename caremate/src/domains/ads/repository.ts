import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';

import { config } from '@/constants/env';
import { getDatabase } from '@/database/client';
import {
  adAdvertisers,
  adCampaigns,
  adCreatives,
  adEvents,
  adPlacements,
  adRemoteConfig,
} from '@/database/schema';
import {
  AD_SLOT_IDS,
  DEFAULT_ADS_REMOTE_CONFIG,
  type AdSlotId,
  type AdSlotMode,
  type AdsRemoteConfig,
  type ResolvedCatalogAd,
  type ResolvedSlotAd,
} from '@/domains/ads/types';
import { supabase } from '@/lib/supabase';
import { BaseRepository } from '@/repositories/base-repository';
import { isOnline } from '@/sync/network';
import { createId, nowIso, parseJson } from '@/utils/helpers';

type EligibleCreative = {
  campaignId: string;
  creativeId: string;
  source: 'house' | 'sponsored';
  priority: number;
  frequencyCapPerDay: number;
  countryCodes: string[];
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  badgeLabel: string | null;
  advertiserName: string | null;
};

const SLOT_MODES: AdSlotMode[] = ['off', 'house', 'sponsored', 'admob'];

function localDayStartIso(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const v = value.trim().toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return fallback;
}

function parseSlotMode(value: string | undefined, fallback: AdSlotMode): AdSlotMode {
  if (value && SLOT_MODES.includes(value as AdSlotMode)) {
    return value as AdSlotMode;
  }
  return fallback;
}

class AdsRepository extends BaseRepository {
  async getRemoteConfig(): Promise<AdsRemoteConfig> {
    const db = getDatabase();
    const rows = await db.select().from(adRemoteConfig);
    const map = new Map(rows.map((r) => [r.key, r.value]));

    const slotMode = { ...DEFAULT_ADS_REMOTE_CONFIG.slotMode };
    for (const slot of AD_SLOT_IDS) {
      const modeKey = `ads.slots.${slot}.mode`;
      const enabledKey = `ads.slots.${slot}.enabled`;
      if (map.has(modeKey)) {
        slotMode[slot] = parseSlotMode(map.get(modeKey), slotMode[slot]);
      } else if (map.has(enabledKey)) {
        slotMode[slot] = parseBool(map.get(enabledKey), true) ? 'house' : 'off';
      }
    }

    return {
      adsEnabled: parseBool(map.get('ads.enabled'), DEFAULT_ADS_REMOTE_CONFIG.adsEnabled),
      slotMode,
    };
  }

  async listEligibleForSlot(
    slotId: AdSlotId,
    source: 'house' | 'sponsored',
    options?: { countryCode?: string | null },
  ): Promise<EligibleCreative[]> {
    const db = getDatabase();
    const now = nowIso();

    const rows = await db
      .select({
        campaignId: adCampaigns.id,
        creativeId: adCreatives.id,
        source: adCampaigns.source,
        advertiserId: adCampaigns.advertiserId,
        priority: adCampaigns.priority,
        frequencyCapPerDay: adCampaigns.frequencyCapPerDay,
        countryCodesJson: adCampaigns.countryCodesJson,
        startsAt: adCampaigns.startsAt,
        endsAt: adCampaigns.endsAt,
        status: adCampaigns.status,
        title: adCreatives.title,
        body: adCreatives.body,
        ctaLabel: adCreatives.ctaLabel,
        ctaHref: adCreatives.ctaHref,
        imageUrl: adCreatives.imageUrl,
        badgeLabel: adCreatives.badgeLabel,
        advertiserName: adAdvertisers.name,
        advertiserStatus: adAdvertisers.verificationStatus,
      })
      .from(adPlacements)
      .innerJoin(adCampaigns, eq(adPlacements.campaignId, adCampaigns.id))
      .innerJoin(adCreatives, eq(adCreatives.campaignId, adCampaigns.id))
      .leftJoin(adAdvertisers, eq(adCampaigns.advertiserId, adAdvertisers.id))
      .where(
        and(
          eq(adPlacements.slotId, slotId),
          eq(adCampaigns.source, source),
          isNull(adPlacements.deletedAt),
          isNull(adCampaigns.deletedAt),
          isNull(adCreatives.deletedAt),
          eq(adCampaigns.status, 'active'),
        ),
      )
      .orderBy(desc(adCampaigns.priority));

    const country = options?.countryCode?.trim().toUpperCase() || null;
    const eligible: EligibleCreative[] = [];

    for (const row of rows) {
      if (row.startsAt && row.startsAt > now) continue;
      if (row.endsAt && row.endsAt < now) continue;

      if (source === 'sponsored') {
        if (!row.advertiserId || row.advertiserStatus !== 'verified') continue;
      }

      const countryCodes = parseJson<string[]>(row.countryCodesJson, []);
      if (
        country &&
        countryCodes.length > 0 &&
        !countryCodes.map((c) => c.toUpperCase()).includes(country)
      ) {
        continue;
      }

      eligible.push({
        campaignId: row.campaignId,
        creativeId: row.creativeId,
        source,
        priority: row.priority,
        frequencyCapPerDay: row.frequencyCapPerDay,
        countryCodes,
        title: row.title,
        body: row.body,
        ctaLabel: row.ctaLabel,
        ctaHref: row.ctaHref,
        imageUrl: row.imageUrl,
        badgeLabel: row.badgeLabel,
        advertiserName: row.advertiserName,
      });
    }

    return eligible;
  }

  async countImpressionsToday(campaignId: string, slotId: AdSlotId): Promise<number> {
    const db = getDatabase();
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(adEvents)
      .where(
        and(
          eq(adEvents.campaignId, campaignId),
          eq(adEvents.slotId, slotId),
          eq(adEvents.eventType, 'impression'),
          gte(adEvents.createdAt, localDayStartIso()),
          isNull(adEvents.deletedAt),
        ),
      );
    return Number(row?.count ?? 0);
  }

  async recordCatalogEvent(params: {
    userId: string | null;
    eventType: 'impression' | 'click';
    ad: ResolvedCatalogAd;
  }): Promise<void> {
    await this.recordEvent({
      userId: params.userId,
      eventType: params.eventType,
      slotId: params.ad.slotId,
      source: params.ad.source,
      campaignId: params.ad.campaignId,
      creativeId: params.ad.creativeId,
      adUnitId: null,
    });
  }

  async recordAdMobEvent(params: {
    userId: string | null;
    eventType: 'impression' | 'click';
    slotId: AdSlotId;
    unitId: string;
  }): Promise<void> {
    await this.recordEvent({
      userId: params.userId,
      eventType: params.eventType,
      slotId: params.slotId,
      source: 'admob',
      campaignId: null,
      creativeId: null,
      adUnitId: params.unitId,
    });
  }

  private async recordEvent(params: {
    userId: string | null;
    eventType: 'impression' | 'click';
    slotId: AdSlotId;
    source: string;
    campaignId: string | null;
    creativeId: string | null;
    adUnitId: string | null;
  }): Promise<void> {
    const db = getDatabase();
    const timestamp = nowIso();
    const id = await createId();

    await db.insert(adEvents).values({
      id,
      userId: params.userId,
      eventType: params.eventType,
      campaignId: params.campaignId,
      creativeId: params.creativeId,
      slotId: params.slotId,
      source: params.source,
      adUnitId: params.adUnitId,
      syncStatus: 'pending',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.queueSync({
      entityType: 'ad_events',
      entityId: id,
      operation: 'create',
      payload: {
        id,
        userId: params.userId,
        eventType: params.eventType,
        campaignId: params.campaignId,
        creativeId: params.creativeId,
        slotId: params.slotId,
        source: params.source,
        adUnitId: params.adUnitId,
        createdAt: timestamp,
      },
    });
  }

  async syncEventToRemote(entityId: string, _operation: string, payload: unknown): Promise<void> {
    const event = payload as {
      id: string;
      userId: string | null;
      eventType: string;
      campaignId: string | null;
      creativeId: string | null;
      slotId: string;
      source: string;
      adUnitId: string | null;
      createdAt: string;
    };

    const { error } = await supabase.from('ad_events').upsert({
      id: event.id,
      user_id: event.userId && event.userId !== 'guest' ? event.userId : null,
      event_type: event.eventType,
      campaign_id: event.campaignId,
      creative_id: event.creativeId,
      slot_id: event.slotId,
      source: event.source,
      ad_unit_id: event.adUnitId,
      created_at: event.createdAt,
    });

    if (error) {
      throw new Error(error.message);
    }

    const db = getDatabase();
    await db
      .update(adEvents)
      .set({ syncStatus: 'synced', updatedAt: nowIso() })
      .where(eq(adEvents.id, entityId));
  }

  async pullFromRemote(): Promise<void> {
    if (!config.isSupabaseConfigured) {
      return;
    }
    const online = await isOnline();
    if (!online) {
      return;
    }

    await Promise.all([
      this.pullConfig(),
      this.pullAdvertisers(),
      this.pullCampaigns(),
      this.pullCreatives(),
      this.pullPlacements(),
    ]);
  }

  private async pullConfig(): Promise<void> {
    const { data, error } = await supabase.from('ad_remote_config').select('*');
    if (error || !data) return;

    const db = getDatabase();
    for (const row of data) {
      await db
        .insert(adRemoteConfig)
        .values({
          key: row.key,
          value: row.value,
          updatedAt: row.updated_at ?? nowIso(),
        })
        .onConflictDoUpdate({
          target: adRemoteConfig.key,
          set: {
            value: row.value,
            updatedAt: row.updated_at ?? nowIso(),
          },
        });
    }
  }

  private async pullAdvertisers(): Promise<void> {
    const { data, error } = await supabase.from('ad_advertisers').select('*');
    if (error || !data) return;

    const db = getDatabase();
    const timestamp = nowIso();
    for (const row of data) {
      await db
        .insert(adAdvertisers)
        .values({
          id: row.id,
          name: row.name,
          orgType: row.org_type,
          websiteUrl: row.website_url ?? null,
          logoUrl: row.logo_url ?? null,
          verificationStatus: row.verification_status,
          verifiedAt: row.verified_at ?? null,
          syncStatus: 'synced',
          deletedAt: row.deleted_at ?? null,
          createdAt: row.created_at ?? timestamp,
          updatedAt: row.updated_at ?? timestamp,
        })
        .onConflictDoUpdate({
          target: adAdvertisers.id,
          set: {
            name: row.name,
            orgType: row.org_type,
            websiteUrl: row.website_url ?? null,
            logoUrl: row.logo_url ?? null,
            verificationStatus: row.verification_status,
            verifiedAt: row.verified_at ?? null,
            syncStatus: 'synced',
            deletedAt: row.deleted_at ?? null,
            updatedAt: row.updated_at ?? timestamp,
          },
        });
    }
  }

  private async pullCampaigns(): Promise<void> {
    const { data, error } = await supabase.from('ad_campaigns').select('*');
    if (error || !data) return;

    const db = getDatabase();
    const timestamp = nowIso();
    for (const row of data) {
      await db
        .insert(adCampaigns)
        .values({
          id: row.id,
          source: row.source,
          advertiserId: row.advertiser_id ?? null,
          name: row.name,
          status: row.status,
          priority: row.priority ?? 0,
          frequencyCapPerDay: row.frequency_cap_per_day ?? 6,
          startsAt: row.starts_at ?? null,
          endsAt: row.ends_at ?? null,
          countryCodesJson: JSON.stringify(row.country_codes ?? []),
          syncStatus: 'synced',
          deletedAt: row.deleted_at ?? null,
          createdAt: row.created_at ?? timestamp,
          updatedAt: row.updated_at ?? timestamp,
        })
        .onConflictDoUpdate({
          target: adCampaigns.id,
          set: {
            source: row.source,
            advertiserId: row.advertiser_id ?? null,
            name: row.name,
            status: row.status,
            priority: row.priority ?? 0,
            frequencyCapPerDay: row.frequency_cap_per_day ?? 6,
            startsAt: row.starts_at ?? null,
            endsAt: row.ends_at ?? null,
            countryCodesJson: JSON.stringify(row.country_codes ?? []),
            syncStatus: 'synced',
            deletedAt: row.deleted_at ?? null,
            updatedAt: row.updated_at ?? timestamp,
          },
        });
    }
  }

  private async pullCreatives(): Promise<void> {
    const { data, error } = await supabase.from('ad_creatives').select('*');
    if (error || !data) return;

    const db = getDatabase();
    const timestamp = nowIso();
    for (const row of data) {
      await db
        .insert(adCreatives)
        .values({
          id: row.id,
          campaignId: row.campaign_id,
          title: row.title,
          body: row.body,
          ctaLabel: row.cta_label ?? null,
          ctaHref: row.cta_href ?? null,
          imageUrl: row.image_url ?? null,
          badgeLabel: row.badge_label ?? null,
          syncStatus: 'synced',
          deletedAt: row.deleted_at ?? null,
          createdAt: row.created_at ?? timestamp,
          updatedAt: row.updated_at ?? timestamp,
        })
        .onConflictDoUpdate({
          target: adCreatives.id,
          set: {
            campaignId: row.campaign_id,
            title: row.title,
            body: row.body,
            ctaLabel: row.cta_label ?? null,
            ctaHref: row.cta_href ?? null,
            imageUrl: row.image_url ?? null,
            badgeLabel: row.badge_label ?? null,
            syncStatus: 'synced',
            deletedAt: row.deleted_at ?? null,
            updatedAt: row.updated_at ?? timestamp,
          },
        });
    }
  }

  private async pullPlacements(): Promise<void> {
    const { data, error } = await supabase.from('ad_placements').select('*');
    if (error || !data) return;

    const db = getDatabase();
    const timestamp = nowIso();
    for (const row of data) {
      await db
        .insert(adPlacements)
        .values({
          id: row.id,
          campaignId: row.campaign_id,
          slotId: row.slot_id,
          syncStatus: 'synced',
          deletedAt: row.deleted_at ?? null,
          createdAt: row.created_at ?? timestamp,
          updatedAt: row.updated_at ?? timestamp,
        })
        .onConflictDoUpdate({
          target: adPlacements.id,
          set: {
            campaignId: row.campaign_id,
            slotId: row.slot_id,
            syncStatus: 'synced',
            deletedAt: row.deleted_at ?? null,
            updatedAt: row.updated_at ?? timestamp,
          },
        });
    }
  }
}

export const adsRepository = new AdsRepository();

// Silence unused import warning for ResolvedSlotAd in public API surface.
export type { ResolvedSlotAd };
