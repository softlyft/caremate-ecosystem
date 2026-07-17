import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { canAddMedication, countActiveMedications } from '@/domains/billing/entitlements';
import { useTranslation } from '@/domains/localization';
import { UpgradePrompt } from '@/features/premium/UpgradePrompt';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppCta,
  MiniAppHero,
  MiniAppProgress,
  MiniAppRow,
  MiniAppScreen,
  StatusPill,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import {
  useMedicationTrackerHydrated,
  useMedicationTrackerStore,
} from '@/mini-apps/medication-tracker/store';
import {
  buildDaySlots,
  formatDisplayDate,
  getDaySummary,
  toDateKey,
  type DoseSlotStatus,
  type Medication,
} from '@/mini-apps/medication-tracker/utils';
import {
  localizeDoseSlotLabel,
  localizeFrequencyLabel,
  localizeMedicationPatient,
  localizeMedicationStatus,
} from '@/mini-apps/medication-tracker/localize';
import { pluralKey } from '@/mini-apps/_kit/i18n';
import { usePremiumTier } from '@/hooks/use-premium-state';
import { palette, spacing } from '@/theme';

const theme = getMiniAppTheme('medication-tracker');

const STATUS_COLORS: Record<DoseSlotStatus, string> = {
  taken: '#059669',
  due: '#D97706',
  missed: '#DC2626',
  upcoming: '#6B7280',
  'as-needed': '#0369A1',
};

const STATUS_BACKGROUNDS: Record<DoseSlotStatus, string> = {
  taken: '#D1FAE5',
  due: '#FEF3C7',
  missed: '#FEE2E2',
  upcoming: '#F3F4F6',
  'as-needed': '#E0F2FE',
};

type PatientFilter = 'all' | 'self' | string;

function normalizeMed(medication: Medication): Medication {
  return {
    ...medication,
    forKid: Boolean(medication.forKid),
    familyMemberId: medication.familyMemberId ?? null,
    patientName: medication.patientName ?? null,
  };
}

