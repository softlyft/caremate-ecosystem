import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus, Modal, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { useAuthStore } from '@/features/auth/store';
import { authService } from '@/services/auth-service';
import { palette, spacing } from '@/theme';

/**
 * When biometrics are enabled, require a successful LocalAuthentication
 * challenge after cold start and when returning from background.
 */
export function BiometricLockGate({ children }: { children: ReactNode }) {
  const biometricEnabled = useAuthStore((state) => state.biometricEnabled);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isGuest = useAuthStore((state) => state.isGuest);
  const shouldEnforce = biometricEnabled && isAuthenticated && !isGuest;

  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const locked = shouldEnforce && !unlocked;

  useEffect(() => {
    if (!shouldEnforce) {
      return;
    }

    let cancelled = false;

    async function challenge() {
      setBusy(true);
      try {
        const available = await authService.isBiometricAvailable();
        if (!available) {
          if (!cancelled) setUnlocked(true);
          return;
        }
        const ok = await authService.authenticateWithBiometrics();
        if (!cancelled) setUnlocked(ok);
      } catch {
        if (!cancelled) setUnlocked(false);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    void challenge();

    const onChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === 'active' && prev === 'background') {
        setUnlocked(false);
        void challenge();
      } else if (next === 'background') {
        setUnlocked(false);
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [shouldEnforce]);

  return (
    <>
      {children}
      <Modal visible={locked} animationType="fade" presentationStyle="fullScreen">
        <View style={styles.screen}>
          <AppText variant="cardTitle" style={styles.title}>
            Unlock CareMate
          </AppText>
          <AppText variant="body" style={styles.body}>
            Confirm it&apos;s you to continue.
          </AppText>
          <Button
            label={busy ? 'Waiting…' : 'Unlock'}
            onPress={() => {
              void (async () => {
                setBusy(true);
                try {
                  const ok = await authService.authenticateWithBiometrics();
                  setUnlocked(ok);
                } finally {
                  setBusy(false);
                }
              })();
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: palette.surface,
    gap: spacing.md,
  },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', marginBottom: spacing.md },
});
