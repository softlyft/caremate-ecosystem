import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppHero,
  MiniAppRow,
  MiniAppScreen,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import {
  useMedicationTrackerHydrated,
  useMedicationTrackerStore,
} from '@/mini-apps/medication-tracker/store';
import {
  formatDisplayDate,
  groupLogsByDate,
  normalizeMedication,
} from '@/mini-apps/medication-tracker/utils';
import {
  localizeFrequencyLabel,
  localizeMedicationPatient,
} from '@/mini-apps/medication-tracker/localize';
import { palette, spacing } from '@/theme';

const theme = getMiniAppTheme('medication-tracker');

type HistoryFilter = 'all' | string;

export default function MedicationHistoryScreen() {
  const { t } = useTranslation();
  const hydrated = useMedicationTrackerHydrated();
  const medicationsRaw = useMedicationTrackerStore((state) => state.medications);
  const logs = useMedicationTrackerStore((state) => state.logs);
  const medications = useMemo(() => medicationsRaw.map(normalizeMedication), [medicationsRaw]);
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const filteredLogs = useMemo(() => {
    if (filter === 'all') {
      return logs;
    }
    return logs.filter((log) => log.medicationId === filter);
  }, [logs, filter]);

  const groups = useMemo(
    () => groupLogsByDate(filteredLogs, medications).slice(0, 30),
    [filteredLogs, medications],
  );

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
        appId="medication-tracker"
        eyebrow={t('apps.medicationTracker.eyebrow')}
        title={t('apps.medicationTracker.history')}
        subtitle={t('apps.medication.ui.historySubtitle')}
      />

      <MiniAppCard index={1} title={t('apps.medication.ui.medicine')} theme={theme}>
        <View style={styles.chipRow}>
          <MiniAppChip
            label={t('common.all')}
            selected={filter === 'all'}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={() => setFilter('all')}
          />
          {medications.map((medication) => (
            <MiniAppChip
              key={medication.id}
              label={medication.name}
              selected={filter === medication.id}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setFilter(medication.id)}
            />
          ))}
        </View>
      </MiniAppCard>

      {groups.length === 0 ? (
        <MiniAppCard index={2} theme={theme}>
          <AppText variant="body" style={styles.muted}>
            {t('apps.medication.ui.historyEmpty')}
          </AppText>
        </MiniAppCard>
      ) : (
        groups.map((group, index) => (
          <MiniAppCard
            key={group.dateKey}
            index={index + 2}
            title={formatDisplayDate(group.dateKey)}
            theme={theme}
          >
            {group.items.map(({ log, medication }) => (
              <MiniAppRow
                key={log.id}
                title={medication?.name ?? t('apps.medication.ui.unknownMedicine')}
                subtitle={[
                  medication ? localizeMedicationPatient(medication, t) : null,
                  medication ? localizeFrequencyLabel(medication.frequency, t) : null,
                  log.notes,
                  log.takenAt
                    ? new Date(log.takenAt).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                soft={theme.backgroundColor}
              />
            ))}
          </MiniAppCard>
        ))
      )}
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
  },
  muted: {
    color: palette.textSecondary,
  },
});
