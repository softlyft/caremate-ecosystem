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
import { parseDateKey } from '@/mini-apps/_kit/date-utils';
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
  endDateForDurationDays,
  durationDaysBetween,
  isMedicationTreatmentEnded,
  normalizeMedication,
  areValidSlotTimes,
  toDateKey,
  type Medication,
  type MedicationInstructions,
} from '@/mini-apps/medication-tracker/utils';
import { DoseTimePicker } from '@/mini-apps/medication-tracker/DoseTimePicker';
import { layoutSpacing, palette, spacing } from '@/theme';

const theme = getMiniAppTheme('medication-tracker');

const DURATION_PRESETS = [3, 5, 7, 14, 30] as const;

type CalendarMode = 'start' | 'end' | 'refill';
type DurationMode = 'ongoing' | 'preset' | 'custom';

function resolveSearchParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0];
  }
  return undefined;
}

function monthStartForDateKey(dateKey: string): Date {
  const date = parseDateKey(dateKey);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Gate on persist hydration before mounting the form so `useState` initializers
 * see the real medication (including a past `startDate`) instead of defaulting
 * to today while the store is still empty.
 */
export default function MedicationSetupScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ medicationId?: string | string[] }>();
  const medicationId = resolveSearchParam(params.medicationId);
  const hydrated = useMedicationTrackerHydrated();
  const medications = useMedicationTrackerStore((state) => state.medications);

  const editingRaw = medicationId
    ? medications.find((medication) => medication.id === medicationId)
    : undefined;
  const editing = editingRaw ? normalizeMedication(editingRaw) : undefined;

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  if (medicationId && !editing) {
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
    <MedicationSetupForm
      key={medicationId ?? 'create'}
      editing={editing}
      todayKey={toDateKey(new Date())}
    />
  );
}

