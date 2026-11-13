import { waitUntil } from './processing-claim';

describe('waitUntil', () => {
  it('returns the first non-null probe result', async () => {
    let calls = 0;
    const value = await waitUntil(
      () => {
        calls += 1;
        return Promise.resolve(calls >= 2 ? { ok: true } : null);
      },
      {
        timeoutMs: 1_000,
        intervalMs: 1,
        sleep: () => Promise.resolve(),
      },
    );
    expect(value).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('returns null when the deadline elapses', async () => {
    const value = await waitUntil(() => Promise.resolve(null), {
      timeoutMs: 5,
      intervalMs: 1,
      sleep: () => Promise.resolve(),
    });
    expect(value).toBeNull();
  });
});
