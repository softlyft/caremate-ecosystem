import { router, useNavigation } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { alert, confirm } from '@/components/ui/AppDialogHost';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/form-controls';
import { useTranslation } from '@/domains/localization';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppCta,
  MiniAppHero,
  MiniAppScreen,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import {
  VITAL_TYPES,
  VITAL_TYPE_META,
  type BloodSugarContext,
  type BloodSugarUnit,
  type HeightUnit,
  type TemperatureUnit,
  type VitalType,
  type VitalUnit,
  type WeightUnit,
} from '@/mini-apps/vitals-tracker/constants';
import {
  localizeBloodSugarContextOptions,
  localizeUnitChip,
  localizeVitalTypeOptions,
} from '@/mini-apps/vitals-tracker/localize';
import {
  preferUnitForType,
  useVitalsTrackerHydrated,
  useVitalsTrackerStore,
} from '@/mini-apps/vitals-tracker/store';
import {
  convertBloodSugar,
  convertTemperature,
  convertWeight,
  heightToCm,
  cmToHeightParts,
  parsePositiveNumber,
} from '@/mini-apps/vitals-tracker/utils';
import {
  assessVitalDraft,
  getPreviousEntry,
  isVitalDraftStarted,
  type VitalAssessment,
  type VitalDraftInput,
  type VitalIssue,
} from '@/mini-apps/vitals-tracker/validation';
import { palette, spacing } from '@/theme';

const APP_ID = 'vitals-tracker' as const;

type VitalDraftFields = {
  unit: VitalUnit;
  valueText: string;
  systolicText: string;
  diastolicText: string;
  feetText: string;
  inchesText: string;
  notes: string;
  bloodSugarContext: BloodSugarContext | null;
};

type DraftMap = Partial<Record<VitalType, VitalDraftFields>>;

function emptyDraft(type: VitalType, unit: VitalUnit): VitalDraftFields {
  return {
    unit,
    valueText: '',
    systolicText: '',
    diastolicText: '',
    feetText: '',
    inchesText: '',
    notes: '',
    bloodSugarContext: null,
  };
}

function toDraftInput(type: VitalType, draft: VitalDraftFields): VitalDraftInput {
  return { type, ...draft };
}

