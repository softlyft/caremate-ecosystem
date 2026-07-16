import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/form-controls';
import { useTranslation } from '@/domains/localization';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppCta,
  MiniAppScreen,
  MonthCalendarGrid,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
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
import { localizeFrequencyLabel, localizeSlotLabel } from '@/mini-apps/medication-tracker/localize';
import { layoutSpacing, palette, spacing } from '@/theme';

const theme = getMiniAppTheme('medication-tracker');

export default function MedicationLogScreen() {
  const { t } = useTranslation();
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
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  if (!selectedMedication || !selectedFrequency) {
    return (
      <View style={styles.loading}>
        <AppText variant="body">{t('apps.medication.ui.addBeforeLogging')}</AppText>
        <MiniAppCta
          label={t('apps.medicationTracker.addMedicine')}
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => router.replace('/(app)/apps/medication-tracker/setup')}
        />
      </View>
    );
  }

  const isAsNeeded = selectedFrequency.dosesPerDay === 0;

  return (
    <MiniAppScreen>
      <AppText variant="subtitle" style={styles.intro}>
        {t('apps.medication.ui.logIntro')}
      </AppText>

      <MiniAppCard index={1} title={t('apps.medication.ui.medicine')} theme={theme}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {medications.map((item) => (
            <MiniAppChip
              key={item.id}
              label={`${item.name}${
                item.forKid && item.patientName
                  ? ` · ${item.patientName}`
                  : item.forKid
                    ? ` · ${t('apps.medication.ui.child')}`
                    : ''
              }`}
              selected={item.id === selectedMedication.id}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => {
                setSelectedMedicationId(item.id);
                setSlotIndex(0);
                setNotes('');
              }}
            />
          ))}
        </ScrollView>
        <AppText variant="caption" style={styles.muted}>
          {selectedMedication.dosage ? `${selectedMedication.dosage} · ` : ''}
          {localizeFrequencyLabel(selectedMedication.frequency, t)}
        </AppText>
      </MiniAppCard>

      {!isAsNeeded ? (
        <MiniAppCard index={2} title={t('apps.medication.ui.dose')} theme={theme}>
          <View style={styles.chipRow}>
            {selectedFrequency.slotLabels.map((label, index) => (
              <MiniAppChip
                key={label}
                label={localizeSlotLabel(selectedMedication.frequency, index, t, label)}
                selected={index === slotIndex}
                accent={theme.color}
                soft={theme.backgroundColor}
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
              />
            ))}
          </View>
        </MiniAppCard>
      ) : null}

      <MiniAppCard index={3} theme={theme}>
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
          accentColor={theme.color}
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
        <AppText variant="body">
          {t('apps.medication.ui.dateLabel', { date: formatDisplayDate(dateKey) })}
        </AppText>
      </MiniAppCard>

      <MiniAppCard index={4} title={t('apps.medication.ui.notesOptional')} theme={theme}>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder={t('apps.medication.ui.notesPlaceholderLog')}
          multiline
        />
      </MiniAppCard>

      <MiniAppCta
        label={
          existingLog && !isAsNeeded
            ? t('apps.medication.ui.updateDoseLog')
            : t('apps.medication.ui.markTaken')
        }
        accent={theme.color}
        soft={theme.backgroundColor}
        index={5}
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
        <MiniAppCta
          label={t('apps.medication.ui.removeDoseLog')}
          accent={theme.color}
          soft={theme.backgroundColor}
          secondary
          index={6}
          onPress={() => {
            removeDoseLog(existingLog.id);
            router.back();
          }}
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
    gap: spacing.md,
    padding: layoutSpacing.screenHorizontal,
    backgroundColor: palette.surface,
  },
  intro: {
    color: palette.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muted: {
    color: palette.textSecondary,
  },
});