export default function MedicationTrackerScreen() {
  const { t } = useTranslation();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const hydrated = useMedicationTrackerHydrated();
  const [patientFilter, setPatientFilter] = useState<PatientFilter>('all');
  const tier = usePremiumTier();

  const medicationsRaw = useMedicationTrackerStore((state) => state.medications);
  const logs = useMedicationTrackerStore((state) => state.logs);
  const logDose = useMedicationTrackerStore((state) => state.logDose);
  const removeDoseLog = useMedicationTrackerStore((state) => state.removeDoseLog);

  const medications = useMemo(() => medicationsRaw.map(normalizeMed), [medicationsRaw]);
  const activeMedicationCount = countActiveMedications(medications);
  const canAddMoreMedications = canAddMedication(tier, activeMedicationCount);

  const patientChips = useMemo(() => {
    const kids = new Map<string, string>();
    for (const medication of medications) {
      if (medication.forKid && medication.familyMemberId) {
        kids.set(medication.familyMemberId, localizeMedicationPatient(medication, t));
      }
    }
    return Array.from(kids.entries()).map(([id, name]) => ({ id, name }));
  }, [medications, t]);

  const filteredMedications = useMemo(() => {
    if (patientFilter === 'all') {
      return medications;
    }
    if (patientFilter === 'self') {
      return medications.filter((medication) => !medication.forKid);
    }
    return medications.filter(
      (medication) => medication.forKid && medication.familyMemberId === patientFilter,
    );
  }, [medications, patientFilter]);

  const activeMeds = useMemo(
    () => filteredMedications.filter((med) => med.active),
    [filteredMedications],
  );
  const todaySlots = useMemo(
    () => buildDaySlots(activeMeds, logs, todayKey, today),
    [activeMeds, logs, todayKey, today],
  );
  const summary = getDaySummary(todaySlots);
  const hasMedications = medications.length > 0;
  const showPatientFilters =
    hasMedications &&
    (patientChips.length > 0 || medications.some((medication) => medication.forKid));

  const heroTitle = hasMedications
    ? summary.expected > 0
      ? t('apps.medication.ui.dosesTakenToday', {
          taken: summary.taken,
          expected: summary.expected,
        })
      : summary.taken > 0
        ? t(pluralKey('apps.medication.ui.asNeededLoggedToday', summary.taken), {
            count: summary.taken,
          })
        : t('apps.medication.ui.nothingToday')
    : t('apps.medicationTracker.emptyTitle');

  const heroSubtitle = hasMedications
    ? summary.due > 0
      ? t(pluralKey('apps.medication.ui.dosesStillDue', summary.due), { count: summary.due })
      : summary.missed > 0
        ? t('apps.medication.ui.catchUp')
        : t('apps.medication.ui.upToDate')
    : t('apps.medicationTracker.emptySubtitle');

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId="medication-tracker"
        eyebrow={t('apps.medicationTracker.eyebrow')}
        title={heroTitle}
        subtitle={heroSubtitle}
      />

      {showPatientFilters ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(
            [
              { id: 'all' as const, label: t('common.all') },
              { id: 'self' as const, label: t('apps.medication.ui.you') },
              ...patientChips.map((kid) => ({ id: kid.id as PatientFilter, label: kid.name })),
            ] as { id: PatientFilter; label: string }[]
          ).map((chip) => (
            <MiniAppChip
              key={String(chip.id)}
              label={chip.label}
              selected={patientFilter === chip.id}
              onPress={() => setPatientFilter(chip.id)}
              accent={theme.color}
              soft={theme.backgroundColor}
            />
          ))}
        </ScrollView>
      ) : null}

      {hasMedications ? (
        <MiniAppCard index={1} theme={theme}>
          <View style={styles.summaryRow}>
            <AppText variant="body">{t('apps.medication.ui.today')}</AppText>
            <AppText variant="body">{formatDisplayDate(todayKey)}</AppText>
          </View>
          <View style={styles.summaryRow}>
            <AppText variant="body">{t('apps.medication.ui.activeMedicines')}</AppText>
            <AppText variant="body">{activeMeds.length}</AppText>
          </View>
          {summary.expected > 0 ? (
            <MiniAppProgress progress={summary.progress} accent={theme.color} />
          ) : null}
        </MiniAppCard>
      ) : null}

      {hasMedications ? (
        <MiniAppCard index={2} title={t('apps.medicationTracker.todaysDoses')} theme={theme}>
          {todaySlots.length === 0 ? (
            <AppText variant="caption" style={styles.muted}>
              {t('apps.medication.ui.emptyFilter')}
            </AppText>
          ) : (
            todaySlots.map((slot) => {
              const key = `${slot.medication.id}-${slot.slotIndex}-${slot.log?.id ?? 'open'}`;
              const canToggle =
                slot.status === 'due' || slot.status === 'taken' || slot.status === 'as-needed';
              const patient = localizeMedicationPatient(normalizeMed(slot.medication), t);
              return (
                <MiniAppRow
                  key={key}
                  title={`${slot.medication.name}${slot.medication.dosage ? ` · ${slot.medication.dosage}` : ''}`}
                  subtitle={`${patient} · ${localizeDoseSlotLabel(slot, t)}${
                    slot.status === 'taken'
                      ? ` · ${t('apps.medication.ui.tapToUndo')}`
                      : canToggle
                        ? ` · ${t('apps.medication.ui.tapToMarkTaken')}`
                        : ''
                  }`}
                  soft={STATUS_BACKGROUNDS[slot.status]}
                  onPress={
                    hydrated && canToggle
                      ? () => {
                          if (slot.log) {
                            removeDoseLog(slot.log.id);
                            return;
                          }
                          logDose({
                            medicationId: slot.medication.id,
                            dateKey: slot.dateKey,
                            slotIndex: slot.slotIndex,
                          });
                        }
                      : undefined
                  }
                  trailing={
                    <StatusPill
                      label={localizeMedicationStatus(slot.status, t)}
                      color={STATUS_COLORS[slot.status]}
                      background={STATUS_BACKGROUNDS[slot.status]}
                    />
                  }
                />
              );
            })
          )}
        </MiniAppCard>
      ) : null}

      {hasMedications ? (
        <MiniAppCard index={3} title={t('apps.medicationTracker.medicines')} theme={theme}>
          {filteredMedications.map((medication) => (
            <MiniAppRow
              key={medication.id}
              title={`${medication.name}${!medication.active ? ` ${t('apps.medication.ui.pausedSuffix')}` : ''}`}
              subtitle={`${localizeMedicationPatient(medication, t)}${
                medication.dosage ? ` · ${medication.dosage}` : ''
              } · ${localizeFrequencyLabel(medication.frequency, t)}`}
              soft={theme.backgroundColor}
              onPress={() =>
                router.push({
                  pathname: '/(app)/apps/medication-tracker/setup',
                  params: { medicationId: medication.id },
                })
              }
              trailing={
                <AppText variant="caption" style={{ color: theme.color, fontWeight: '600' }}>
                  {t('apps.edit')}
                </AppText>
              }
            />
          ))}
        </MiniAppCard>
      ) : null}

      {!canAddMoreMedications ? (
        <UpgradePrompt
          title={t('profile.premium.medicationLimitTitle')}
          message={t('profile.premium.medicationLimitMessage')}
        />
      ) : null}

      <MiniAppCta
        label={t('apps.medicationTracker.addMedicine')}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={4}
        onPress={() => {
          if (!hydrated || !canAddMoreMedications) {
            return;
          }
          router.push('/(app)/apps/medication-tracker/setup');
        }}
      />
      {hasMedications ? (
        <MiniAppCta
          label={t('apps.medicationTracker.logDose')}
          accent={theme.color}
          soft={theme.backgroundColor}
          secondary
          index={5}
          onPress={() => {
            if (!hydrated) {
              return;
            }
            router.push('/(app)/apps/medication-tracker/log');
          }}
        />
      ) : null}
    </MiniAppScreen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  muted: {
    color: palette.textSecondary,
  },
});
