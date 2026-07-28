import { remainingSecondsUntil } from '@/hooks/use-resend-cooldown';

describe('remainingSecondsUntil', () => {
  it('computes remaining seconds from a wall-clock deadline', () => {
    const now = 1_000_000;
    expect(remainingSecondsUntil(now + 45_000, now)).toBe(45);
    expect(remainingSecondsUntil(now + 1_200, now)).toBe(2);
    expect(remainingSecondsUntil(now - 5_000, now)).toBe(0);
    expect(remainingSecondsUntil(null, now)).toBe(0);
  });
});
