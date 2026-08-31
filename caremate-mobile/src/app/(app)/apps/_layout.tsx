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
          title: t('apps.vitalsTracker.screenTitle'),
          backAccessibilityLabel: t('apps.vitalsTracker.backToApps'),
        })}
      />
      <Stack.Screen
        name="vitals-tracker/log"
        options={miniAppHeaderOptions({
          appId: 'vitals-tracker',
          title: t('apps.vitalsTracker.logTitle'),
          modal: true,
          backAccessibilityLabel: t('apps.vitalsTracker.close'),
        })}
      />
      <Stack.Screen
        name="vitals-tracker/setup"
        options={miniAppHeaderOptions({
          appId: 'vitals-tracker',
          title: t('apps.vitalsTracker.setupTitle'),
          modal: true,
          backAccessibilityLabel: t('apps.vitalsTracker.close'),
        })}
      />

      <Stack.Screen
        name="period-tracker/index"
        options={miniAppHeaderOptions({
          appId: 'period-tracker',
          title: t('apps.periodTracker.screenTitle'),
          backAccessibilityLabel: t('apps.periodTracker.backToApps'),
        })}
      />
      <Stack.Screen
        name="period-tracker/log"
        options={miniAppHeaderOptions({
          appId: 'period-tracker',
          title: t('apps.periodTracker.logTitle'),
          modal: true,
          backAccessibilityLabel: t('apps.periodTracker.close'),
        })}
      />

      <Stack.Screen
        name="pregnancy-tracker/index"
        options={miniAppHeaderOptions({
          appId: 'pregnancy-tracker',
          title: t('apps.pregnancyTracker.screenTitle'),
          backAccessibilityLabel: t('apps.pregnancyTracker.backToApps'),
        })}
      />
      <Stack.Screen
        name="pregnancy-tracker/setup"
        options={miniAppHeaderOptions({
          appId: 'pregnancy-tracker',
          title: t('apps.pregnancyTracker.setupTitle'),
          modal: true,
          backAccessibilityLabel: t('apps.pregnancyTracker.close'),
        })}
      />
      <Stack.Screen
        name="pregnancy-tracker/log"
        options={miniAppHeaderOptions({
          appId: 'pregnancy-tracker',
          title: t('apps.pregnancyTracker.logTitle'),
          modal: true,
          backAccessibilityLabel: t('apps.pregnancyTracker.close'),
        })}
      />
      <Stack.Screen
        name="pregnancy-tracker/tt"
        options={miniAppHeaderOptions({
          appId: 'pregnancy-tracker',
          title: t('apps.pregnancyTracker.ttTitle'),
          modal: true,
          backAccessibilityLabel: t('apps.pregnancyTracker.close'),
        })}
      />
      <Stack.Screen
        name="pregnancy-tracker/birth"
        options={miniAppHeaderOptions({
          appId: 'pregnancy-tracker',
          title: t('apps.pregnancyTracker.birthTitle'),
          modal: true,
          backAccessibilityLabel: t('apps.pregnancyTracker.close'),
        })}
      />

      <Stack.Screen
        name="immunization-tracker/index"
        options={miniAppHeaderOptions({
          appId: 'immunization-tracker',
          title: t('apps.immunizationTracker.screenTitle'),
          backAccessibilityLabel: t('apps.immunizationTracker.backToApps'),
        })}
      />
      <Stack.Screen
        name="immunization-tracker/setup"
        options={miniAppHeaderOptions({
          appId: 'immunization-tracker',
          title: t('apps.immunizationTracker.setupTitle'),
          modal: true,
          backAccessibilityLabel: t('apps.immunizationTracker.close'),
        })}
      />
      <Stack.Screen
        name="immunization-tracker/log"
        options={miniAppHeaderOptions({
          appId: 'immunization-tracker',
          title: t('apps.immunizationTracker.logTitle'),
          modal: true,
          backAccessibilityLabel: t('apps.immunizationTracker.close'),
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
          title: t('apps.checkupPlanner.screenTitle'),
          backAccessibilityLabel: t('apps.checkupPlanner.backToApps'),
        })}
      />
      <Stack.Screen
        name="checkup-planner/setup"
        options={miniAppHeaderOptions({
          appId: 'checkup-planner',
          title: t('apps.checkupPlanner.setupTitle'),
          modal: true,
          backAccessibilityLabel: t('apps.checkupPlanner.close'),
        })}
      />
      <Stack.Screen
        name="checkup-planner/log"
        options={miniAppHeaderOptions({
          appId: 'checkup-planner',
          title: t('apps.checkupPlanner.logTitle'),
          modal: true,
          backAccessibilityLabel: t('apps.checkupPlanner.close'),
        })}
      />
    </Stack>
  );
}
