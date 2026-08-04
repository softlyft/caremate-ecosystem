import { Redirect, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BrandLoader } from '@/components/ui/BrandLoader';
import { markNavigationRestoreComplete, takeLastAppHref } from '@/domains/navigation';
import { useAuthStore } from '@/features/auth/store';
import { authService } from '@/services/auth-service';
import { palette } from '@/theme';

export default function Index() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const passwordRecoveryPending = useAuthStore((state) => state.passwordRecoveryPending);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [restoreHref, setRestoreHref] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    let mounted = true;
    void authService.isOnboardingComplete().then((complete) => {
      if (mounted) {
        setOnboardingComplete(complete);
      }
    });
    return () => {
      mounted = false;
    };
  }, [isInitialized]);

  useEffect(() => {
    if (!isInitialized || onboardingComplete === null) {
      return;
    }

    // Auth / onboarding exits never consume a last route — still release the gate
    // so NavigationPersistence can run once the user reaches the app shell.
    if (passwordRecoveryPending || onboardingComplete === false) {
      setRestoreHref(null);
      markNavigationRestoreComplete();
      return;
    }

    let mounted = true;
    void takeLastAppHref().then((href) => {
      if (!mounted) {
        return;
      }
      setRestoreHref(href);
      // Consume-once finished (href or null). Allow persistence of subsequent routes.
      markNavigationRestoreComplete();
    });
    return () => {
      mounted = false;
    };
  }, [isInitialized, onboardingComplete, passwordRecoveryPending]);

  if (!isInitialized || onboardingComplete === null) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.surface,
        }}
      >
        <BrandLoader size="lg" />
      </View>
    );
  }

  if (passwordRecoveryPending) {
    return <Redirect href="/auth/reset-password" />;
  }

  if (!onboardingComplete) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  if (restoreHref === undefined) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.surface,
        }}
      >
        <BrandLoader size="lg" />
      </View>
    );
  }

  if (restoreHref) {
    return <Redirect href={restoreHref as Href} />;
  }

  return <Redirect href="/(app)/(tabs)" />;
}
