import { isMiniAppPayloadEmpty } from '@/mini-apps/_kit/hydrate';

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
});
