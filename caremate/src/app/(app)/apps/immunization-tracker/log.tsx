import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, Input } from '@/components/ui/form-controls';
import { VACCINE_SCHEDULE } from '@/mini-apps/immunization-tracker/constants';
import { MonthCalendarGrid } from '@/mini-apps/_kit/components/MonthCalendarGrid';
import {
  useImmunizationTrackerHydrated,
  useImmunizationTrackerStore,
} from '@/mini-apps/immunization-tracker/store';
import { formatDisplayDate, toDateKey } from '@/mini-apps/immunization-tracker/utils';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function ImmunizationLogScreen() {
  const { vaccineId: initialVaccineId, profileId: paramProfileId } = useLocalSearchParams<{
    vaccineId?: string;
    profileId?: string;
  }>();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [monthRef, setMonthRef] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const hydrated = useImmunizationTrackerHydrated();

  const profiles = useImmunizationTrackerStore((state) => state.profiles);
  const activeProfileId = useImmunizationTrackerStore((state) => state.activeProfileId);
  const records = useImmunizationTrackerStore((state) => state.records);
  const upsertRecord = useImmunizationTrackerStore((state) => state.upsertRecord);
  const removeRecord = useImmunizationTrackerStore((state) => state.removeRecord);

  const profileId =
    (typeof paramProfileId === 'string' && profiles.some((profile) => profile.id === paramProfileId)
      ? paramProfileId
      : null) ??
    activeProfileId ??
    profiles[0]?.id ??
    null;

  const profileRecords = records.filter((record) => record.profileId === profileId);
  const profileName = profiles.find((profile) => profile.id === profileId)?.name;

  const defaultVaccineId =
    typeof initialVaccineId === 'string' && VACCINE_SCHEDULE.some((v) => v.id === initialVaccineId)
      ? initialVaccineId
      : VACCINE_SCHEDULE[0].id;

  const [selectedVaccineId, setSelectedVaccineId] = useState(defaultVaccineId);
  const existingRecord = profileRecords.find((record) => record.vaccineId === selectedVaccineId);
  const [administeredDate, setAdministeredDate] = useState(
    existingRecord?.administeredDate ?? todayKey,
  );
  const [provider, setProvider] = useState(existingRecord?.provider ?? '');
  const [notes, setNotes] = useState(existingRecord?.notes ?? '');

  const selectedVaccine = VACCINE_SCHEDULE.find((vaccine) => vaccine.id === selectedVaccineId)!;
  const monthLabel = monthRef.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const selectVaccine = (vaccineId: string) => {
    setSelectedVaccineId(vaccineId);
    const record = profileRecords.find((item) => item.vaccineId === vaccineId);
    setAdministeredDate(record?.administeredDate ?? todayKey);
    setProvider(record?.provider ?? '');
    setNotes(record?.notes ?? '');
  };

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (!profileId) {
    return (
      <View style={styles.loading}>
        <AppText variant="body">
          Add children in your Family profile before logging vaccines.
        </AppText>
        <Button label="Open family" onPress={() => router.replace('/(app)/family')} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <AppText variant="subtitle">
        Record a vaccine for {profileName ?? 'this child'}. You can update or remove an existing
        entry.
      </AppText>

      <View style={styles.card}>
        <AppText variant="cardTitle">Vaccine</AppText>
        <View style={styles.chipRow}>
          {VACCINE_SCHEDULE.map((vaccine) => {
            const selected = vaccine.id === selectedVaccineId;
            const completed = profileRecords.some((record) => record.vaccineId === vaccine.id);
            return (
              <Pressable
                key={vaccine.id}
                style={[
                  styles.chip,
                  selected && styles.chipSelected,
                  completed && !selected && styles.chipCompleted,
                ]}
                onPress={() => selectVaccine(vaccine.id)}
              >
                <AppText variant="caption" style={selected ? styles.chipTextSelected : undefined}>
                  {vaccine.name} {vaccine.doseLabel}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <AppText variant="quickActionSubtitle">{selectedVaccine.description}</AppText>
      </View>

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

        <AppText variant="caption" style={styles.muted}>
          Tap the date this vaccine was administered.
        </AppText>

        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          onDayPress={setAdministeredDate}
          getDayState={(dayKey) => ({ selected: dayKey === administeredDate })}
        />

        {administeredDate ? (
          <AppText variant="body">Selected: {formatDisplayDate(administeredDate)}</AppText>
        ) : null}
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Provider / clinic</AppText>
        <Input
          value={provider}
          onChangeText={setProvider}
          placeholder="Optional"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Notes</AppText>
        <Input value={notes} onChangeText={setNotes} placeholder="Batch number, reactions, etc." />
      </View>

      <Button
        label={existingRecord ? 'Update record' : 'Save vaccine'}
        disabled={!administeredDate}
        onPress={() => {
          upsertRecord({
            profileId,
            vaccineId: selectedVaccineId,
            administeredDate,
            provider: provider.trim() || undefined,
            notes: notes.trim() || undefined,
          });
          router.back();
        }}
      />

      {existingRecord ? (
        <Button
          label="Remove record"
          variant="secondary"
          onPress={() => {
            removeRecord(profileId, selectedVaccineId);
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
    gap: spacing.md,
    padding: layoutSpacing.screenHorizontal,
  },
  content: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
    paddingBottom: spacing.xl,
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
    backgroundColor: '#D1FAE5',
    borderColor: '#059669',
  },
  chipCompleted: {
    borderColor: '#6EE7B7',
  },
  chipTextSelected: {
    color: '#059669',
  },
  muted: {
    color: palette.textSecondary,
  },
});
