'use server';

import { revalidatePath } from 'next/cache';

import { canAssignRoles, canEditCatalog } from '@/constants/roles';
import { AD_SLOT_IDS, type AdSlotMode } from '@/domains/ads/constants';
import { writeAuditEvent } from '@/lib/audit';
import { requirePortalSession } from '@/lib/auth';
import { assertSafeExternalUrl } from '@/lib/safe-url';
import { createClient } from '@/lib/supabase/server';

async function requireEditor() {
  const session = await requirePortalSession();
  if (!canEditCatalog(session.role)) throw new Error('Forbidden');
  return session;
}

async function requireAdmin() {
  const session = await requirePortalSession();
  if (!canAssignRoles(session.role)) throw new Error('Forbidden');
  return session;
}

export type AdsConfigInput = {
  adsEnabled: boolean;
  slotMode: Record<(typeof AD_SLOT_IDS)[number], AdSlotMode>;
};

export async function saveAdsRemoteConfig(input: AdsConfigInput) {
  await requireEditor();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const rows = [
    { key: 'ads.enabled', value: String(input.adsEnabled), updated_at: now },
    ...AD_SLOT_IDS.map((slot) => ({
      key: `ads.slots.${slot}.mode`,
      value: input.slotMode[slot],
      updated_at: now,
    })),
  ];

  const { error } = await supabase.from('ad_remote_config').upsert(rows);
  if (error) throw error;

  await writeAuditEvent({
    action: 'update_ads_remote_config',
    entityType: 'ad_remote_config',
    entityId: 'ads',
  });

  revalidatePath('/dashboard/ads');
}

export type AdvertiserInput = {
  id?: string;
  name: string;
  orgType: string;
  websiteUrl?: string | null;
  logoUrl?: string | null;
};

export async function saveAdvertiser(input: AdvertiserInput) {
  await requireEditor();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const id = input.id ?? crypto.randomUUID();
  const isNew = !input.id;

  const { error } = await supabase.from('ad_advertisers').upsert({
    id,
    name: input.name.trim(),
    org_type: input.orgType,
    website_url: assertSafeExternalUrl(input.websiteUrl, 'Website URL'),
    logo_url: assertSafeExternalUrl(input.logoUrl, 'Logo URL'),
    verification_status: isNew ? 'pending' : undefined,
    deleted_at: null,
    updated_at: now,
    ...(isNew ? { created_at: now } : {}),
  });
  if (error) throw error;

  await writeAuditEvent({
    action: isNew ? 'create_ad_advertiser' : 'update_ad_advertiser',
    entityType: 'ad_advertiser',
    entityId: id,
  });

  revalidatePath('/dashboard/ads');
  return id;
}

export async function setAdvertiserVerification(
  id: string,
  status: 'verified' | 'rejected',
) {
  const session = await requireAdmin();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('ad_advertisers')
    .update({
      verification_status: status,
      verified_at: status === 'verified' ? now : null,
      verified_by_user_id: status === 'verified' ? session.user.id : null,
      updated_at: now,
    })
    .eq('id', id);
  if (error) throw error;

  await writeAuditEvent({
    action: status === 'verified' ? 'verify_ad_advertiser' : 'reject_ad_advertiser',
    entityType: 'ad_advertiser',
    entityId: id,
  });

  revalidatePath('/dashboard/ads');
}

export type CampaignInput = {
  id?: string;
  source: 'house' | 'sponsored';
  advertiserId?: string | null;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  priority?: number;
  frequencyCapPerDay?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  countryCodes?: string[];
  title: string;
  body: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  badgeLabel?: string | null;
  imageUrl?: string | null;
  slotIds: string[];
};

