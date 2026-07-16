import { router, useNavigation } from 'expo-router';
import { useEffect } from 'react';

import { AppText } from '@/components/ui/AppText';
import {
  MiniAppCard,
  MiniAppCta,
  MiniAppHero,
  MiniAppScreen,
  getMiniAppTheme,
} from '@/mini-apps/_kit';

const APP_ID = 'immunization-tracker' as const;

/**
 * Children are managed in Family — this route only redirects users there.
 */
export default function ImmunizationSetupScreen() {
  const theme = getMiniAppTheme(APP_ID);
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'Family children' });
  }, [navigation]);

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow="Immunization"
        title="Children come from Family"
        subtitle="You can’t add a child here. Set up your family profile and add kids with date of birth, then return to Immunization Tracker."
      />

      <MiniAppCard index={1} title="Where to go" eyebrow="Next steps" theme={theme}>
        <AppText variant="subtitle">
          Family setup collects date of birth for each child — that’s what powers the vaccine
          schedule.
        </AppText>
      </MiniAppCard>

      <MiniAppCta
        label="Go to family setup"
        accent={theme.color}
        soft={theme.backgroundColor}
        index={2}
        onPress={() => router.replace('/(app)/family/setup')}
      />
      <MiniAppCta
        label="Open family"
        accent={theme.color}
        soft={theme.backgroundColor}
        secondary
        index={3}
        onPress={() => router.replace('/(app)/family')}
      />
      <MiniAppCta
        label="Back to tracker"
        accent={theme.color}
        soft={theme.backgroundColor}
        secondary
        index={4}
        onPress={() => router.back()}
      />
    </MiniAppScreen>
  );
}