function MedicationSetupForm({ editing, todayKey }: { editing?: Medication; todayKey: string }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const isEditing = Boolean(editing);
  const familyKids = useMedicationFamilyKids();
  const tier = usePremiumTier();

  const medications = useMedicationTrackerStore((state) => state.medications);
  const addMedication = useMedicationTrackerStore((state) => state.addMedication);
  const updateMedication = useMedicationTrackerStore((state) => state.updateMedication);
  const removeMedication = useMedicationTrackerStore((state) => state.removeMedication);

  const initialStart = editing?.startDate ?? todayKey;
  const [monthRef, setMonthRef] = useState(() => monthStartForDateKey(initialStart));
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
  const [startDate, setStartDate] = useState<string | null>(initialStart);
  const [endDate, setEndDate] = useState<string | null>(editing?.endDate ?? null);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [active, setActive] = useState(editing?.active ?? true);
  const [forKid, setForKid] = useState(Boolean(editing?.forKid));
  const [familyMemberId, setFamilyMemberId] = useState<string | null>(
    editing?.familyMemberId ?? null,
  );
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('start');
  const [durationMode, setDurationMode] = useState<DurationMode>(() => {
    if (!editing?.endDate || !editing.startDate) return 'ongoing';
    const days = durationDaysBetween(editing.startDate, editing.endDate);
    return (DURATION_PRESETS as readonly number[]).includes(days) ? 'preset' : 'custom';
  });
  const [durationDays, setDurationDays] = useState<number | null>(() => {
    if (!editing?.endDate || !editing.startDate) return null;
    const days = durationDaysBetween(editing.startDate, editing.endDate);
    return (DURATION_PRESETS as readonly number[]).includes(days) ? days : null;
  });

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? t('apps.medication.ui.editMedicine') : t('apps.medication.ui.addMedicine'),
    });
  }, [isEditing, navigation, t]);

  const applyStartDate = (nextStart: string) => {
    if (durationMode === 'preset' && durationDays != null) {
      const nextEnd = endDateForDurationDays(nextStart, durationDays);
      if (nextEnd < todayKey) {
        Alert.alert(
          t('apps.medication.ui.treatmentEndedTitle'),
          t('apps.medication.ui.treatmentEndedMessage'),
        );
        return;
      }
      setStartDate(nextStart);
      setMonthRef(monthStartForDateKey(nextStart));
      setEndDate(nextEnd);
      return;
    }

    let nextEnd = endDate;
    if (nextEnd && nextEnd < nextStart) {
      nextEnd = nextStart;
    }
    if (nextEnd && nextEnd < todayKey) {
      Alert.alert(
        t('apps.medication.ui.treatmentEndedTitle'),
        t('apps.medication.ui.treatmentEndedMessage'),
      );
      return;
    }

    setStartDate(nextStart);
    setMonthRef(monthStartForDateKey(nextStart));
    if (nextEnd !== endDate) {
      setEndDate(nextEnd);
    }
  };

  const applyOngoing = () => {
    setDurationMode('ongoing');
    setDurationDays(null);
    setEndDate(null);
  };

  const applyDurationPreset = (days: number) => {
    if (!startDate) return;
    const nextEnd = endDateForDurationDays(startDate, days);
    if (nextEnd < todayKey) {
      Alert.alert(
        t('apps.medication.ui.treatmentEndedTitle'),
        t('apps.medication.ui.treatmentEndedMessage'),
      );
      return;
    }
    setDurationMode('preset');
    setDurationDays(days);
    setEndDate(nextEnd);
    setCalendarMode('end');
  };

  const applyCustomDuration = () => {
    setDurationMode('custom');
    setDurationDays(null);
    setCalendarMode('end');
    if (!endDate && startDate) {
      setEndDate(startDate);
    }
  };

  const selectedChild =
    familyKids.status === 'ready'
      ? familyKids.children.find((child) => child.id === familyMemberId)
      : undefined;

  const frequencyOption = getFrequencyOption(frequency);
  const showSchedule = frequencyOption.dosesPerDay > 0;

  const canSave =
    Boolean(name.trim() && startDate) &&
    (!endDate || !startDate || endDate >= startDate) &&
    (!forKid || Boolean(familyMemberId && selectedChild)) &&
    (!showSchedule || areValidSlotTimes(slotTimes, frequencyOption.dosesPerDay));
  const activeMedicationCount = countActiveMedications(medications);
  const atCreateLimit = !isEditing && !canAddMedication(tier, activeMedicationCount);
  const atActivateLimit =
    isEditing && editing && !canActivateMedication(tier, medications, editing.id, active);
  const blockedByCap = atCreateLimit || Boolean(atActivateLimit);

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

  const intro = useMemo(
    () => (isEditing ? t('apps.medication.ui.updateHint') : t('apps.medication.ui.addHint')),
    [isEditing, t],
  );

  return (
    <MiniAppScreen>
      <AppText variant="subtitle" style={styles.intro}>
        {intro}
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
            <DoseTimePicker
              key={`${label}-${index}`}
              label={label}
              value={slotTimes[index] ?? '08:00'}
              accent={theme.color}
              soft={theme.backgroundColor}
              onChange={(next) => {
                const nextTimes = [...slotTimes];
                nextTimes[index] = next;
                setSlotTimes(nextTimes);
              }}
            />
          ))}
          <AppText variant="caption" style={styles.muted}>
            {t('apps.medication.ui.scheduleTimesHint')}
          </AppText>
        </MiniAppCard>
      ) : null}

      <MiniAppCard index={7} title={t('apps.medication.ui.treatmentPeriod')} theme={theme}>
        <AppText variant="caption" style={styles.muted}>
          {t('apps.medication.ui.treatmentPeriodHint')}
        </AppText>
        <View style={[styles.chipRow, styles.spacedInput]}>
          <MiniAppChip
            label={t('apps.medication.ui.durationOngoing')}
            selected={durationMode === 'ongoing'}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={applyOngoing}
          />
          {DURATION_PRESETS.map((days) => (
            <MiniAppChip
              key={days}
              label={t('apps.medication.ui.durationDays', { count: days })}
              selected={durationMode === 'preset' && durationDays === days}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => applyDurationPreset(days)}
            />
          ))}
          <MiniAppChip
            label={t('apps.medication.ui.durationCustom')}
            selected={durationMode === 'custom'}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={applyCustomDuration}
          />
        </View>

        <View style={[styles.chipRow, styles.spacedInput]}>
          <MiniAppChip
            label={t('apps.medication.ui.startDate')}
            selected={calendarMode === 'start'}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={() => setCalendarMode('start')}
          />
          <MiniAppChip
            label={t('apps.medication.ui.endDate')}
            selected={calendarMode === 'end'}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={() => {
              setCalendarMode('end');
              if (durationMode === 'ongoing') {
                applyCustomDuration();
              }
            }}
          />
          <MiniAppChip
            label={t('apps.medication.ui.refillDueDate')}
            selected={calendarMode === 'refill'}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={() => setCalendarMode('refill')}
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
            if (calendarMode === 'refill') {
              setRefillDueDate(dayKey === refillDueDate ? null : dayKey);
              return;
            }
            if (calendarMode === 'start') {
              applyStartDate(dayKey);
              return;
            }
            if (!startDate || dayKey < startDate) {
              Alert.alert(
                t('apps.medication.ui.endBeforeStartTitle'),
                t('apps.medication.ui.endBeforeStartMessage'),
              );
              return;
            }
            if (dayKey < todayKey) {
              Alert.alert(
                t('apps.medication.ui.treatmentEndedTitle'),
                t('apps.medication.ui.treatmentEndedMessage'),
              );
              return;
            }
            setDurationMode('custom');
            setDurationDays(null);
            setEndDate(dayKey === endDate ? null : dayKey);
            if (dayKey === endDate) {
              setDurationMode('ongoing');
            }
          }}
          getDayState={(dayKey) => {
            const inRange =
              Boolean(startDate && endDate) && dayKey > startDate! && dayKey < endDate!;
            if (calendarMode === 'refill') {
              return { selected: dayKey === refillDueDate, predicted: inRange };
            }
            if (calendarMode === 'end') {
              return {
                selected: dayKey === endDate,
                predicted: inRange || dayKey === startDate,
              };
            }
            return {
              selected: dayKey === startDate,
              predicted: inRange || dayKey === endDate,
            };
          }}
        />
        {startDate ? (
          <AppText variant="body">
            {endDate
              ? t('apps.medication.ui.runsFromTo', {
                  start: formatDisplayDate(startDate),
                  end: formatDisplayDate(endDate),
                })
              : t('apps.medication.ui.startsOngoing', { date: formatDisplayDate(startDate) })}
          </AppText>
        ) : null}
        {calendarMode === 'refill' ? (
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
          if (blockedByCap || !startDate || !name.trim()) {
            return;
          }
          if (showSchedule && !areValidSlotTimes(slotTimes, frequencyOption.dosesPerDay)) {
            Alert.alert(
              t('apps.medication.ui.scheduleTimeInvalidTitle'),
              t('apps.medication.ui.scheduleTimeInvalidMessage'),
            );
            return;
          }
          if (!canSave) {
            return;
          }
          if (isMedicationTreatmentEnded({ endDate }, todayKey)) {
            Alert.alert(
              t('apps.medication.ui.treatmentEndedTitle'),
              t('apps.medication.ui.treatmentEndedMessage'),
            );
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
            endDate,
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
  spacedInput: {
    marginTop: spacing.sm,
  },
});
