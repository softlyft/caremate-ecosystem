import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import {
  FREE_MEDICATION_LIMIT,
  canAddMedication,
  countActiveMedications,
  isPremiumTier,
} from '@/domains/billing/entitlements';
import { useTranslation } from '@/domains/localization';
import { useSettingsStore } from '@/domains/profile/store';
import { UpgradePrompt } from '@/features/premium/UpgradePrompt';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { usePremiumTier } from '@/hooks/use-premium-state';
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
  type TranslateFn,
} from '@/mini-apps/_kit';
import { evaluateMedicationAlerts } from '@/mini-apps/medication-tracker/alerts';
import {
  buildMedicationAlertCopy,
  localizeDoseSlotLabel,
  localizeFrequencyLabel,
  localizeInstructionsSummary,
  localizeMedicationPatient,
  localizeMedicationStatus,
} from '@/mini-apps/medication-tracker/localize';
import {
  useMedicationTrackerHydrated,
  useMedicationTrackerStore,
} from '@/mini-apps/medication-tracker/store';
import {
  buildDaySlots,
  formatDisplayDate,
  getDaySummary,
  normalizeMedication,
  partitionTodaySlots,
  toDateKey,
  type DoseSlot,
  type DoseSlotStatus,
  type Medication,
} from '@/mini-apps/medication-tracker/utils';
import { pluralKey } from '@/mini-apps/_kit/i18n';
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

function slotSubtitle(slot: DoseSlot, t: TranslateFn) {
  const patient = localizeMedicationPatient(normalizeMedication(slot.medication), t);
  const instructions = localizeInstructionsSummary(slot.medication.instructions, t);
  const bits = [patient, localizeDoseSlotLabel(slot, t)];
  if (slot.medication.dosage) {
    bits.push(slot.medication.dosage);
  }
  if (instructions) {
    bits.push(instructions);
  }
  if (slot.status === 'taken') {
    bits.push(t('apps.medication.ui.tapToUndo'));
  } else if (slot.status === 'due' || slot.status === 'missed' || slot.status === 'as-needed') {
    bits.push(t('apps.medication.ui.tapToMarkTaken'));
  }
  return bits.join(' · ');
}

function DoseSection({
  title,
  slots,
  hydrated,
  onToggle,
  t,
}: {
  title: string;
  slots: DoseSlot[];
  hydrated: boolean;
  onToggle: (slot: DoseSlot) => void;
  t: TranslateFn;
}) {
  if (slots.length === 0) {
    return null;
  }
  return (
    <MiniAppCard index={2} title={title} theme={theme}>
      {slots.map((slot) => {
        const key = `${slot.medication.id}-${slot.slotIndex}-${slot.log?.id ?? 'open'}-${slot.status}`;
        const canToggle =
          slot.status === 'due' ||
          slot.status === 'missed' ||
          slot.status === 'taken' ||
          slot.status === 'as-needed';
        return (
          <MiniAppRow
            key={key}
            title={slot.medication.name}
            subtitle={slotSubtitle(slot, t)}
            soft={STATUS_BACKGROUNDS[slot.status]}
            onPress={hydrated && canToggle ? () => onToggle(slot) : undefined}
            trailing={
              <StatusPill
                label={localizeMedicationStatus(slot.status, t)}
                color={STATUS_COLORS[slot.status]}
                background={STATUS_BACKGROUNDS[slot.status]}
              />
            }
          />
        );
      })}
    </MiniAppCard>
  );
}

