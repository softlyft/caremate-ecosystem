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
  const [resendSeconds, setResendSeconds] = useState(() =>
    remainingSecondsUntil(cooldownSeconds > 0 ? Date.now() + cooldownSeconds * 1000 : null),
  );

  const syncRemaining = useCallback(() => {
    setResendSeconds((current) => {
      const next = remainingSecondsUntil(cooldownUntilMs);
      return next === current ? current : next;
    });
  }, [cooldownUntilMs]);

  useEffect(() => {
    syncRemaining();
    if (cooldownUntilMs == null) {
      return;
    }
    if (remainingSecondsUntil(cooldownUntilMs) <= 0) {
      setCooldownUntilMs(null);
      return;
    }

    const timer = setInterval(syncRemaining, 250);
    return () => clearInterval(timer);
  }, [cooldownUntilMs, syncRemaining]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncRemaining();
      }
    });
    return () => sub.remove();
  }, [syncRemaining]);

  const startCooldown = useCallback(() => {
    const until = Date.now() + cooldownSeconds * 1000;
    setCooldownUntilMs(until);
    setResendSeconds(remainingSecondsUntil(until));
  }, [cooldownSeconds]);

  return { resendSeconds, startCooldown };
}
