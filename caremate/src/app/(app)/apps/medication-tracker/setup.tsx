import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/form-controls';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppCta,
  MiniAppScreen,
  MonthCalendarGrid,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
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
import { layoutSpacing, palette, spacing } from '@/theme';

const theme = getMiniAppTheme('medication-tracker');

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
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  if (isEditing && !editing) {
    return (
      <View style={styles.loading}>
        <AppText variant="body">That medicine was not found.</AppText>
        <MiniAppCta
          label="Go back"
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => router.back()}
        />
      </View>
    );
  }

  return (
    <MiniAppScreen>
      <AppText variant="subtitle" style={styles.intro}>
        {isEditing
          ? 'Update dosage, schedule, who this is for, or pause this medicine.'
          : 'Add a medicine for yourself or a child in your family.'}
      </AppText>

      <MiniAppCard index={1} title="Is this for a kid?" theme={theme}>
        <View style={styles.chipRow}>
          <MiniAppChip
            label="No — for me"
            selected={!forKid}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={() => {
              setForKid(false);
              setFamilyMemberId(null);
            }}
          />
          <MiniAppChip
            label="Yes — for a kid"
            selected={forKid}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={() => setForKid(true)}
          />
        </View>

        {forKid ? (
          <View style={styles.kidBlock}>
            {familyKids.status === 'loading' ? (
              <ActivityIndicator color={theme.color} />
            ) : familyKids.status === 'guest' ? (
              <>
                <AppText variant="caption" style={styles.muted}>
                  Sign in and set up your family to assign medicines to kids.
                </AppText>
                <MiniAppCta
                  label="Sign in"
                  accent={theme.color}
                  soft={theme.backgroundColor}
                  secondary
                  index={2}
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
                <MiniAppCta
                  label={
                    familyKids.status === 'needs_family_setup' ? 'Set up family' : 'Open family'
                  }
                  accent={theme.color}
                  soft={theme.backgroundColor}
                  secondary
                  index={2}
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
                  {familyKids.children.map((child) => (
                    <MiniAppChip
                      key={child.id}
                      label={child.fullName}
                      selected={child.id === familyMemberId}
                      accent={theme.color}
                      soft={theme.backgroundColor}
                      onPress={() => setFamilyMemberId(child.id)}
                    />
                  ))}
                </View>
                <AppText variant="caption" style={styles.muted}>
                  Any parent in the household can log doses for kids from their CareMate account.
                </AppText>
              </>
            )}
          </View>
        ) : null}
      </MiniAppCard>

      <MiniAppCard index={2} title="Name" theme={theme}>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="e.g. Metformin"
          autoCapitalize="words"
        />
      </MiniAppCard>

      <MiniAppCard index={3} title="Dosage" theme={theme}>
        <Input
          value={dosage}
          onChangeText={setDosage}
          placeholder="e.g. 500mg"
          autoCapitalize="none"
        />
      </MiniAppCard>

      <MiniAppCard index={4} title="How often" theme={theme}>
        <View style={styles.chipRow}>
          {FREQUENCY_OPTIONS.map((option) => (
            <MiniAppChip
              key={option.id}
              label={option.label}
              selected={option.id === frequency}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setFrequency(option.id)}
            />
          ))}
        </View>
      </MiniAppCard>

      <MiniAppCard index={5} theme={theme}>
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
          accentColor={theme.color}
          onDayPress={setStartDate}
          getDayState={(dayKey) => ({ selected: dayKey === startDate })}
        />
        {startDate ? <AppText variant="body">Starts {formatDisplayDate(startDate)}</AppText> : null}
      </MiniAppCard>

      <MiniAppCard index={6} title="Notes (optional)" theme={theme}>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="With food, side effects, etc."
          multiline
        />
      </MiniAppCard>

      {isEditing ? (
        <MiniAppCard index={7} title="Status" theme={theme}>
          <View style={styles.chipRow}>
            <MiniAppChip
              label="Active"
              selected={active}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setActive(true)}
            />
            <MiniAppChip
              label="Paused"
              selected={!active}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setActive(false)}
            />
          </View>
        </MiniAppCard>
      ) : null}

      <MiniAppCta
        label={isEditing ? 'Save changes' : 'Add medicine'}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={8}
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
        <MiniAppCta
          label="Remove medicine"
          accent={theme.color}
          soft={theme.backgroundColor}
          secondary
          index={9}
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
  kidBlock: {
    gap: spacing.sm,
    marginTop: spacing.xs,
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
