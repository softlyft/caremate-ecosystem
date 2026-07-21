import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BrandLoader } from '@/components/ui/BrandLoader';
import { useAuthStore } from '@/features/auth/store';
import { authService } from '@/services/auth-service';
import { palette } from '@/theme';

export default function Index() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
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

  if (!onboardingComplete) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(app)/(tabs)" />;
}
