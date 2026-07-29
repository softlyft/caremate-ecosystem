import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_PAGE_SIZE,
  pageRange,
  paginatedResult,
  parsePage,
  type ListPaging,
  type PaginatedResult,
} from '@/lib/pagination';
import type { AdAdvertiser, AdCampaign, AdCreative, AdPlacement, AdRemoteConfig } from '@/types/database';

export type { PaginatedResult };

export type CampaignWithCreative = AdCampaign & {
  creative: AdCreative | null;
  placements: AdPlacement[];
  advertiser?: AdAdvertiser | null;
};

export async function listAdRemoteConfig(): Promise<AdRemoteConfig[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ad_remote_config')
    .select('*')
    .order('key', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listAdvertisers(): Promise<AdAdvertiser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ad_advertisers')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listAdvertisersPage(
  opts?: ListPaging,
): Promise<PaginatedResult<AdAdvertiser>> {
  const supabase = await createClient();
  const page = parsePage(opts?.page);
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  const { data, error, count } = await supabase
    .from('ad_advertisers')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .range(from, to);
  if (error) throw error;
  return paginatedResult(data ?? [], count, page, pageSize);
}

async function enrichCampaigns(
  campaigns: AdCampaign[],
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<CampaignWithCreative[]> {
  const ids = campaigns.map((c) => c.id);
  if (ids.length === 0) return [];

  const [{ data: creatives }, { data: placements }, { data: advertisers }] = await Promise.all([
    supabase.from('ad_creatives').select('*').in('campaign_id', ids).is('deleted_at', null),
    supabase.from('ad_placements').select('*').in('campaign_id', ids).is('deleted_at', null),
    supabase.from('ad_advertisers').select('*').is('deleted_at', null),
  ]);

  const advertiserMap = new Map((advertisers ?? []).map((a) => [a.id, a]));

  return campaigns.map((campaign) => ({
    ...campaign,
    creative: (creatives ?? []).find((c) => c.campaign_id === campaign.id) ?? null,
    placements: (placements ?? []).filter((p) => p.campaign_id === campaign.id),
    advertiser: campaign.advertiser_id ? advertiserMap.get(campaign.advertiser_id) ?? null : null,
  }));
}

export async function listCampaignsBySource(
  source: 'house' | 'sponsored',
): Promise<CampaignWithCreative[]> {
  const supabase = await createClient();
  const { data: campaigns, error } = await supabase
    .from('ad_campaigns')
    .select('*')
    .eq('source', source)
    .is('deleted_at', null)
    .order('priority', { ascending: false });
  if (error) throw error;
  return enrichCampaigns(campaigns ?? [], supabase);
}

export async function listCampaignsBySourcePage(
  source: 'house' | 'sponsored',
  opts?: ListPaging,
): Promise<PaginatedResult<CampaignWithCreative>> {
  const supabase = await createClient();
  const page = parsePage(opts?.page);
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);

  const { data: campaigns, error, count } = await supabase
    .from('ad_campaigns')
    .select('*', { count: 'exact' })
    .eq('source', source)
    .is('deleted_at', null)
    .order('priority', { ascending: false })
    .range(from, to);
  if (error) throw error;

  const enriched = await enrichCampaigns(campaigns ?? [], supabase);
  return paginatedResult(enriched, count, page, pageSize);
}

export async function listHouseCampaigns(): Promise<CampaignWithCreative[]> {
  return listCampaignsBySource('house');
}

export async function listSponsoredCampaigns(): Promise<CampaignWithCreative[]> {
  return listCampaignsBySource('sponsored');
}

export async function getAdEventCounts(days = 7): Promise<{
  impressions: number;
  clicks: number;
  bySource: Record<string, { impressions: number; clicks: number }>;
}> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const { data, error } = await supabase
    .from('ad_events')
    .select('event_type, source')
    .gte('created_at', sinceIso);
  if (error) throw error;

  const bySource: Record<string, { impressions: number; clicks: number }> = {};
  let impressions = 0;
  let clicks = 0;

  for (const row of data ?? []) {
    const source = row.source ?? 'unknown';
    if (!bySource[source]) {
      bySource[source] = { impressions: 0, clicks: 0 };
    }
    if (row.event_type === 'impression') {
      impressions += 1;
      bySource[source].impressions += 1;
    } else if (row.event_type === 'click') {
      clicks += 1;
      bySource[source].clicks += 1;
    }
  }

  return { impressions, clicks, bySource };
}
