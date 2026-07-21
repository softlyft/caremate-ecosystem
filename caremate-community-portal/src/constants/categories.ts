import type { ContributorCategory } from '@/types/database';

export const CONTRIBUTOR_CATEGORIES = [
  'community_champion',
  'health_contributor',
  'builder_network',
  'partner_champion',
] as const satisfies readonly ContributorCategory[];

export const CONTRIBUTOR_CATEGORY_LABELS: Record<ContributorCategory, string> = {
  community_champion: 'Community Champion',
  health_contributor: 'Health Contributor',
  builder_network: 'Builder Network',
  partner_champion: 'Partner Champion',
};
