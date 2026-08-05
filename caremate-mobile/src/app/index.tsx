import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BrandLoader } from '@/components/ui/BrandLoader';
import { clearLastAppHref } from '@/domains/navigation';
import { useAuthStore } from '@/features/auth/store';
import { authService } from '@/services/auth-service';
import { palette } from '@/theme';

export default function Index() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const passwordRecoveryPending = useAuthStore((state) => state.passwordRecoveryPending);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

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
    // Drop any legacy cold-start route snapshot — full relaunch always starts at Home.
    void clearLastAppHref();
    return () => {
      mounted = false;
    };
  }, [isInitialized]);

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

  return <Redirect href="/(app)/(tabs)" />;
}
