import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
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
import { type MedicationFrequency } from '@/mini-apps/medication-tracker/constants';
import {
  useMedicationTrackerHydrated,
  useMedicationTrackerStore,
} from '@/mini-apps/medication-tracker/store';
import { useMedicationFamilyKids } from '@/mini-apps/medication-tracker/use-family-kids';
import { formatDisplayDate, toDateKey } from '@/mini-apps/medication-tracker/utils';
import { localizeFrequencyOptions } from '@/mini-apps/medication-tracker/localize';
import { layoutSpacing, palette, spacing } from '@/theme';

const theme = getMiniAppTheme('medication-tracker');

export default function MedicationSetupScreen() {
  const { t } = useTranslation();
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
      title: isEditing ? t('apps.medication.ui.editMedicine') : t('apps.medication.ui.addMedicine'),
    });
  }, [isEditing, navigation, t]);

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
        <AppText variant="body">{t('apps.medication.ui.notFound')}</AppText>
        <MiniAppCta
          label={t('common.goBack')}
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
        {isEditing ? t('apps.medication.ui.updateHint') : t('apps.medication.ui.addHint')}
      </AppText>

      <MiniAppCard index={1} title={t('apps.medication.ui.forKid')} theme={theme}>
        <View style={styles.chipRow}>
          <MiniAppChip
            label={t('apps.medication.ui.forMe')}
            selected={!forKid}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={() => {
              setForKid(false);
              setFamilyMemberId(null);
            }}
          />
          <MiniAppChip
            label={t('apps.medication.ui.forKidYes')}
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
                  {t('apps.medication.ui.signInFamilyKids')}
                </AppText>
                <MiniAppCta
                  label={t('common.signIn')}
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
                    ? t('apps.medication.ui.setupFamilyFirst')
                    : t('apps.medication.ui.addChildrenFirst')}
                </AppText>
                <MiniAppCta
                  label={
                    familyKids.status === 'needs_family_setup'
                      ? t('apps.setUpFamily')
                      : t('apps.openFamily')
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
                <AppText variant="body">{t('apps.medication.ui.whichChild')}</AppText>
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
                  {t('apps.medication.ui.anyParentCanLog')}
                </AppText>
              </>
            )}
          </View>
        ) : null}
      </MiniAppCard>

      <MiniAppCard index={2} title={t('apps.medication.ui.name')} theme={theme}>
        <Input
          value={name}
          onChangeText={setName}
          placeholder={t('apps.medication.ui.namePlaceholder')}
          autoCapitalize="words"
        />
      </MiniAppCard>

      <MiniAppCard index={3} title={t('apps.medication.ui.dosage')} theme={theme}>
        <Input
          value={dosage}
          onChangeText={setDosage}
          placeholder={t('apps.medication.ui.dosagePlaceholder')}
          autoCapitalize="none"
        />
      </MiniAppCard>

      <MiniAppCard index={4} title={t('apps.medication.ui.howOften')} theme={theme}>
        <View style={styles.chipRow}>
          {localizeFrequencyOptions(t).map((option) => (
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
          {t('apps.medication.ui.startDateHint')}
        </AppText>
        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          accentColor={theme.color}
          onDayPress={setStartDate}
          getDayState={(dayKey) => ({ selected: dayKey === startDate })}
        />
        {startDate ? (
          <AppText variant="body">
            {t('apps.medication.ui.startsOn', { date: formatDisplayDate(startDate) })}
          </AppText>
        ) : null}
      </MiniAppCard>

      <MiniAppCard index={6} title={t('apps.medication.ui.notesOptional')} theme={theme}>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder={t('apps.medication.ui.notesPlaceholder')}
          multiline
        />
      </MiniAppCard>

      {isEditing ? (
        <MiniAppCard index={7} title={t('apps.medication.ui.status')} theme={theme}>
          <View style={styles.chipRow}>
            <MiniAppChip
              label={t('apps.medication.ui.active')}
              selected={active}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setActive(true)}
            />
            <MiniAppChip
              label={t('apps.medication.ui.paused')}
              selected={!active}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setActive(false)}
            />
          </View>
        </MiniAppCard>
      ) : null}

      <MiniAppCta
        label={
          isEditing
            ? t('apps.medicationTracker.setupSaveEdit')
            : t('apps.medicationTracker.setupSave')
        }
        accent={theme.color}
        soft={theme.backgroundColor}
        index={8}
        onPress={() => {
          if (!canSave || !startDate) {
            return;
          }
          if (forKid && !selectedChild) {
            Alert.alert(
              t('apps.medication.ui.selectChildTitle'),
              t('apps.medication.ui.selectChildMessage'),
            );
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
          label={t('apps.medication.ui.removeMedicine')}
          accent={theme.color}
          soft={theme.backgroundColor}
          secondary
          index={9}
          onPress={() => {
            Alert.alert(
              t('apps.medication.ui.removeConfirmTitle'),
              t('apps.medication.ui.removeConfirmMessage'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.remove'),
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
