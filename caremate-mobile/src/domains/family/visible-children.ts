import type { PremiumTier } from '@/domains/billing/types';
import { maxChildrenForTier } from '@/domains/billing/entitlements';

export type ChildLike = {
  id: string;
  createdAt: string;
};

/**
 * Hide over-cap children until the user renews / upgrades.
 * Stable order: oldest first (createdAt ASC, then id).
 */
export function selectVisibleChildren<T extends ChildLike>(children: T[], tier: PremiumTier): T[] {
  const limit = maxChildrenForTier(tier);
  const sorted = [...children].sort((a, b) => {
    const byDate = a.createdAt.localeCompare(b.createdAt);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
  return sorted.slice(0, limit);
}

/**
 * Family Premium: only the plan owner may add children (onto the owner household).
 * Other tiers: anyone managing their own household may add within cap.
 */
export function canAddChildForRole(params: {
  tier: PremiumTier;
  currentVisibleOrFederatedCount: number;
  isFamilyPlanOwner: boolean;
}): boolean {
  const { tier, currentVisibleOrFederatedCount, isFamilyPlanOwner } = params;
  if (tier === 'family' && !isFamilyPlanOwner) {
    return false;
  }
  return currentVisibleOrFederatedCount < maxChildrenForTier(tier);
}
