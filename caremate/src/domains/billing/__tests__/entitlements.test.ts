import { AD_SLOTS } from '@/domains/ads/types';
import {
  FREE_MEDICATION_LIMIT,
  canActivateMedication,
  canAddChild,
  canAddMedication,
  canConnectSpouse,
  canUseMiniApps,
  isCheckupItemUnlocked,
  isCheckupYearUnlocked,
  isImmunizationScheduleItemUnlocked,
  shouldSuppressAdForUser,
} from '@/domains/billing/entitlements';

describe('billing entitlements', () => {
  it('blocks mini-apps for guests', () => {
    expect(canUseMiniApps(true)).toBe(false);
    expect(canUseMiniApps(false)).toBe(true);
  });

  it('limits medications on free tier', () => {
    expect(canAddMedication('free', FREE_MEDICATION_LIMIT - 1)).toBe(true);
    expect(canAddMedication('free', FREE_MEDICATION_LIMIT)).toBe(false);
    expect(canAddMedication('personal', FREE_MEDICATION_LIMIT)).toBe(true);
  });

  it('blocks reactivating medications beyond free limit', () => {
    const meds = [
      { id: 'a', active: true },
      { id: 'b', active: true },
      { id: 'c', active: true },
      { id: 'd', active: false },
    ];
    expect(canActivateMedication('free', meds, 'd', true)).toBe(false);
    expect(canActivateMedication('free', meds, 'a', true)).toBe(true);
    expect(canActivateMedication('personal', meds, 'd', true)).toBe(true);
  });

  it('limits checkups on free tier', () => {
    const currentYear = 2026;
    expect(isCheckupYearUnlocked('free', currentYear, currentYear)).toBe(true);
    expect(isCheckupYearUnlocked('free', currentYear + 1, currentYear)).toBe(false);
    expect(isCheckupItemUnlocked('free', { year: currentYear, indexInYear: 1, currentYear })).toBe(
      true,
    );
    expect(isCheckupItemUnlocked('free', { year: currentYear, indexInYear: 2, currentYear })).toBe(
      false,
    );
    expect(
      isCheckupItemUnlocked('personal', { year: currentYear, indexInYear: 9, currentYear }),
    ).toBe(true);
  });

  it('limits immunization schedule months on free tier', () => {
    expect(isImmunizationScheduleItemUnlocked('free', 8)).toBe(true);
    expect(isImmunizationScheduleItemUnlocked('free', 9)).toBe(false);
    expect(isImmunizationScheduleItemUnlocked('family', 52)).toBe(true);
  });

  it('limits family children and spouse by tier', () => {
    expect(canAddChild('free', 0)).toBe(true);
    expect(canAddChild('free', 1)).toBe(false);
    expect(canAddChild('personal', 1)).toBe(false);
    expect(canAddChild('family', 3)).toBe(true);
    expect(canConnectSpouse('free')).toBe(false);
    expect(canConnectSpouse('personal')).toBe(false);
    expect(canConnectSpouse('family')).toBe(true);
  });

  it('suppresses mini-app ads for premium users', () => {
    expect(shouldSuppressAdForUser('personal', AD_SLOTS.PREGNANCY_TIMELINE, false)).toBe(true);
    expect(shouldSuppressAdForUser('free', AD_SLOTS.PREGNANCY_TIMELINE, false)).toBe(false);
    expect(shouldSuppressAdForUser('personal', AD_SLOTS.HOME_FEED, false)).toBe(false);
  });
});
