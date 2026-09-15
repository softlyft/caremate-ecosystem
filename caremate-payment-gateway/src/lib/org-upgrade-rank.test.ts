import { describe, expect, it } from 'vitest';

/**
 * Mirrors org-checkout-guards ranking used by Care Portal / Edge checkout.
 * Kept in the gateway test suite as a pure regression for upgrade-only rules.
 */
const TIER_RANK = { basic: 1, pro: 2 } as const;
const INTERVAL_RANK = { monthly: 1, yearly: 2 } as const;

function rank(
  tier: keyof typeof TIER_RANK,
  interval: keyof typeof INTERVAL_RANK,
): number {
  return TIER_RANK[tier] * 10 + INTERVAL_RANK[interval];
}

function isUpgradeOrRenewal(
  current: { tier: 'basic' | 'pro'; interval: 'monthly' | 'yearly' } | null,
  next: { tier: 'basic' | 'pro'; interval: 'monthly' | 'yearly' },
): boolean {
  if (!current) return true;
  return rank(next.tier, next.interval) >= rank(current.tier, current.interval);
}

describe('org plan upgrade-only ranking', () => {
  it('allows free → any and same-plan renewal', () => {
    expect(isUpgradeOrRenewal(null, { tier: 'basic', interval: 'monthly' })).toBe(true);
    expect(
      isUpgradeOrRenewal(
        { tier: 'basic', interval: 'monthly' },
        { tier: 'basic', interval: 'monthly' },
      ),
    ).toBe(true);
  });

  it('allows upgrades and blocks downgrades', () => {
    expect(
      isUpgradeOrRenewal(
        { tier: 'basic', interval: 'monthly' },
        { tier: 'pro', interval: 'monthly' },
      ),
    ).toBe(true);
    expect(
      isUpgradeOrRenewal(
        { tier: 'basic', interval: 'monthly' },
        { tier: 'basic', interval: 'yearly' },
      ),
    ).toBe(true);
    expect(
      isUpgradeOrRenewal(
        { tier: 'pro', interval: 'yearly' },
        { tier: 'basic', interval: 'yearly' },
      ),
    ).toBe(false);
    expect(
      isUpgradeOrRenewal(
        { tier: 'pro', interval: 'yearly' },
        { tier: 'pro', interval: 'monthly' },
      ),
    ).toBe(false);
  });
});
