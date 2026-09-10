import { selectActiveHouseholdId } from '@/domains/family/active-household';

describe('selectActiveHouseholdId', () => {
  it('prefers an invited spouse membership over a leftover solo self household', () => {
    expect(
      selectActiveHouseholdId([
        { kind: 'self', householdId: 'solo' },
        { kind: 'spouse', householdId: 'joined' },
      ]),
    ).toBe('joined');
  });

  it('uses self when the user has not joined another household', () => {
    expect(selectActiveHouseholdId([{ kind: 'self', householdId: 'solo' }])).toBe('solo');
  });

  it('returns null when there are no memberships', () => {
    expect(selectActiveHouseholdId([])).toBeNull();
  });
});
