import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, Input } from '@/components/ui/form-controls';
import {
  FREQUENCY_OPTIONS,
  type MedicationFrequency,
} from '@/mini-apps/medication-tracker/constants';
import {
  useMedicationTrackerHydrated,
  useMedicationTrackerStore,
} from '@/mini-apps/medication-tracker/store';
import { useMedicationFamilyKids } from '@/mini-apps/medication-tracker/use-family-kids';
import { formatDisplayDate, toDateKey } from '@/mini-apps/medication-tracker/utils';
import { MonthCalendarGrid } from '@/mini-apps/_kit/components/MonthCalendarGrid';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function MedicationSetupScreen() {
  const { medicationId } = useLocalSearchParams<{ medicationId?: string }>();
  const navigation = useNavigation();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [monthRef, setMonthRef] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const hydrated = useMedicationTrackerHydrated();
  const familyKids = useMedicationFamilyKids();

  const medications = useMedicationTrackerStore((state) => state.medications);
  const addMedication = useMedicationTrackerStore((state) => state.addMedication);
  const updateMedication = useMedicationTrackerStore((state) => state.updateMedication);
  const removeMedication = useMedicationTrackerStore((state) => state.removeMedication);

  const editing =
    typeof medicationId === 'string'
      ? medications.find((medication) => medication.id === medicationId)
      : undefined;
  const isEditing = Boolean(editing);

  const [name, setName] = useState(editing?.name ?? '');
  const [dosage, setDosage] = useState(editing?.dosage ?? '');
  const [frequency, setFrequency] = useState<MedicationFrequency>(
    editing?.frequency ?? 'once-daily',
  );
  const [startDate, setStartDate] = useState<string | null>(editing?.startDate ?? todayKey);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [active, setActive] = useState(editing?.active ?? true);
  const [forKid, setForKid] = useState(Boolean(editing?.forKid));
  const [familyMemberId, setFamilyMemberId] = useState<string | null>(
    editing?.familyMemberId ?? null,
  );
  const [editingSnapshotId, setEditingSnapshotId] = useState(editing?.id);

  if (editing && editing.id !== editingSnapshotId) {
    setEditingSnapshotId(editing.id);
    setName(editing.name);
    setDosage(editing.dosage);
    setFrequency(editing.frequency);
    setStartDate(editing.startDate);
    setNotes(editing.notes ?? '');
    setActive(editing.active);
    setForKid(Boolean(editing.forKid));
    setFamilyMemberId(editing.familyMemberId ?? null);
  } else if (!editing && editingSnapshotId !== undefined) {
    setEditingSnapshotId(undefined);
  }

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Medicine' : 'Add Medicine',
    });
  }, [isEditing, navigation]);

  const monthLabel = monthRef.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const selectedChild =
    familyKids.status === 'ready'
      ? familyKids.children.find((child) => child.id === familyMemberId)
      : undefined;

  const canSave =
    Boolean(name.trim() && startDate) && (!forKid || Boolean(familyMemberId && selectedChild));

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (isEditing && !editing) {
    return (
      <View style={styles.loading}>
        <AppText variant="body">That medicine was not found.</AppText>
        <Button label="Go back" onPress={() => router.back()} />
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
        {isEditing
          ? 'Update dosage, schedule, who this is for, or pause this medicine.'
          : 'Add a medicine for yourself or a child in your family.'}
      </AppText>

      <View style={styles.card}>
        <AppText variant="cardTitle">Is this for a kid?</AppText>
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.chip, !forKid && styles.chipSelected]}
            onPress={() => {
              setForKid(false);
              setFamilyMemberId(null);
            }}
          >
            <AppText variant="caption" style={!forKid ? styles.chipTextSelected : undefined}>
              No — for me
            </AppText>
          </Pressable>
          <Pressable
            style={[styles.chip, forKid && styles.chipSelected]}
            onPress={() => setForKid(true)}
          >
            <AppText variant="caption" style={forKid ? styles.chipTextSelected : undefined}>
              Yes — for a kid
            </AppText>
          </Pressable>
        </View>

        {forKid ? (
          <View style={styles.kidBlock}>
            {familyKids.status === 'loading' ? (
              <ActivityIndicator color={palette.primary} />
            ) : familyKids.status === 'guest' ? (
              <>
                <AppText variant="caption" style={styles.muted}>
                  Sign in and set up your family to assign medicines to kids.
                </AppText>
                <Button
                  label="Sign in"
                  variant="secondary"
                  onPress={() => router.push('/(auth)/login')}
                />
              </>
            ) : familyKids.status === 'needs_family_setup' ||
              familyKids.status === 'needs_children' ? (
              <>
                <AppText variant="caption" style={styles.muted}>
                  {familyKids.status === 'needs_family_setup'
                    ? 'Set up your family and add kids first.'
                    : 'Add children in Family before assigning a medicine.'}
                </AppText>
                <Button
                  label={
                    familyKids.status === 'needs_family_setup' ? 'Set up family' : 'Open family'
                  }
                  variant="secondary"
                  onPress={() =>
                    router.push(
                      familyKids.status === 'needs_family_setup'
                        ? '/(app)/family/setup'
                        : '/(app)/family',
                    )
                  }
                />
              </>
            ) : (
              <>
                <AppText variant="body">Which child?</AppText>
                <View style={styles.chipRow}>
                  {familyKids.children.map((child) => {
                    const selected = child.id === familyMemberId;
                    return (
                      <Pressable
                        key={child.id}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setFamilyMemberId(child.id)}
                      >
                        <AppText
                          variant="caption"
                          style={selected ? styles.chipTextSelected : undefined}
                        >
                          {child.fullName}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
                <AppText variant="caption" style={styles.muted}>
                  Any parent in the household can log doses for kids from their CareMate account.
                </AppText>
              </>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Name</AppText>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="e.g. Metformin"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Dosage</AppText>
        <Input
          value={dosage}
          onChangeText={setDosage}
          placeholder="e.g. 500mg"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">How often</AppText>
        <View style={styles.chipRow}>
          {FREQUENCY_OPTIONS.map((option) => {
            const selected = option.id === frequency;
            return (
              <Pressable
                key={option.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setFrequency(option.id)}
              >
                <AppText variant="caption" style={selected ? styles.chipTextSelected : undefined}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
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
          Start date — doses are tracked from this day forward.
        </AppText>
        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          onDayPress={setStartDate}
          getDayState={(dayKey) => ({ selected: dayKey === startDate })}
        />
        {startDate ? <AppText variant="body">Starts {formatDisplayDate(startDate)}</AppText> : null}
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Notes (optional)</AppText>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="With food, side effects, etc."
          multiline
        />
      </View>

      {isEditing ? (
        <View style={styles.card}>
          <AppText variant="cardTitle">Status</AppText>
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, active && styles.chipSelected]}
              onPress={() => setActive(true)}
            >
              <AppText variant="caption" style={active ? styles.chipTextSelected : undefined}>
                Active
              </AppText>
            </Pressable>
            <Pressable
              style={[styles.chip, !active && styles.chipSelected]}
              onPress={() => setActive(false)}
            >
              <AppText variant="caption" style={!active ? styles.chipTextSelected : undefined}>
                Paused
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Button
        label={isEditing ? 'Save changes' : 'Add medicine'}
        disabled={!canSave}
        onPress={() => {
          if (!canSave || !startDate) {
            return;
          }
          if (forKid && !selectedChild) {
            Alert.alert('Select a child', 'Choose which child this medicine is for.');
            return;
          }
          const patientPayload = {
            forKid,
            familyMemberId: forKid ? familyMemberId : null,
            patientName: forKid ? (selectedChild?.fullName ?? null) : null,
          };
          if (isEditing && editing) {
            updateMedication(editing.id, {
              name,
              dosage,
              frequency,
              startDate,
              notes,
              active,
              ...patientPayload,
            });
          } else {
            addMedication({ name, dosage, frequency, startDate, notes, ...patientPayload });
          }
          router.back();
        }}
      />

      {isEditing && editing ? (
        <Button
          label="Remove medicine"
          variant="secondary"
          onPress={() => {
            Alert.alert(
              'Remove medicine?',
              'Dose history for this medicine will also be deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => {
                    removeMedication(editing.id);
                    router.back();
                  },
                },
              ],
            );
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
  kidBlock: {
    gap: spacing.sm,
    marginTop: spacing.xs,
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
