import { router, useNavigation } from 'expo-router';
import { useEffect } from 'react';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
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
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: t('apps.openFamily') });
  }, [navigation, t]);

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={t('apps.immunizationTracker.eyebrow')}
        title={t('apps.immunizationTracker.childrenFromFamilyTitle')}
        subtitle={t('apps.immunizationTracker.childrenFromFamilySubtitle')}
      />

      <MiniAppCard
        index={1}
        title={t('apps.immunization.ui.whereToGo')}
        eyebrow={t('apps.immunization.ui.nextSteps')}
        theme={theme}
      >
        <AppText variant="subtitle">{t('apps.immunization.ui.familySetupExplainer')}</AppText>
      </MiniAppCard>

      <MiniAppCta
        label={t('apps.goToFamilySetup')}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={2}
        onPress={() => router.replace('/(app)/family/setup')}
      />
      <MiniAppCta
        label={t('apps.openFamily')}
        accent={theme.color}
        soft={theme.backgroundColor}
        secondary
        index={3}
        onPress={() => router.replace('/(app)/family')}
      />
      <MiniAppCta
        label={t('apps.backToTracker')}
        accent={theme.color}
        soft={theme.backgroundColor}
        secondary
        index={4}
        onPress={() => router.back()}
      />
    </MiniAppScreen>
  );
}