export async function saveCampaign(input: CampaignInput) {
  await requireEditor();
  if (input.source === 'sponsored' && !input.advertiserId) {
    throw new Error('Sponsored campaigns require a verified advertiser');
  }

  if (input.source === 'sponsored' && input.advertiserId) {
    const supabase = await createClient();
    const { data: advertiser } = await supabase
      .from('ad_advertisers')
      .select('verification_status')
      .eq('id', input.advertiserId)
      .maybeSingle();
    if (advertiser?.verification_status !== 'verified') {
      throw new Error('Advertiser must be verified before activating sponsored campaigns');
    }
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const campaignId = input.id ?? crypto.randomUUID();
  const isNew = !input.id;

  const { error: campaignError } = await supabase.from('ad_campaigns').upsert({
    id: campaignId,
    source: input.source,
    advertiser_id: input.source === 'sponsored' ? input.advertiserId : null,
    name: input.name.trim(),
    status: input.status,
    priority: input.priority ?? 0,
    frequency_cap_per_day: input.frequencyCapPerDay ?? 6,
    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
    country_codes: input.countryCodes ?? [],
    deleted_at: null,
    updated_at: now,
    ...(isNew ? { created_at: now } : {}),
  });
  if (campaignError) throw campaignError;

  const { data: existingCreative } = await supabase
    .from('ad_creatives')
    .select('id')
    .eq('campaign_id', campaignId)
    .is('deleted_at', null)
    .maybeSingle();

  const creativeId = existingCreative?.id ?? crypto.randomUUID();
  const defaultBadge =
    input.source === 'sponsored' ? 'Sponsored' : input.badgeLabel?.trim() || 'From CareMate';

  const { error: creativeError } = await supabase.from('ad_creatives').upsert({
    id: creativeId,
    campaign_id: campaignId,
    title: input.title.trim(),
    body: input.body.trim(),
    cta_label: input.ctaLabel?.trim() || null,
    cta_href: assertSafeExternalUrl(input.ctaHref, 'CTA URL'),
    badge_label: defaultBadge,
    image_url: assertSafeExternalUrl(input.imageUrl, 'Image URL'),
    deleted_at: null,
    updated_at: now,
    ...(existingCreative ? {} : { created_at: now }),
  });
  if (creativeError) throw creativeError;

  const wanted = new Set(
    input.slotIds.filter((s) => (AD_SLOT_IDS as readonly string[]).includes(s)),
  );

  const { data: existingPlacements } = await supabase
    .from('ad_placements')
    .select('*')
    .eq('campaign_id', campaignId);

  for (const placement of existingPlacements ?? []) {
    if (wanted.has(placement.slot_id)) {
      if (placement.deleted_at) {
        await supabase
          .from('ad_placements')
          .update({ deleted_at: null, updated_at: now })
          .eq('id', placement.id);
      }
      wanted.delete(placement.slot_id);
    } else if (!placement.deleted_at) {
      await supabase
        .from('ad_placements')
        .update({ deleted_at: now, updated_at: now })
        .eq('id', placement.id);
    }
  }

  for (const slotId of wanted) {
    await supabase.from('ad_placements').upsert({
      id: crypto.randomUUID(),
      campaign_id: campaignId,
      slot_id: slotId,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    });
  }

  await writeAuditEvent({
    action: isNew ? `create_${input.source}_campaign` : `update_${input.source}_campaign`,
    entityType: 'ad_campaign',
    entityId: campaignId,
  });

  revalidatePath('/dashboard/ads');
  return campaignId;
}

export async function deleteCampaign(id: string, source: 'house' | 'sponsored') {
  await requireEditor();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('ad_campaigns')
    .update({ deleted_at: now, updated_at: now, status: 'archived' })
    .eq('id', id)
    .eq('source', source);
  if (error) throw error;

  await writeAuditEvent({
    action: `delete_${source}_campaign`,
    entityType: 'ad_campaign',
    entityId: id,
  });

  revalidatePath('/dashboard/ads');
}

/** @deprecated Use saveCampaign */
export async function saveHouseCampaign(
  input: Omit<CampaignInput, 'source' | 'advertiserId'>,
) {
  return saveCampaign({ ...input, source: 'house' });
}

/** @deprecated Use deleteCampaign */
export async function deleteHouseCampaign(id: string) {
  return deleteCampaign(id, 'house');
}
