import { Stack } from 'expo-router';

import { useTranslation } from '@/domains/localization';
import { MiniAppGuestGate } from '@/features/premium/MiniAppGuestGate';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { miniAppHeaderOptions } from '@/mini-apps/_kit/components/miniAppHeaderOptions';

export default function AppsLayout() {
  const isGuest = useIsGuest();
  const { t } = useTranslation();

  if (isGuest) {
    return <MiniAppGuestGate />;
  }

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="vitals-tracker/index"
        options={miniAppHeaderOptions({
          appId: 'vitals-tracker',
          title: 'Vitals',
          backAccessibilityLabel: 'Back to Apps',
        })}
      />
      <Stack.Screen
        name="vitals-tracker/log"
        options={miniAppHeaderOptions({
          appId: 'vitals-tracker',
          title: 'Log Vital',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />

      <Stack.Screen
        name="period-tracker/index"
        options={miniAppHeaderOptions({
          appId: 'period-tracker',
          title: 'Period Tracker',
          backAccessibilityLabel: 'Back to Apps',
        })}
      />
      <Stack.Screen
        name="period-tracker/log"
        options={miniAppHeaderOptions({
          appId: 'period-tracker',
          title: 'Log Period',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />

      <Stack.Screen
        name="pregnancy-tracker/index"
        options={miniAppHeaderOptions({
          appId: 'pregnancy-tracker',
          title: 'Pregnancy Tracker',
          backAccessibilityLabel: 'Back to Apps',
        })}
      />
      <Stack.Screen
        name="pregnancy-tracker/setup"
        options={miniAppHeaderOptions({
          appId: 'pregnancy-tracker',
          title: 'Set Up Pregnancy',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />
      <Stack.Screen
        name="pregnancy-tracker/log"
        options={miniAppHeaderOptions({
          appId: 'pregnancy-tracker',
          title: 'Daily Log',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />

      <Stack.Screen
        name="immunization-tracker/index"
        options={miniAppHeaderOptions({
          appId: 'immunization-tracker',
          title: 'Immunization Tracker',
          backAccessibilityLabel: 'Back to Apps',
        })}
      />
      <Stack.Screen
        name="immunization-tracker/setup"
        options={miniAppHeaderOptions({
          appId: 'immunization-tracker',
          title: 'Family children',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />
      <Stack.Screen
        name="immunization-tracker/log"
        options={miniAppHeaderOptions({
          appId: 'immunization-tracker',
          title: 'Log Vaccine',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />

      <Stack.Screen
        name="medication-tracker/index"
        options={miniAppHeaderOptions({
          appId: 'medication-tracker',
          title: t('apps.medicationTracker.screenTitle'),
          backAccessibilityLabel: t('apps.medicationTracker.backToApps'),
        })}
      />
      <Stack.Screen
        name="medication-tracker/setup"
        options={miniAppHeaderOptions({
          appId: 'medication-tracker',
          title: t('apps.medicationTracker.setupTitle'),
          modal: true,
          backAccessibilityLabel: t('apps.medicationTracker.close'),
        })}
      />
      <Stack.Screen
        name="medication-tracker/log"
        options={miniAppHeaderOptions({
          appId: 'medication-tracker',
          title: t('apps.medicationTracker.logTitle'),
          modal: true,
          backAccessibilityLabel: t('apps.medicationTracker.close'),
        })}
      />
      <Stack.Screen
        name="medication-tracker/history"
        options={miniAppHeaderOptions({
          appId: 'medication-tracker',
          title: t('apps.medicationTracker.historyTitle'),
          backAccessibilityLabel: t('apps.medicationTracker.back'),
        })}
      />

      <Stack.Screen
        name="checkup-planner/index"
        options={miniAppHeaderOptions({
          appId: 'checkup-planner',
          title: 'Checkup Planner',
          backAccessibilityLabel: 'Back to Apps',
        })}
      />
      <Stack.Screen
        name="checkup-planner/setup"
        options={miniAppHeaderOptions({
          appId: 'checkup-planner',
          title: 'Set Up Planner',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />
      <Stack.Screen
        name="checkup-planner/log"
        options={miniAppHeaderOptions({
          appId: 'checkup-planner',
          title: 'Log Checkup',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />
    </Stack>
  );
}
