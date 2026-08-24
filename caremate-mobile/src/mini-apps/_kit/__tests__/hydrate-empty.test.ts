import { isMiniAppPayloadEmpty } from '@/mini-apps/_kit/payload-empty';

describe('isMiniAppPayloadEmpty', () => {
  it('treats missing and empty objects as empty', () => {
    expect(isMiniAppPayloadEmpty(null)).toBe(true);
    expect(isMiniAppPayloadEmpty(undefined)).toBe(true);
    expect(isMiniAppPayloadEmpty({})).toBe(true);
  });

  it('treats defaults-only vitals state as empty', () => {
    expect(
      isMiniAppPayloadEmpty({
        entries: [],
        unitPrefs: { weight: 'kg' },
        hasCompletedSetup: false,
      }),
    ).toBe(true);
  });

  it('treats completed setup or non-empty lists as meaningful', () => {
    expect(
      isMiniAppPayloadEmpty({
        entries: [],
        unitPrefs: { weight: 'kg' },
        hasCompletedSetup: true,
      }),
    ).toBe(false);

    expect(
      isMiniAppPayloadEmpty({
        entries: [{ id: '1', type: 'weight', value: 70 }],
        unitPrefs: { weight: 'kg' },
        hasCompletedSetup: false,
      }),
    ).toBe(false);
  });

  it('detects nested non-empty content', () => {
    expect(
      isMiniAppPayloadEmpty({
        plansByYear: {
          '2026': [{ id: 'a' }],
        },
      }),
    ).toBe(false);
  });

  it('treats pregnancy LMP/due strings as meaningful even without hasCompletedSetup', () => {
    expect(
      isMiniAppPayloadEmpty({
        lastMenstrualPeriod: '2026-01-01',
        dueDate: null,
        babyNickname: 'Baby',
        hasCompletedSetup: false,
        dailyLogs: {},
      }),
    ).toBe(false);

    expect(
      isMiniAppPayloadEmpty({
        lastMenstrualPeriod: null,
        dueDate: null,
        babyNickname: 'Baby',
        hasCompletedSetup: false,
        dailyLogs: {},
        status: null,
      }),
    ).toBe(true);
  });

  it('treats paused period tracker as meaningful', () => {
    expect(
      isMiniAppPayloadEmpty({
        loggedPeriodDays: [],
        paused: true,
        pausedReason: 'pregnancy',
      }),
    ).toBe(false);
  });

  it('treats checkup profile nested strings as meaningful', () => {
    expect(
      isMiniAppPayloadEmpty({
        profile: { dateOfBirth: '1990-01-01', gender: 'female', regionCode: null },
        completions: [],
      }),
    ).toBe(false);
  });
});
