import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppCta,
  MiniAppHero,
  MiniAppScreen,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import {
  DEFAULT_UNIT_PREFS,
  type BloodSugarUnit,
  type HeightUnit,
  type TemperatureUnit,
  type VitalUnitPrefs,
  type WeightUnit,
} from '@/mini-apps/vitals-tracker/constants';
import { localizeUnitChip } from '@/mini-apps/vitals-tracker/localize';
import {
  useVitalsTrackerHydrated,
  useVitalsTrackerStore,
} from '@/mini-apps/vitals-tracker/store';
import { palette, spacing } from '@/theme';

const APP_ID = 'vitals-tracker' as const;

export default function VitalsSetupScreen() {
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
  const hydrated = useVitalsTrackerHydrated();
  const storedPrefs = useVitalsTrackerStore((state) => state.unitPrefs);
  const completeSetup = useVitalsTrackerStore((state) => state.completeSetup);

  const [prefs, setPrefs] = useState<VitalUnitPrefs>(() => ({
    ...DEFAULT_UNIT_PREFS,
    ...storedPrefs,
  }));

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={t('apps.vitalsTracker.eyebrow')}
        title={t('apps.vitalsTracker.setupTitle')}
        subtitle={t('apps.vitalsTracker.setupSubtitle')}
      />

      <MiniAppCard index={1} title={t('apps.vitals.types.blood_sugar')} theme={theme}>
        <AppText variant="caption" style={styles.hint}>
          {t('apps.vitals.ui.setupSugarHint')}
        </AppText>
        <View style={styles.chipRow}>
          {(['mg_dl', 'mmol_l'] as BloodSugarUnit[]).map((unit) => (
            <MiniAppChip
              key={unit}
              label={localizeUnitChip(unit, t)}
              selected={prefs.blood_sugar === unit}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setPrefs((prev) => ({ ...prev, blood_sugar: unit }))}
            />
          ))}
        </View>
      </MiniAppCard>

      <MiniAppCard index={2} title={t('apps.vitals.types.body_temperature')} theme={theme}>
        <View style={styles.chipRow}>
          {(['c', 'f'] as TemperatureUnit[]).map((unit) => (
            <MiniAppChip
              key={unit}
              label={localizeUnitChip(unit, t)}
              selected={prefs.body_temperature === unit}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setPrefs((prev) => ({ ...prev, body_temperature: unit }))}
            />
          ))}
        </View>
      </MiniAppCard>

      <MiniAppCard index={3} title={t('apps.vitals.types.weight')} theme={theme}>
        <View style={styles.chipRow}>
          {(['kg', 'lbs'] as WeightUnit[]).map((unit) => (
            <MiniAppChip
              key={unit}
              label={localizeUnitChip(unit, t)}
              selected={prefs.weight === unit}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setPrefs((prev) => ({ ...prev, weight: unit }))}
            />
          ))}
        </View>
      </MiniAppCard>

      <MiniAppCard index={4} title={t('apps.vitals.types.height')} theme={theme}>
        <View style={styles.chipRow}>
          {(['cm', 'ft'] as HeightUnit[]).map((unit) => (
            <MiniAppChip
              key={unit}
              label={localizeUnitChip(unit, t)}
              selected={prefs.height === unit}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setPrefs((prev) => ({ ...prev, height: unit }))}
            />
          ))}
        </View>
      </MiniAppCard>

      <MiniAppCta
        label={t('apps.vitalsTracker.setupSave')}
        accent={theme.color}
        soft={theme.backgroundColor}
        onPress={() => {
          completeSetup(prefs);
          router.replace('/(app)/apps/vitals-tracker');
        }}
      />
    </MiniAppScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hint: {
    color: palette.textSecondary,
    marginBottom: spacing.xs,
  },
});
