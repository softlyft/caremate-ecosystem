import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

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
  type VitalAssessment,
  type VitalDraftInput,
  type VitalIssue,
} from '@/mini-apps/vitals-tracker/validation';
import { palette, spacing } from '@/theme';

const APP_ID = 'vitals-tracker' as const;

export default function VitalsLogScreen() {
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
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

  const typeOptions = useMemo(() => localizeVitalTypeOptions(t), [t]);
  const sugarContextOptions = useMemo(() => localizeBloodSugarContextOptions(t), [t]);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  const selectType = (next: VitalType) => {
    setType(next);
    setUnit(preferUnitForType(next, unitPrefs));
    setValueText('');
    setSystolicText('');
    setDiastolicText('');
    setFeetText('');
    setInchesText('');
    setBloodSugarContext(null);
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

  const buildDraft = (overrides?: Partial<VitalDraftInput>): VitalDraftInput => ({
    type,
    unit,
    valueText,
    systolicText,
    diastolicText,
    feetText,
    inchesText,
    notes,
    bloodSugarContext,
    ...overrides,
  });

  const issueMessage = (issue: VitalIssue): string =>
    t(`apps.vitals.validation.${issue.messageKey}`, issue.params ?? {});

  const savePayload = (assessment: VitalAssessment) => {
    if (!assessment.payload) return;
    addEntry({ ...assessment.payload, source: 'manual' });
    router.back();
  };

  const confirmSoftThenSave = async (assessment: VitalAssessment, draft: VitalDraftInput) => {
    const previous = getPreviousEntry(entries, type);
    const typo = assessment.soft.find((issue) => issue.code === 'typo_suggestion');
    const softMessages = assessment.soft.map(issueMessage).filter(Boolean);

    if (typo && typo.suggestedDisplayValue != null && !assessment.payload) {
      void alert(t('apps.vitals.validation.confirmTitle'), softMessages.join('\n\n'), [
        { text: t('apps.vitals.validation.cancel'), style: 'cancel' },
        {
          text: t('apps.vitals.validation.useSuggestion', {
            value: typo.suggestedDisplayValue,
          }),
          onPress: () => {
            const next = assessVitalDraft(
              { ...draft, valueText: String(typo.suggestedDisplayValue) },
              previous,
            );
            if (next.hard) {
              void alert(t('apps.vitals.validation.checkTitle'), issueMessage(next.hard));
              return;
            }
            if (next.soft.length > 0 && next.payload) {
              void confirmSoftThenSave(next, {
                ...draft,
                valueText: String(typo.suggestedDisplayValue),
              });
              return;
            }
            savePayload(next);
          },
        },
      ]);
      return;
    }

    if (assessment.soft.length === 0) {
      savePayload(assessment);
      return;
    }

    const ok = await confirm({
      title: t('apps.vitals.validation.confirmTitle'),
      message: softMessages.join('\n\n'),
      cancelLabel: t('apps.vitals.validation.cancel'),
      confirmLabel: t('apps.vitals.validation.saveAnyway'),
    });
    if (ok) {
      savePayload(assessment);
    }
  };

  const handleSave = async () => {
    const draft = buildDraft();
    const previous = getPreviousEntry(entries, type);
    const assessment = assessVitalDraft(draft, previous);

    if (assessment.hard) {
      void alert(t('apps.vitals.validation.checkTitle'), issueMessage(assessment.hard));
      return;
    }

    if (!assessment.payload && assessment.soft.some((s) => s.code === 'typo_suggestion')) {
      await confirmSoftThenSave(assessment, draft);
      return;
    }

    if (!assessment.payload) {
      void alert(t('apps.vitals.validation.checkTitle'), t('apps.vitals.validation.unusualCheck'));
      return;
    }

    if (assessment.soft.length > 0) {
      await confirmSoftThenSave(assessment, draft);
      return;
    }

    savePayload(assessment);
  };

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
          {typeOptions.map((option) => (
            <MiniAppChip
              key={option.id}
              label={option.label}
              selected={option.id === type}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => selectType(option.id)}
            />
          ))}
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
        label={t('apps.vitalsTracker.saveLog')}
        accent={theme.color}
        soft={theme.backgroundColor}
        onPress={handleSave}
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
