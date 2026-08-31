import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Button, Input } from '@/components/ui/form-controls';

import { alert, confirm } from '@/components/ui/AppDialogHost';
import { AppText } from '@/components/ui/AppText';
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
  POSTPARTUM_SYMPTOM_OPTIONS,
  SYMPTOM_OPTIONS,
} from '@/mini-apps/pregnancy-tracker/constants';
import {
  getTodayLog,
  usePregnancyTrackerHydrated,
  usePregnancyTrackerStore,
  type PregnancyDailyLog,
} from '@/mini-apps/pregnancy-tracker/store';
import {
  localizeMoodOptions,
  localizeSymptomOptions,
  type PregnancyLogPhase,
} from '@/mini-apps/pregnancy-tracker/localize';
import {
  assessPregnancyLogDraft,
  type PregnancyIssue,
} from '@/mini-apps/pregnancy-tracker/validation';
import { toDateKey } from '@/mini-apps/_kit/date-utils';
import { palette, radius, spacing } from '@/theme';

const APP_ID = 'pregnancy-tracker' as const;

function PregnancyLogForm({
  todayKey,
  initialLog,
  phase,
}: {
  todayKey: string;
  initialLog: PregnancyDailyLog | undefined;
  phase: PregnancyLogPhase;
}) {
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
  const upsertDailyLog = usePregnancyTrackerStore((state) => state.upsertDailyLog);
  const isPostpartum = phase === 'postpartum';
  const allowedSymptoms = useMemo(
    () => new Set<string>(isPostpartum ? POSTPARTUM_SYMPTOM_OPTIONS : SYMPTOM_OPTIONS),
    [isPostpartum],
  );

  const [mood, setMood] = useState<string | undefined>(initialLog?.mood);
  const [symptoms, setSymptoms] = useState<string[]>(() =>
    (initialLog?.symptoms ?? []).filter((item) => allowedSymptoms.has(item)),
  );
  const [kickCount, setKickCount] = useState(isPostpartum ? 0 : (initialLog?.kickCount ?? 0));
  const [notes, setNotes] = useState(initialLog?.notes ?? '');
  const [weightText, setWeightText] = useState(
    initialLog?.weightKg != null && Number.isFinite(initialLog.weightKg)
      ? String(initialLog.weightKg)
      : '',
  );

  const toggleSymptom = (symptom: string) => {
    setSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom],
    );
  };

  const issueMessage = (issue: PregnancyIssue): string =>
    t(`apps.pregnancy.validation.${issue.messageKey}`, issue.params ?? {});

  const commitLog = async () => {
    const trimmedWeight = weightText.trim();
    const weightKg = trimmedWeight.length > 0 ? Number(trimmedWeight.replace(',', '.')) : undefined;

    const assessment = assessPregnancyLogDraft({
      dateKey: todayKey,
      mood,
      symptoms,
      kickCount: isPostpartum ? 0 : kickCount,
      notes,
      weightKg: trimmedWeight.length > 0 ? weightKg : null,
      journeyStatus: phase,
    });

    if (assessment.hard) {
      void alert(t('apps.pregnancy.validation.checkTitle'), issueMessage(assessment.hard));
      return;
    }

    if (!assessment.payload) {
      void alert(
        t('apps.pregnancy.validation.checkTitle'),
        t('apps.pregnancy.validation.unusualCheck'),
      );
      return;
    }

    const save = () => {
      upsertDailyLog({
        ...getTodayLog(todayKey),
        ...assessment.payload!,
      });
      router.back();
    };

    if (assessment.soft.length > 0) {
      const ok = await confirm({
        title: t('apps.pregnancy.validation.confirmTitle'),
        message: assessment.soft.map(issueMessage).join('\n\n'),
        cancelLabel: t('apps.pregnancy.validation.cancel'),
        confirmLabel: t('apps.pregnancy.validation.saveAnyway'),
      });
      if (ok) {
        save();
      }
      return;
    }

    save();
  };

  let cardIndex = 1;

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={
          isPostpartum ? t('apps.pregnancy.postnatal.eyebrow') : t('apps.pregnancy.ui.dailyLog')
        }
        title={t('apps.pregnancy.ui.howFeeling')}
        subtitle={
          isPostpartum
            ? t('apps.pregnancy.ui.howFeelingSubtitlePostpartum')
            : t('apps.pregnancy.ui.howFeelingSubtitle')
        }
      />

      <MiniAppCard index={cardIndex++} title={t('apps.pregnancy.ui.mood')} theme={theme}>
        <View style={styles.chipRow}>
          {localizeMoodOptions(t).map((option) => (
            <MiniAppChip
              key={option.id}
              label={option.label}
              selected={mood === option.id}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => setMood(mood === option.id ? undefined : option.id)}
            />
          ))}
        </View>
      </MiniAppCard>

      <MiniAppCard index={cardIndex++} title={t('apps.pregnancy.ui.symptoms')} theme={theme}>
        <View style={styles.chipRow}>
          {localizeSymptomOptions(t, phase).map((option) => (
            <MiniAppChip
              key={option.id}
              label={option.label}
              selected={symptoms.includes(option.id)}
              accent={theme.color}
              soft={theme.backgroundColor}
              onPress={() => toggleSymptom(option.id)}
            />
          ))}
        </View>
      </MiniAppCard>

      {!isPostpartum ? (
        <MiniAppCard index={cardIndex++} title={t('apps.pregnancy.ui.babyKicks')} theme={theme}>
          <View style={styles.counterRow}>
            <Button
              style={[styles.counterButton, { borderColor: theme.color }]}
              onPress={() => setKickCount((count) => Math.max(0, count - 1))}
              variant="plain"
            >
              <Minus color={theme.color} size={18} />
            </Button>
            <AppText variant="screenTitle" style={{ color: theme.titleColor }}>
              {kickCount}
            </AppText>
            <Button
              style={[styles.counterButton, { borderColor: theme.color }]}
              onPress={() => setKickCount((count) => count + 1)}
              variant="plain"
            >
              <Plus color={theme.color} size={18} />
            </Button>
          </View>
          <AppText variant="caption" style={styles.muted}>
            {t('apps.pregnancy.ui.tapKickHint')}
          </AppText>
        </MiniAppCard>
      ) : null}

      <MiniAppCard index={cardIndex++} title={t('apps.pregnancy.ui.weight')} theme={theme}>
        <Input
          value={weightText}
          onChangeText={setWeightText}
          placeholder={t('apps.pregnancy.ui.weightPlaceholder')}
          keyboardType="decimal-pad"
        />
        <AppText variant="caption" style={styles.muted}>
          {t('apps.pregnancy.ui.weightHint')}
        </AppText>
      </MiniAppCard>

      <MiniAppCard index={cardIndex++} title={t('apps.pregnancy.ui.notes')} theme={theme}>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder={t('apps.pregnancy.ui.notesPlaceholder')}
          multiline
          style={styles.notesInput}
          textAlignVertical="top"
        />
      </MiniAppCard>

      <MiniAppCta
        label={t('apps.pregnancyTracker.saveLog')}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={cardIndex}
        onPress={commitLog}
      />
    </MiniAppScreen>
  );
}

export default function PregnancyLogScreen() {
  const theme = getMiniAppTheme(APP_ID);
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const hydrated = usePregnancyTrackerHydrated();
  const existingLog = usePregnancyTrackerStore((state) => state.dailyLogs[todayKey]);
  const status = usePregnancyTrackerStore((state) => state.status);
  const phase: PregnancyLogPhase = status === 'postpartum' ? 'postpartum' : 'active';

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  // Mount form only after hydrate so local state seeds from persisted log (no effect).
  return <PregnancyLogForm todayKey={todayKey} initialLog={existingLog} phase={phase} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  notesInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  muted: {
    color: palette.textSecondary,
    textAlign: 'center',
  },
});
