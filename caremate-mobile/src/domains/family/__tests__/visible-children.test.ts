import { describe, expect, it } from '@jest/globals';

import { canAddChildForRole, selectVisibleChildren } from '@/domains/family/visible-children';

describe('selectVisibleChildren', () => {
  const kids = [
    { id: 'c3', createdAt: '2026-03-01T00:00:00.000Z' },
    { id: 'c1', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'c2', createdAt: '2026-02-01T00:00:00.000Z' },
  ];

  it('hides extras on Free (shows oldest 1)', () => {
    expect(selectVisibleChildren(kids, 'free').map((k) => k.id)).toEqual(['c1']);
  });

  it('hides extras on Standard beyond 3', () => {
    const six = [
      ...kids,
      { id: 'c4', createdAt: '2026-04-01T00:00:00.000Z' },
      { id: 'c5', createdAt: '2026-05-01T00:00:00.000Z' },
      { id: 'c6', createdAt: '2026-06-01T00:00:00.000Z' },
    ];
    expect(selectVisibleChildren(six, 'personal').map((k) => k.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('allows up to 6 on Family', () => {
    const six = [
      ...kids,
      { id: 'c4', createdAt: '2026-04-01T00:00:00.000Z' },
      { id: 'c5', createdAt: '2026-05-01T00:00:00.000Z' },
      { id: 'c6', createdAt: '2026-06-01T00:00:00.000Z' },
    ];
    expect(selectVisibleChildren(six, 'family')).toHaveLength(6);
  });
});

describe('canAddChildForRole', () => {
  it('blocks invitees from adding while on Family', () => {
    expect(
      canAddChildForRole({
        tier: 'family',
        currentVisibleOrFederatedCount: 2,
        isFamilyPlanOwner: false,
      }),
    ).toBe(false);
  });

  it('allows Family owner within the 6-cap', () => {
    expect(
      canAddChildForRole({
        tier: 'family',
        currentVisibleOrFederatedCount: 5,
        isFamilyPlanOwner: true,
      }),
    ).toBe(true);
    expect(
      canAddChildForRole({
        tier: 'family',
        currentVisibleOrFederatedCount: 6,
        isFamilyPlanOwner: true,
      }),
    ).toBe(false);
  });

  it('uses Free/Standard caps for non-family', () => {
    expect(
      canAddChildForRole({
        tier: 'free',
        currentVisibleOrFederatedCount: 0,
        isFamilyPlanOwner: false,
      }),
    ).toBe(true);
    expect(
      canAddChildForRole({
        tier: 'personal',
        currentVisibleOrFederatedCount: 3,
        isFamilyPlanOwner: true,
      }),
    ).toBe(false);
  });
});
