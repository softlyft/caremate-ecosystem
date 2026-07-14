import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, Input } from '@/components/ui/form-controls';
import { getFrequencyOption } from '@/mini-apps/medication-tracker/constants';
import {
  useMedicationTrackerHydrated,
  useMedicationTrackerStore,
} from '@/mini-apps/medication-tracker/store';
import {
  formatDisplayDate,
  nextSlotIndexForAsNeeded,
  toDateKey,
} from '@/mini-apps/medication-tracker/utils';
import { MonthCalendarGrid } from '@/mini-apps/_kit/components/MonthCalendarGrid';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function MedicationLogScreen() {
  const { medicationId: paramMedicationId } = useLocalSearchParams<{ medicationId?: string }>();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [monthRef, setMonthRef] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const hydrated = useMedicationTrackerHydrated();

  const medications = useMedicationTrackerStore((state) => state.medications);
  const activeMedicationId = useMedicationTrackerStore((state) => state.activeMedicationId);
  const logs = useMedicationTrackerStore((state) => state.logs);
  const logDose = useMedicationTrackerStore((state) => state.logDose);
  const removeDoseLog = useMedicationTrackerStore((state) => state.removeDoseLog);

  const activeMeds = medications.filter((medication) => medication.active);
  const medicationId =
    (typeof paramMedicationId === 'string' &&
    medications.some((medication) => medication.id === paramMedicationId)
      ? paramMedicationId
      : null) ??
    activeMedicationId ??
    activeMeds[0]?.id ??
    medications[0]?.id ??
    null;

  const medication = medications.find((item) => item.id === medicationId);

  const [selectedMedicationId, setSelectedMedicationId] = useState(medicationId);
  const selectedMedication =
    medications.find((item) => item.id === selectedMedicationId) ?? medication;
  const selectedFrequency = selectedMedication
    ? getFrequencyOption(selectedMedication.frequency)
    : null;

  const [dateKey, setDateKey] = useState(todayKey);
  const [slotIndex, setSlotIndex] = useState(0);
  const [notes, setNotes] = useState('');

  const existingLog =
    selectedMedication && selectedFrequency?.dosesPerDay !== 0
      ? logs.find(
          (log) =>
            log.medicationId === selectedMedication.id &&
            log.dateKey === dateKey &&
            log.slotIndex === slotIndex,
        )
      : undefined;

  const monthLabel = monthRef.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (!selectedMedication || !selectedFrequency) {
    return (
      <View style={styles.loading}>
        <AppText variant="body">Add a medicine before logging doses.</AppText>
        <Button
          label="Add medicine"
          onPress={() => router.replace('/(app)/apps/medication-tracker/setup')}
        />
      </View>
    );
  }

  const isAsNeeded = selectedFrequency.dosesPerDay === 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <AppText variant="subtitle">
        Log a dose you have taken. You can also undo from the home screen.
      </AppText>

      <View style={styles.card}>
        <AppText variant="cardTitle">Medicine</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {medications.map((item) => {
            const selected = item.id === selectedMedication.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => {
                  setSelectedMedicationId(item.id);
                  setSlotIndex(0);
                  setNotes('');
                }}
              >
                <AppText variant="caption" style={selected ? styles.chipTextSelected : undefined}>
                  {item.name}
                  {item.forKid && item.patientName
                    ? ` · ${item.patientName}`
                    : item.forKid
                      ? ' · Child'
                      : ''}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
        <AppText variant="caption" style={styles.muted}>
          {selectedMedication.dosage ? `${selectedMedication.dosage} · ` : ''}
          {selectedFrequency.label}
        </AppText>
      </View>

      {!isAsNeeded ? (
        <View style={styles.card}>
          <AppText variant="cardTitle">Dose</AppText>
          <View style={styles.chipRow}>
            {selectedFrequency.slotLabels.map((label, index) => {
              const selected = index === slotIndex;
              return (
                <Pressable
                  key={label}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => {
                    setSlotIndex(index);
                    const log = logs.find(
                      (item) =>
                        item.medicationId === selectedMedication.id &&
                        item.dateKey === dateKey &&
                        item.slotIndex === index,
                    );
                    setNotes(log?.notes ?? '');
                  }}
                >
                  <AppText variant="caption" style={selected ? styles.chipTextSelected : undefined}>
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.monthHeader}>
          <Pressable
            hitSlop={12}
            onPress={() =>
              setMonthRef(new Date(monthRef.getFullYear(), monthRef.getMonth() - 1, 1))
            }
          >
            <ChevronLeft color={palette.textSecondary} size={20} />
          </Pressable>
          <AppText variant="cardTitle">{monthLabel}</AppText>
          <Pressable
            hitSlop={12}
            onPress={() =>
              setMonthRef(new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 1))
            }
          >
            <ChevronRight color={palette.textSecondary} size={20} />
          </Pressable>
        </View>
        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          onDayPress={(dayKey) => {
            setDateKey(dayKey);
            if (!isAsNeeded) {
              const log = logs.find(
                (item) =>
                  item.medicationId === selectedMedication.id &&
                  item.dateKey === dayKey &&
                  item.slotIndex === slotIndex,
              );
              setNotes(log?.notes ?? '');
            } else {
              setNotes('');
            }
          }}
          getDayState={(dayKey) => ({
            selected: dayKey === dateKey,
            logged: logs.some(
              (log) => log.medicationId === selectedMedication.id && log.dateKey === dayKey,
            ),
            today: dayKey === todayKey,
          })}
        />
        <AppText variant="body">Date: {formatDisplayDate(dateKey)}</AppText>
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Notes (optional)</AppText>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="With food, side effects…"
          multiline
        />
      </View>

      <Button
        label={existingLog && !isAsNeeded ? 'Update dose log' : 'Mark as taken'}
        onPress={() => {
          const nextSlot = isAsNeeded
            ? nextSlotIndexForAsNeeded(selectedMedication.id, dateKey, logs)
            : slotIndex;
          logDose({
            medicationId: selectedMedication.id,
            dateKey,
            slotIndex: nextSlot,
            notes,
          });
          router.back();
        }}
      />

      {existingLog && !isAsNeeded ? (
        <Button
          label="Remove this dose log"
          variant="secondary"
          onPress={() => {
            removeDoseLog(existingLog.id);
            router.back();
          }}
        />
      ) : null}
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: layoutSpacing.screenHorizontal,
    backgroundColor: palette.background,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: palette.background,
  },
  chipSelected: {
    backgroundColor: '#FFEDD5',
    borderColor: '#EA580C',
  },
  chipTextSelected: {
    color: '#C2410C',
  },
  muted: {
    color: palette.textSecondary,
  },
});
