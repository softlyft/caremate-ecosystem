import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function remainingSecondsUntil(deadlineMs: number | null, nowMs = Date.now()): number {
  if (deadlineMs == null) {
    return 0;
  }
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

/**
 * Resend OTP cooldown based on wall-clock time so backgrounding the app does not
 * pause the countdown (JS timers freeze in the background on many devices).
 */
export function useResendCooldown(cooldownSeconds: number) {
  const [cooldownUntilMs, setCooldownUntilMs] = useState<number | null>(() =>
    cooldownSeconds > 0 ? Date.now() + cooldownSeconds * 1000 : null,
  );
  const [clockMs, setClockMs] = useState(() => Date.now());

  useEffect(() => {
    if (cooldownUntilMs == null) {
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      setClockMs(now);
      if (remainingSecondsUntil(cooldownUntilMs, now) <= 0) {
        setCooldownUntilMs(null);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [cooldownUntilMs]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setClockMs(Date.now());
      }
    });
    return () => sub.remove();
  }, []);

  const startCooldown = useCallback(() => {
    const until = Date.now() + cooldownSeconds * 1000;
    setCooldownUntilMs(until);
    setClockMs(Date.now());
  }, [cooldownSeconds]);

  const resendSeconds = remainingSecondsUntil(cooldownUntilMs, clockMs);

  return { resendSeconds, startCooldown };
}
