import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import {
  MiniAppCard,
  MiniAppCta,
  MiniAppHero,
  MiniAppRow,
  MiniAppScreen,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import { localizeVitalType } from '@/mini-apps/vitals-tracker/localize';
import { useVitalsTrackerHydrated, useVitalsTrackerStore } from '@/mini-apps/vitals-tracker/store';
import {
  formatRecordedAt,
  formatVitalValue,
  getLatestByType,
  getRecentEntries,
  orderedVitalTypes,
} from '@/mini-apps/vitals-tracker/utils';
import { palette } from '@/theme';

const APP_ID = 'vitals-tracker' as const;

export default function VitalsTrackerScreen() {
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
  const hydrated = useVitalsTrackerHydrated();
  const entries = useVitalsTrackerStore((state) => state.entries);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  const latest = getLatestByType(entries);
  const recent = getRecentEntries(entries, 10);
  const hasEntries = entries.length > 0;
  let cardIndex = 1;

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={t('apps.vitalsTracker.eyebrow')}
        title={
          hasEntries ? t('apps.vitalsTracker.titleWithData') : t('apps.vitalsTracker.emptyTitle')
        }
        subtitle={
          hasEntries
            ? t('apps.vitalsTracker.subtitleWithData')
            : t('apps.vitalsTracker.emptySubtitle')
        }
      />

      {hasEntries ? (
        <MiniAppCard
          index={cardIndex++}
          title={t('apps.vitals.ui.latest')}
          eyebrow={t('apps.vitals.ui.balance')}
          theme={theme}
        >
          {orderedVitalTypes().map((type) => {
            const entry = latest[type];
            return (
              <MiniAppRow
                key={type}
                title={localizeVitalType(type, t)}
                subtitle={
                  entry
                    ? `${formatVitalValue(entry)} · ${formatRecordedAt(entry.recordedAt)}`
                    : t('apps.vitals.ui.noReading')
                }
                accent={theme.color}
              />
            );
          })}
        </MiniAppCard>
      ) : null}

      {recent.length > 0 ? (
        <MiniAppCard index={cardIndex++} title={t('apps.vitals.ui.recent')} theme={theme}>
          {recent.map((entry) => (
            <MiniAppRow
              key={entry.id}
              title={localizeVitalType(entry.type, t)}
              subtitle={`${formatVitalValue(entry)} · ${formatRecordedAt(entry.recordedAt)}`}
              accent={theme.color}
            />
          ))}
        </MiniAppCard>
      ) : (
        <MiniAppCard index={cardIndex++} theme={theme}>
          <AppText variant="body" style={styles.emptyHint}>
            {t('apps.vitals.ui.emptyHint')}
          </AppText>
        </MiniAppCard>
      )}

      <MiniAppCta
        label={t('apps.vitalsTracker.logVital')}
        onPress={() => router.push('/(app)/apps/vitals-tracker/log')}
        accent={theme.color}
        soft={theme.backgroundColor}
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
  emptyHint: {
    color: palette.textSecondary,
    lineHeight: 22,
  },
});
