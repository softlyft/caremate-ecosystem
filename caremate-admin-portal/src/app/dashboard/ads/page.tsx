import { PageHeader } from '@/components/page-header';
import { canAssignRoles, canEditCatalog } from '@/constants/roles';
import {
  getAdEventCounts,
  listAdRemoteConfig,
  listAdvertisers,
  listHouseCampaigns,
  listSponsoredCampaigns,
} from '@/domains/ads/repository';
import { AD_SLOT_IDS, type AdSlotMode } from '@/domains/ads/constants';
import { AdsKillSwitches, type AdsSlotConfigFormValues } from '@/features/ads/ads-kill-switches';
import { AdvertisersManager } from '@/features/ads/advertisers-manager';
import { HouseCampaignsManager } from '@/features/ads/house-campaigns-manager';
import { SponsoredCampaignsManager } from '@/features/ads/sponsored-campaigns-manager';
import { getPortalSession } from '@/lib/auth';

const SLOT_MODES: AdSlotMode[] = ['off', 'house', 'sponsored', 'admob'];

function parseSlotMode(value: string | undefined, fallback: AdSlotMode): AdSlotMode {
  if (value && SLOT_MODES.includes(value as AdSlotMode)) {
    return value as AdSlotMode;
  }
  return fallback;
}

function parseConfig(rows: { key: string; value: string }[]): AdsSlotConfigFormValues {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const bool = (key: string, fallback: boolean) => {
    const v = map.get(key)?.toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    return fallback;
  };

  const slotMode = {} as AdsSlotConfigFormValues['slotMode'];
  for (const slot of AD_SLOT_IDS) {
    const modeKey = `ads.slots.${slot}.mode`;
    const enabledKey = `ads.slots.${slot}.enabled`;
    if (map.has(modeKey)) {
      slotMode[slot] = parseSlotMode(map.get(modeKey), 'house');
    } else if (map.has(enabledKey)) {
      slotMode[slot] = bool(enabledKey, true) ? 'house' : 'off';
    } else {
      slotMode[slot] = 'house';
    }
  }

  return {
    adsEnabled: bool('ads.enabled', true),
    slotMode,
  };
}

export default async function AdsPage() {
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);
  const canVerify = canAssignRoles(session?.role);

  let configRows: Awaited<ReturnType<typeof listAdRemoteConfig>> = [];
  let houseCampaigns: Awaited<ReturnType<typeof listHouseCampaigns>> = [];
  let sponsoredCampaigns: Awaited<ReturnType<typeof listSponsoredCampaigns>> = [];
  let advertisers: Awaited<ReturnType<typeof listAdvertisers>> = [];
  let counts = {
    impressions: 0,
    clicks: 0,
    bySource: {} as Record<string, { impressions: number; clicks: number }>,
  };

  try {
    [configRows, houseCampaigns, sponsoredCampaigns, advertisers, counts] = await Promise.all([
      listAdRemoteConfig(),
      listHouseCampaigns(),
      listSponsoredCampaigns(),
      listAdvertisers(),
      getAdEventCounts(7),
    ]);
  } catch {
    // Tables may not exist until migration is applied.
  }

  const initial = parseConfig(configRows);
  const verifiedAdvertisers = advertisers.filter((a) => a.verification_status === 'verified');

  const sourceLabels: Record<string, string> = {
    house: 'House',
    sponsored: 'Sponsored',
    admob: 'AdMob',
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ads"
        description="Per-slot banner sources, house and sponsored campaigns, and advertiser verification."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Impressions (7d)</p>
          <p className="text-2xl font-semibold">{counts.impressions}</p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Clicks (7d)</p>
          <p className="text-2xl font-semibold">{counts.clicks}</p>
        </div>
        {Object.entries(counts.bySource).map(([source, stats]) => (
          <div key={source} className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-muted">
              {sourceLabels[source] ?? source} (7d)
            </p>
            <p className="text-lg font-semibold">
              {stats.impressions} imp · {stats.clicks} clk
            </p>
          </div>
        ))}
      </div>

      <AdsKillSwitches initial={initial} canEdit={Boolean(canEdit)} />

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Advertisers</h2>
        <AdvertisersManager
          advertisers={advertisers}
          canEdit={Boolean(canEdit)}
          canVerify={Boolean(canVerify)}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">House campaigns</h2>
        <HouseCampaignsManager campaigns={houseCampaigns} canEdit={Boolean(canEdit)} />
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Sponsored campaigns</h2>
        <SponsoredCampaignsManager
          campaigns={sponsoredCampaigns}
          verifiedAdvertisers={verifiedAdvertisers}
          canEdit={Boolean(canEdit)}
        />
      </div>
    </div>
  );
}
