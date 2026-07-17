import { Stack } from 'expo-router';

import { MiniAppGuestGate } from '@/features/premium/MiniAppGuestGate';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { miniAppHeaderOptions } from '@/mini-apps/_kit/components/miniAppHeaderOptions';

export default function AppsLayout() {
  const isGuest = useIsGuest();

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
          title: 'Medication Tracker',
          backAccessibilityLabel: 'Back to Apps',
        })}
      />
      <Stack.Screen
        name="medication-tracker/setup"
        options={miniAppHeaderOptions({
          appId: 'medication-tracker',
          title: 'Add Medicine',
          modal: true,
          backAccessibilityLabel: 'Close',
        })}
      />
      <Stack.Screen
        name="medication-tracker/log"
        options={miniAppHeaderOptions({
          appId: 'medication-tracker',
          title: 'Log Dose',
          modal: true,
          backAccessibilityLabel: 'Close',
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