export default function MedicationTrackerScreen() {
  const { t } = useTranslation();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const hydrated = useMedicationTrackerHydrated();
  const [patientFilter, setPatientFilter] = useState<PatientFilter>('all');
  const tier = usePremiumTier();
  const userId = useCurrentUserId();
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);

  const medicationsRaw = useMedicationTrackerStore((state) => state.medications);
  const logs = useMedicationTrackerStore((state) => state.logs);
  const logDose = useMedicationTrackerStore((state) => state.logDose);
  const removeDoseLog = useMedicationTrackerStore((state) => state.removeDoseLog);

  const medications = useMemo(
    () => medicationsRaw.map((medication) => normalizeMedication(medication)),
    [medicationsRaw],
  );
  const activeMedicationCount = countActiveMedications(medications);
  const canAddMoreMedications = canAddMedication(tier, activeMedicationCount);

  useFocusEffect(
    useCallback(() => {
      if (!hydrated || !userId) {
        return;
      }
      void evaluateMedicationAlerts({
        userId,
        medications,
        logs,
        notificationsEnabled,
        copy: buildMedicationAlertCopy(t),
      });
    }, [hydrated, userId, medications, logs, notificationsEnabled, t]),
  );

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
  const { dueNow, upcoming, taken } = partitionTodaySlots(todaySlots);
  const summary = getDaySummary(todaySlots);
  const hasMedications = medications.length > 0;
  const showPatientFilters =
    hasMedications &&
    (patientChips.length > 0 || medications.some((medication) => medication.forKid));

  const nextDue = dueNow[0] ?? upcoming.find((slot) => slot.status === 'upcoming');
  const heroTitle = hasMedications
    ? summary.due + summary.missed > 0
      ? t(pluralKey('apps.medication.ui.dueNowCount', summary.due + summary.missed), {
          count: summary.due + summary.missed,
        })
      : summary.expected > 0
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
    ? nextDue
      ? t('apps.medication.ui.nextUp', {
          name: nextDue.medication.name,
          slot: localizeDoseSlotLabel(nextDue, t),
        })
      : t('apps.medication.ui.upToDate')
    : t('apps.medicationTracker.emptySubtitle');

  const toggleSlot = (slot: DoseSlot) => {
    if (slot.log) {
      removeDoseLog(slot.log.id);
      return;
    }
    logDose({
      medicationId: slot.medication.id,
      dateKey: slot.dateKey,
      slotIndex: slot.slotIndex,
    });
  };

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
          {!isPremiumTier(tier) ? (
            <View style={styles.summaryRow}>
              <AppText variant="body">{t('apps.medication.ui.freeCap')}</AppText>
              <AppText variant="body">
                {activeMedicationCount}/{FREE_MEDICATION_LIMIT}
              </AppText>
            </View>
          ) : null}
          {summary.expected > 0 ? (
            <MiniAppProgress progress={summary.progress} accent={theme.color} />
          ) : null}
        </MiniAppCard>
      ) : null}

      {hasMedications ? (
        <>
          <DoseSection
            title={t('apps.medication.ui.dueNow')}
            slots={dueNow}
            hydrated={hydrated}
            onToggle={toggleSlot}
            t={t}
          />
          <DoseSection
            title={t('apps.medication.ui.upcoming')}
            slots={upcoming}
            hydrated={hydrated}
            onToggle={toggleSlot}
            t={t}
          />
          <DoseSection
            title={t('apps.medication.ui.takenToday')}
            slots={taken}
            hydrated={hydrated}
            onToggle={toggleSlot}
            t={t}
          />
          {todaySlots.length === 0 ? (
            <MiniAppCard index={2} theme={theme}>
              <AppText variant="caption" style={styles.muted}>
                {t('apps.medication.ui.emptyFilter')}
              </AppText>
            </MiniAppCard>
          ) : null}
        </>
      ) : null}

      {hasMedications ? (
        <MiniAppCard index={6} title={t('apps.medicationTracker.medicines')} theme={theme}>
          {filteredMedications.map((medication: Medication) => (
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
        index={7}
        onPress={() => {
          if (!canAddMoreMedications) {
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
          index={8}
          onPress={() => router.push('/(app)/apps/medication-tracker/log')}
        />
      ) : null}
      {hasMedications ? (
        <MiniAppCta
          label={t('apps.medicationTracker.history')}
          accent={theme.color}
          soft={theme.backgroundColor}
          secondary
          index={9}
          onPress={() => router.push('/(app)/apps/medication-tracker/history')}
        />
      ) : null}
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
