import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import {
  useMedicationTrackerHydrated,
  useMedicationTrackerStore,
} from '@/mini-apps/medication-tracker/store';
import {
  buildDaySlots,
  formatDisplayDate,
  getDaySummary,
  getFrequencyLabel,
  getMedicationPatientLabel,
  getStatusLabel,
  toDateKey,
  type DoseSlotStatus,
  type Medication,
} from '@/mini-apps/medication-tracker/utils';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

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
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const hydrated = useMedicationTrackerHydrated();
  const [patientFilter, setPatientFilter] = useState<PatientFilter>('all');

  const medicationsRaw = useMedicationTrackerStore((state) => state.medications);
  const logs = useMedicationTrackerStore((state) => state.logs);
  const logDose = useMedicationTrackerStore((state) => state.logDose);
  const removeDoseLog = useMedicationTrackerStore((state) => state.removeDoseLog);

  const medications = useMemo(() => medicationsRaw.map(normalizeMed), [medicationsRaw]);

  const patientChips = useMemo(() => {
    const kids = new Map<string, string>();
    for (const medication of medications) {
      if (medication.forKid && medication.familyMemberId) {
        kids.set(medication.familyMemberId, getMedicationPatientLabel(medication));
      }
    }
    return Array.from(kids.entries()).map(([id, name]) => ({ id, name }));
  }, [medications]);

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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <AppText variant="caption" style={styles.heroLabel}>
          Medication
        </AppText>
        <AppText variant="screenTitle" style={styles.heroTitle}>
          {hasMedications
            ? summary.expected > 0
              ? `${summary.taken} of ${summary.expected} doses taken today`
              : summary.taken > 0
                ? `${summary.taken} as-needed dose${summary.taken === 1 ? '' : 's'} logged today`
                : 'Nothing scheduled for today'
            : 'Track your medications'}
        </AppText>
        <AppText variant="subtitle" style={styles.heroSubtitle}>
          {hasMedications
            ? summary.due > 0
              ? `${summary.due} dose${summary.due === 1 ? '' : 's'} still due today`
              : summary.missed > 0
                ? 'Catch up on any missed doses from earlier'
                : 'You are up to date for today'
            : 'Add medicines for yourself or your kids, then log each dose'}
        </AppText>
      </View>

      {showPatientFilters ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(
            [
              { id: 'all' as const, label: 'All' },
              { id: 'self' as const, label: 'You' },
              ...patientChips.map((kid) => ({ id: kid.id as PatientFilter, label: kid.name })),
            ] as { id: PatientFilter; label: string }[]
          ).map((chip) => {
            const selected = patientFilter === chip.id;
            return (
              <Pressable
                key={String(chip.id)}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
                onPress={() => setPatientFilter(chip.id)}
              >
                <AppText
                  variant="caption"
                  style={selected ? styles.filterChipTextSelected : undefined}
                >
                  {chip.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {hasMedications ? (
        <View style={[styles.card, shadow.soft]}>
          <View style={styles.summaryRow}>
            <AppText variant="body">Today</AppText>
            <AppText variant="body">{formatDisplayDate(todayKey)}</AppText>
          </View>
          <View style={styles.summaryRow}>
            <AppText variant="body">Active medicines</AppText>
            <AppText variant="body">{activeMeds.length}</AppText>
          </View>
          {summary.expected > 0 ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${summary.progress * 100}%` }]} />
            </View>
          ) : null}
        </View>
      ) : null}

      {hasMedications ? (
        <View style={[styles.card, shadow.soft]}>
          <AppText variant="cardTitle">Today&apos;s doses</AppText>
          {todaySlots.length === 0 ? (
            <AppText variant="caption" style={styles.muted}>
              No doses scheduled for today in this filter. Add a medicine or check start dates.
            </AppText>
          ) : (
            todaySlots.map((slot) => {
              const key = `${slot.medication.id}-${slot.slotIndex}-${slot.log?.id ?? 'open'}`;
              const canToggle =
                slot.status === 'due' || slot.status === 'taken' || slot.status === 'as-needed';
              const patient = getMedicationPatientLabel(normalizeMed(slot.medication));
              return (
                <Pressable
                  key={key}
                  style={styles.doseRow}
                  disabled={!hydrated || !canToggle}
                  onPress={() => {
                    if (slot.log) {
                      removeDoseLog(slot.log.id);
                      return;
                    }
                    logDose({
                      medicationId: slot.medication.id,
                      dateKey: slot.dateKey,
                      slotIndex: slot.slotIndex,
                    });
                  }}
                >
                  <View style={styles.doseCopy}>
                    <AppText variant="body">
                      {slot.medication.name}
                      {slot.medication.dosage ? ` · ${slot.medication.dosage}` : ''}
                    </AppText>
                    <AppText variant="caption" style={styles.muted}>
                      {patient} · {slot.slotLabel}
                      {slot.status === 'taken'
                        ? ' · Tap to undo'
                        : canToggle
                          ? ' · Tap to mark taken'
                          : ''}
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: STATUS_BACKGROUNDS[slot.status] },
                    ]}
                  >
                    <AppText variant="caption" style={{ color: STATUS_COLORS[slot.status] }}>
                      {getStatusLabel(slot.status)}
                    </AppText>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}

      {hasMedications ? (
        <View style={[styles.card, shadow.soft]}>
          <AppText variant="cardTitle">Medicines</AppText>
          {filteredMedications.map((medication) => (
            <Pressable
              key={medication.id}
              style={styles.medRow}
              onPress={() =>
                router.push({
                  pathname: '/(app)/apps/medication-tracker/setup',
                  params: { medicationId: medication.id },
                })
              }
            >
              <View style={styles.doseCopy}>
                <AppText variant="body">
                  {medication.name}
                  {!medication.active ? ' (paused)' : ''}
                </AppText>
                <AppText variant="caption" style={styles.muted}>
                  {getMedicationPatientLabel(medication)}
                  {medication.dosage ? ` · ${medication.dosage}` : ''}
                  {` · ${getFrequencyLabel(medication.frequency)}`}
                </AppText>
              </View>
              <AppText variant="caption" style={styles.link}>
                Edit
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Add medicine"
          onPress={() => router.push('/(app)/apps/medication-tracker/setup')}
          disabled={!hydrated}
        />
        {hasMedications ? (
          <Button
            label="Log a dose"
            variant="secondary"
            onPress={() => router.push('/(app)/apps/medication-tracker/log')}
            disabled={!hydrated}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  hero: {
    backgroundColor: '#FFEDD5',
    borderRadius: radius.xxl,
    padding: layoutSpacing.cardPadding,
    gap: 4,
  },
  heroLabel: {
    color: '#C2410C',
  },
  heroTitle: {
    color: '#7C2D12',
  },
  heroSubtitle: {
    color: '#9A3412',
  },
  filterRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  filterChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: palette.background,
  },
  filterChipSelected: {
    backgroundColor: '#FFEDD5',
    borderColor: '#EA580C',
  },
  filterChipTextSelected: {
    color: '#C2410C',
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: '#FED7AA',
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: '#EA580C',
  },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  doseCopy: {
    flex: 1,
    gap: 2,
  },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  muted: {
    color: palette.textSecondary,
  },
  link: {
    color: '#C2410C',
  },
  actions: {
    gap: spacing.sm,
  },
});