export default function VitalsLogScreen() {
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
  const navigation = useNavigation();
  const hydrated = useVitalsTrackerHydrated();
  const unitPrefs = useVitalsTrackerStore((state) => state.unitPrefs);
  const entries = useVitalsTrackerStore((state) => state.entries);
  const addEntry = useVitalsTrackerStore((state) => state.addEntry);
  const setUnitPrefs = useVitalsTrackerStore((state) => state.setUnitPrefs);

  const [type, setType] = useState<VitalType>('blood_pressure');
  const [unit, setUnit] = useState<VitalUnit>(() => preferUnitForType('blood_pressure', unitPrefs));
  const [valueText, setValueText] = useState('');
  const [systolicText, setSystolicText] = useState('');
  const [diastolicText, setDiastolicText] = useState('');
  const [feetText, setFeetText] = useState('');
  const [inchesText, setInchesText] = useState('');
  const [notes, setNotes] = useState('');
  const [bloodSugarContext, setBloodSugarContext] = useState<BloodSugarContext | null>(null);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [saving, setSaving] = useState(false);

  const allowLeaveRef = useRef(false);
  const savingRef = useRef(false);
  const saveRef = useRef<() => Promise<void>>(async () => {});

  const typeOptions = useMemo(() => localizeVitalTypeOptions(t), [t]);
  const sugarContextOptions = useMemo(() => localizeBloodSugarContextOptions(t), [t]);

  const liveDraft = (): VitalDraftFields => ({
    unit,
    valueText,
    systolicText,
    diastolicText,
    feetText,
    inchesText,
    notes,
    bloodSugarContext,
  });

  const sessionRef = useRef({
    type,
    drafts,
    live: liveDraft(),
  });

  useEffect(() => {
    sessionRef.current = { type, drafts, live: liveDraft() };
  });

  const applyDraft = (next: VitalType, draft: VitalDraftFields) => {
    setType(next);
    setUnit(draft.unit);
    setValueText(draft.valueText);
    setSystolicText(draft.systolicText);
    setDiastolicText(draft.diastolicText);
    setFeetText(draft.feetText);
    setInchesText(draft.inchesText);
    setNotes(draft.notes);
    setBloodSugarContext(draft.bloodSugarContext);
  };

  const mergedDrafts = (): DraftMap => ({
    ...drafts,
    [type]: liveDraft(),
  });

  const presentTypes = (map: DraftMap): VitalType[] =>
    VITAL_TYPES.filter((id) => {
      const draft = map[id];
      return draft != null && isVitalDraftStarted(toDraftInput(id, draft));
    });

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeaveRef.current) return;
      if (savingRef.current) {
        event.preventDefault();
        return;
      }

      const session = sessionRef.current;
      const map: DraftMap = { ...session.drafts, [session.type]: session.live };
      if (presentTypes(map).length === 0) return;

      event.preventDefault();
      void alert(t('apps.vitalsTracker.unsavedTitle'), t('apps.vitalsTracker.unsavedMessage'), [
        { text: t('apps.vitalsTracker.keepEditing'), style: 'cancel' },
        {
          text: t('apps.vitalsTracker.discardReadings'),
          style: 'destructive',
          onPress: () => {
            allowLeaveRef.current = true;
            navigation.dispatch(event.data.action);
          },
        },
        {
          text: t('apps.vitalsTracker.saveReadings'),
          onPress: () => {
            void saveRef.current();
          },
        },
      ]);
    });

    return unsubscribe;
  }, [navigation, t]);

  const selectType = (next: VitalType) => {
    if (next === type) return;
    const snapshot = liveDraft();
    setDrafts((prev) => ({ ...prev, [type]: snapshot }));
    const stored = drafts[next] ?? emptyDraft(next, preferUnitForType(next, unitPrefs));
    applyDraft(next, stored);
  };

  const switchUnit = (next: VitalUnit) => {
    if (type === 'blood_sugar' && (unit === 'mmol_l' || unit === 'mg_dl')) {
      const current = parsePositiveNumber(valueText);
      if (current != null && (next === 'mmol_l' || next === 'mg_dl')) {
        setValueText(String(Math.round(convertBloodSugar(current, unit, next) * 10) / 10));
      }
      setUnitPrefs({ blood_sugar: next as BloodSugarUnit });
    } else if (type === 'body_temperature' && (unit === 'c' || unit === 'f')) {
      const current = parsePositiveNumber(valueText);
      if (current != null && (next === 'c' || next === 'f')) {
        setValueText(String(Math.round(convertTemperature(current, unit, next) * 10) / 10));
      }
      setUnitPrefs({ body_temperature: next as TemperatureUnit });
    } else if (type === 'weight' && (unit === 'kg' || unit === 'lbs')) {
      const current = parsePositiveNumber(valueText);
      if (current != null && (next === 'kg' || next === 'lbs')) {
        setValueText(String(Math.round(convertWeight(current, unit, next) * 10) / 10));
      }
      setUnitPrefs({ weight: next as WeightUnit });
    } else if (type === 'height' && (unit === 'cm' || unit === 'ft')) {
      if (unit === 'cm' && next === 'ft') {
        const cm = parsePositiveNumber(valueText);
        if (cm != null) {
          const parts = cmToHeightParts(cm);
          setFeetText(String(parts.feet));
          setInchesText(String(parts.inches));
          setValueText('');
        }
      } else if (unit === 'ft' && next === 'cm') {
        const cm = heightToCm({
          unit: 'ft',
          feet: parsePositiveNumber(feetText) ?? 0,
          inches: parsePositiveNumber(inchesText) ?? 0,
        });
        if (cm != null) {
          setValueText(String(Math.round(cm * 10) / 10));
          setFeetText('');
          setInchesText('');
        }
      }
      setUnitPrefs({ height: next as HeightUnit });
    }
    setUnit(next);
  };

  const unitOptions: VitalUnit[] = (() => {
    switch (type) {
      case 'blood_sugar':
        return ['mmol_l', 'mg_dl'];
      case 'body_temperature':
        return ['c', 'f'];
      case 'weight':
        return ['kg', 'lbs'];
      case 'height':
        return ['cm', 'ft'];
      default:
        return [];
    }
  })();

  const issueMessage = (issue: VitalIssue): string =>
    t(`apps.vitals.validation.${issue.messageKey}`, issue.params ?? {});

  const confirmAssessment = async (
    draft: VitalDraftInput,
    assessment: VitalAssessment,
  ): Promise<
    (Omit<VitalAssessment, 'payload'> & { payload: NonNullable<VitalAssessment['payload']> }) | null
  > => {
    const previous = getPreviousEntry(entries, draft.type);
    const typo = assessment.soft.find((issue) => issue.code === 'typo_suggestion');
    const softMessages = assessment.soft.map(issueMessage).filter(Boolean);

    const suggestedDisplayValue = typo?.suggestedDisplayValue;
    if (typo && suggestedDisplayValue != null && !assessment.payload) {
      const useSuggestion = await new Promise<boolean>((resolve) => {
        void alert(t('apps.vitals.validation.confirmTitle'), softMessages.join('\n\n'), [
          {
            text: t('apps.vitals.validation.cancel'),
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: t('apps.vitals.validation.useSuggestion', {
              value: suggestedDisplayValue,
            }),
            onPress: () => resolve(true),
          },
        ]);
      });
      if (!useSuggestion) return null;

      const next = assessVitalDraft(
        { ...draft, valueText: String(suggestedDisplayValue) },
        previous,
      );
      if (next.hard || !next.payload) {
        void alert(
          t('apps.vitals.validation.checkTitle'),
          next.hard ? issueMessage(next.hard) : t('apps.vitals.validation.unusualCheck'),
        );
        return null;
      }
      if (next.soft.length > 0) {
        return confirmAssessment({ ...draft, valueText: String(suggestedDisplayValue) }, next);
      }
      return { ...next, payload: next.payload };
    }

    if (!assessment.payload) return null;

    if (assessment.soft.length === 0) {
      return { ...assessment, payload: assessment.payload };
    }

    const ok = await confirm({
      title: t('apps.vitals.validation.confirmTitle'),
      message: softMessages.join('\n\n'),
      cancelLabel: t('apps.vitals.validation.cancel'),
      confirmLabel: t('apps.vitals.validation.saveAnyway'),
    });
    if (!ok) return null;
    return { ...assessment, payload: assessment.payload };
  };

  const commitPayloads = (payloads: NonNullable<VitalAssessment['payload']>[]) => {
    allowLeaveRef.current = true;
    for (const payload of payloads) {
      addEntry({ ...payload, source: 'manual' });
    }
    router.back();
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    const map = mergedDrafts();
    setDrafts(map);
    const ready = presentTypes(map);

    if (ready.length === 0) {
      void alert(
        t('apps.vitals.validation.checkTitle'),
        t('apps.vitals.validation.requiredReading'),
      );
      return;
    }

    const accepted: NonNullable<VitalAssessment['payload']>[] = [];

    savingRef.current = true;
    setSaving(true);
    try {
      for (const vitalType of ready) {
        const draftFields = map[vitalType];
        if (!draftFields) continue;
        const draft = toDraftInput(vitalType, draftFields);
        const previous = getPreviousEntry(entries, vitalType);
        const assessment = assessVitalDraft(draft, previous);

        if (assessment.hard) {
          applyDraft(vitalType, draftFields);
          void alert(t('apps.vitals.validation.checkTitle'), issueMessage(assessment.hard));
          return;
        }

        if (!assessment.payload) {
          applyDraft(vitalType, draftFields);
          void alert(
            t('apps.vitals.validation.checkTitle'),
            t('apps.vitals.validation.unusualCheck'),
          );
          return;
        }

        if (assessment.soft.length > 0) {
          applyDraft(vitalType, draftFields);
          const confirmed = await confirmAssessment(draft, assessment);
          if (!confirmed) return;
          accepted.push(confirmed.payload);
          continue;
        }

        accepted.push(assessment.payload);
      }

      commitPayloads(accepted);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  useEffect(() => {
    saveRef.current = handleSave;
  });

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  const readyCount = presentTypes(mergedDrafts()).length;
  const saveLabel =
    readyCount > 1
      ? t('apps.vitalsTracker.saveReadingsCount', { count: readyCount })
      : readyCount === 1
        ? t('apps.vitalsTracker.saveLog')
        : t('apps.vitalsTracker.saveReadings');

  let cardIndex = 1;

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={t('apps.vitalsTracker.eyebrow')}
        title={t('apps.vitalsTracker.logTitle')}
        subtitle={t('apps.vitalsTracker.logSubtitle')}
      />

      <MiniAppCard index={cardIndex++} title={t('apps.vitals.ui.vital')} theme={theme}>
        <View style={styles.chipRow}>
          {typeOptions.map((option) => {
            const draft = option.id === type ? liveDraft() : drafts[option.id];
            const filled = draft != null && isVitalDraftStarted(toDraftInput(option.id, draft));
            return (
              <MiniAppChip
                key={option.id}
                label={filled ? `${option.label} ✓` : option.label}
                selected={option.id === type}
                accent={theme.color}
                soft={theme.backgroundColor}
                onPress={() => selectType(option.id)}
              />
            );
          })}
        </View>
      </MiniAppCard>

      {type === 'blood_sugar' ? (
        <MiniAppCard index={cardIndex++} title={t('apps.vitals.ui.measurementType')} theme={theme}>
          <View style={styles.chipRow}>
            {sugarContextOptions.map((option) => (
              <MiniAppChip
                key={option.id}
                label={option.label}
                selected={option.id === bloodSugarContext}
                accent={theme.color}
                soft={theme.backgroundColor}
                onPress={() => setBloodSugarContext(option.id)}
              />
            ))}
          </View>
        </MiniAppCard>
      ) : null}

      {VITAL_TYPE_META[type].hasUnitPicker ? (
        <MiniAppCard index={cardIndex++} title={t('apps.vitals.ui.unit')} theme={theme}>
          <View style={styles.chipRow}>
            {unitOptions.map((option) => (
              <MiniAppChip
                key={option}
                label={localizeUnitChip(option, t)}
                selected={option === unit}
                accent={theme.color}
                soft={theme.backgroundColor}
                onPress={() => switchUnit(option)}
              />
            ))}
          </View>
        </MiniAppCard>
      ) : null}

      <MiniAppCard index={cardIndex++} title={t('apps.vitals.ui.reading')} theme={theme}>
        {type === 'blood_pressure' ? (
          <View style={styles.bpRow}>
            <View style={styles.bpField}>
              <AppText variant="caption" style={styles.fieldLabel}>
                {t('apps.vitals.ui.systolic')}
              </AppText>
              <Input
                value={systolicText}
                onChangeText={setSystolicText}
                placeholder="120"
                keyboardType="decimal-pad"
              />
            </View>
            <AppText variant="cardTitle" style={styles.bpSlash}>
              /
            </AppText>
            <View style={styles.bpField}>
              <AppText variant="caption" style={styles.fieldLabel}>
                {t('apps.vitals.ui.diastolic')}
              </AppText>
              <Input
                value={diastolicText}
                onChangeText={setDiastolicText}
                placeholder="80"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        ) : type === 'height' && unit === 'ft' ? (
          <View style={styles.bpRow}>
            <View style={styles.bpField}>
              <AppText variant="caption" style={styles.fieldLabel}>
                {t('apps.vitals.ui.feet')}
              </AppText>
              <Input
                value={feetText}
                onChangeText={setFeetText}
                placeholder="5"
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.bpField}>
              <AppText variant="caption" style={styles.fieldLabel}>
                {t('apps.vitals.ui.inches')}
              </AppText>
              <Input
                value={inchesText}
                onChangeText={setInchesText}
                placeholder="8"
                keyboardType="number-pad"
              />
            </View>
          </View>
        ) : (
          <Input
            value={valueText}
            onChangeText={setValueText}
            placeholder={t('apps.vitals.ui.valuePlaceholder')}
            keyboardType="decimal-pad"
          />
        )}
        {type === 'blood_pressure' ? (
          <AppText variant="caption" style={styles.hint}>
            {t('apps.vitals.ui.bpHint')}
          </AppText>
        ) : null}
      </MiniAppCard>

      <MiniAppCard index={cardIndex++} title={t('apps.vitals.ui.notesOptional')} theme={theme}>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder={t('apps.vitals.ui.notesPlaceholder')}
          autoCapitalize="sentences"
        />
      </MiniAppCard>

      <MiniAppCta
        label={saving ? t('apps.vitalsTracker.saveReadings') : saveLabel}
        accent={theme.color}
        soft={theme.backgroundColor}
        onPress={() => void handleSave()}
      />
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bpRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  bpField: {
    flex: 1,
    gap: spacing.xs,
  },
  bpSlash: {
    marginBottom: 12,
    color: palette.textSecondary,
  },
  fieldLabel: {
    color: palette.textSecondary,
  },
  hint: {
    marginTop: spacing.sm,
    color: palette.textSecondary,
  },
});
