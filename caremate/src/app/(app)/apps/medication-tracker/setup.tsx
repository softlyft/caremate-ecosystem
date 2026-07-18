import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/form-controls';
import {
  canActivateMedication,
  canAddMedication,
  countActiveMedications,
} from '@/domains/billing/entitlements';
import { useTranslation } from '@/domains/localization';
import { UpgradePrompt } from '@/features/premium/UpgradePrompt';
import { usePremiumTier } from '@/hooks/use-premium-state';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppCta,
  MiniAppScreen,
  MonthCalendarGrid,
  MonthCalendarNavigator,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import {
  DEFAULT_REFILL_THRESHOLD,
  defaultSlotTimesForFrequency,
  getFrequencyOption,
  type MedicationFrequency,
  type MedicationInstructionKind,
} from '@/mini-apps/medication-tracker/constants';
import {
  localizeFrequencyOptions,
  localizeInstructionOptions,
} from '@/mini-apps/medication-tracker/localize';
import {
  useMedicationTrackerHydrated,
  useMedicationTrackerStore,
} from '@/mini-apps/medication-tracker/store';
import { useMedicationFamilyKids } from '@/mini-apps/medication-tracker/use-family-kids';
import {
  formatDisplayDate,
  normalizeMedication,
  toDateKey,
  type MedicationInstructions,
} from '@/mini-apps/medication-tracker/utils';
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
  const tier = usePremiumTier();

  const medications = useMedicationTrackerStore((state) => state.medications);
  const addMedication = useMedicationTrackerStore((state) => state.addMedication);
  const updateMedication = useMedicationTrackerStore((state) => state.updateMedication);
  const removeMedication = useMedicationTrackerStore((state) => state.removeMedication);

  const editingRaw =
    typeof medicationId === 'string'
      ? medications.find((medication) => medication.id === medicationId)
      : undefined;
  const editing = editingRaw ? normalizeMedication(editingRaw) : undefined;
  const isEditing = Boolean(editing);

  const [name, setName] = useState(editing?.name ?? '');
  const [dosage, setDosage] = useState(editing?.dosage ?? '');
  const [frequency, setFrequency] = useState<MedicationFrequency>(
    editing?.frequency ?? 'once-daily',
  );
  const [slotTimes, setSlotTimes] = useState<string[]>(
    editing?.slotTimes ?? defaultSlotTimesForFrequency(editing?.frequency ?? 'once-daily'),
  );
  const [instructionKind, setInstructionKind] = useState<MedicationInstructionKind>(
    editing?.instructions.kind ?? 'none',
  );
  const [instructionText, setInstructionText] = useState(editing?.instructions.text ?? '');
  const [quantityText, setQuantityText] = useState(
    editing?.quantityRemaining != null ? String(editing.quantityRemaining) : '',
  );
  const [refillThresholdText, setRefillThresholdText] = useState(
    String(editing?.refillAtThreshold ?? DEFAULT_REFILL_THRESHOLD),
  );
  const [refillDueDate, setRefillDueDate] = useState<string | null>(editing?.refillDueDate ?? null);
  const [startDate, setStartDate] = useState<string | null>(editing?.startDate ?? todayKey);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [active, setActive] = useState(editing?.active ?? true);
  const [forKid, setForKid] = useState(Boolean(editing?.forKid));
  const [familyMemberId, setFamilyMemberId] = useState<string | null>(
    editing?.familyMemberId ?? null,
  );
  const [editingSnapshotId, setEditingSnapshotId] = useState(editing?.id);
  const [refillCalendarMode, setRefillCalendarMode] = useState(false);

  if (editing && editing.id !== editingSnapshotId) {
    setEditingSnapshotId(editing.id);
    setName(editing.name);
    setDosage(editing.dosage);
    setFrequency(editing.frequency);
    setSlotTimes(editing.slotTimes);
    setInstructionKind(editing.instructions.kind);
    setInstructionText(editing.instructions.text ?? '');
    setQuantityText(editing.quantityRemaining != null ? String(editing.quantityRemaining) : '');
    setRefillThresholdText(String(editing.refillAtThreshold ?? DEFAULT_REFILL_THRESHOLD));
    setRefillDueDate(editing.refillDueDate);
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

  const selectedChild =
    familyKids.status === 'ready'
      ? familyKids.children.find((child) => child.id === familyMemberId)
      : undefined;

  const canSave =
    Boolean(name.trim() && startDate) && (!forKid || Boolean(familyMemberId && selectedChild));
  const activeMedicationCount = countActiveMedications(medications);
  const atCreateLimit = !isEditing && !canAddMedication(tier, activeMedicationCount);
  const atActivateLimit =
    isEditing && editing && !canActivateMedication(tier, medications, editing.id, active);
  const blockedByCap = atCreateLimit || Boolean(atActivateLimit);

  const frequencyOption = getFrequencyOption(frequency);
  const showSchedule = frequencyOption.dosesPerDay > 0;

  const applyFrequency = (next: MedicationFrequency) => {
    setFrequency(next);
    setSlotTimes(defaultSlotTimesForFrequency(next));
  };

  const buildInstructions = (): MedicationInstructions => ({
    kind: instructionKind,
    text:
      instructionKind === 'other' || instructionKind === 'none'
        ? instructionText.trim() || undefined
        : undefined,
  });

  const parseOptionalNumber = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    return Number.isFinite(value) && value >= 0 ? value : null;
  };

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

      <MiniAppCard index={4} title={t('apps.medication.ui.instructions')} theme={theme}>
        <View style={styles.chipRow}>
          {localizeInstructionOptions(t).map((option) => (
            <MiniAppChip
              key={option.id}
              label={option.label}
              selected={option.id === instructionKind}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setInstructionKind(option.id)}
            />
          ))}
        </View>
        {instructionKind === 'other' || instructionKind === 'none' ? (
          <View style={styles.spacedInput}>
            <Input
              value={instructionText}
              onChangeText={setInstructionText}
              placeholder={t('apps.medication.ui.instructionsPlaceholder')}
            />
          </View>
        ) : null}
      </MiniAppCard>

      <MiniAppCard index={5} title={t('apps.medication.ui.howOften')} theme={theme}>
        <View style={styles.chipRow}>
          {localizeFrequencyOptions(t).map((option) => (
            <MiniAppChip
              key={option.id}
              label={option.label}
              selected={option.id === frequency}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => applyFrequency(option.id)}
            />
          ))}
        </View>
      </MiniAppCard>

      {showSchedule ? (
        <MiniAppCard index={6} title={t('apps.medication.ui.scheduleTimes')} theme={theme}>
          {frequencyOption.slotLabels.map((label, index) => (
            <View key={`${label}-${index}`} style={styles.timeRow}>
              <AppText variant="caption" style={styles.muted}>
                {label}
              </AppText>
              <Input
                value={slotTimes[index] ?? ''}
                onChangeText={(value) => {
                  const next = [...slotTimes];
                  next[index] = value;
                  setSlotTimes(next);
                }}
                placeholder="08:00"
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          ))}
          <AppText variant="caption" style={styles.muted}>
            {t('apps.medication.ui.scheduleTimesHint')}
          </AppText>
        </MiniAppCard>
      ) : null}

      <MiniAppCard index={7} theme={theme}>
        <View style={styles.chipRow}>
          <MiniAppChip
            label={t('apps.medication.ui.startDate')}
            selected={!refillCalendarMode}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={() => setRefillCalendarMode(false)}
          />
          <MiniAppChip
            label={t('apps.medication.ui.refillDueDate')}
            selected={refillCalendarMode}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={() => setRefillCalendarMode(true)}
          />
        </View>
        <MonthCalendarNavigator
          accentColor={theme.color}
          monthRef={monthRef}
          onMonthChange={setMonthRef}
        />
        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          accentColor={theme.color}
          onDayPress={(dayKey) => {
            if (refillCalendarMode) {
              setRefillDueDate(dayKey === refillDueDate ? null : dayKey);
              return;
            }
            setStartDate(dayKey);
          }}
          getDayState={(dayKey) => ({
            selected: refillCalendarMode ? dayKey === refillDueDate : dayKey === startDate,
          })}
        />
        {!refillCalendarMode && startDate ? (
          <AppText variant="body">
            {t('apps.medication.ui.startsOn', { date: formatDisplayDate(startDate) })}
          </AppText>
        ) : null}
        {refillCalendarMode ? (
          <AppText variant="body">
            {refillDueDate
              ? t('apps.medication.ui.refillOn', { date: formatDisplayDate(refillDueDate) })
              : t('apps.medication.ui.refillDateOptional')}
          </AppText>
        ) : null}
      </MiniAppCard>

      <MiniAppCard index={8} title={t('apps.medication.ui.refill')} theme={theme}>
        <AppText variant="caption" style={styles.muted}>
          {t('apps.medication.ui.quantityRemaining')}
        </AppText>
        <Input
          value={quantityText}
          onChangeText={setQuantityText}
          placeholder={t('apps.medication.ui.quantityPlaceholder')}
          keyboardType="number-pad"
        />
        <AppText variant="caption" style={[styles.muted, styles.spacedInput]}>
          {t('apps.medication.ui.refillThreshold')}
        </AppText>
        <Input
          value={refillThresholdText}
          onChangeText={setRefillThresholdText}
          placeholder={String(DEFAULT_REFILL_THRESHOLD)}
          keyboardType="number-pad"
        />
      </MiniAppCard>

      <MiniAppCard index={9} title={t('apps.medication.ui.notesOptional')} theme={theme}>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder={t('apps.medication.ui.notesPlaceholder')}
          multiline
        />
      </MiniAppCard>

      {isEditing ? (
        <MiniAppCard index={10} title={t('apps.medication.ui.status')} theme={theme}>
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

      {blockedByCap ? (
        <UpgradePrompt
          title={t('profile.premium.medicationLimitTitle')}
          message={t('profile.premium.medicationLimitMessage')}
        />
      ) : null}

      <MiniAppCta
        label={
          isEditing
            ? t('apps.medicationTracker.setupSaveEdit')
            : t('apps.medicationTracker.setupSave')
        }
        accent={theme.color}
        soft={theme.backgroundColor}
        index={11}
        onPress={() => {
          if (!canSave || !startDate || blockedByCap) {
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
          const payload = {
            name,
            dosage,
            frequency,
            startDate,
            notes,
            slotTimes: showSchedule ? slotTimes : [],
            instructions: buildInstructions(),
            quantityRemaining: parseOptionalNumber(quantityText),
            refillAtThreshold: parseOptionalNumber(refillThresholdText) ?? DEFAULT_REFILL_THRESHOLD,
            refillDueDate,
            ...patientPayload,
          };
          if (isEditing && editing) {
            updateMedication(editing.id, {
              ...payload,
              active,
            });
          } else {
            addMedication(payload);
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
          index={12}
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
  muted: {
    color: palette.textSecondary,
  },
  timeRow: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  spacedInput: {
    marginTop: spacing.sm,
  },
});
