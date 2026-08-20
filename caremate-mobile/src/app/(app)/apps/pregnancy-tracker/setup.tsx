import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, View } from 'react-native';

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
  MonthCalendarGrid,
  MonthCalendarNavigator,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import { parseDateKey, toDateKey } from '@/mini-apps/_kit/date-utils';
import { usePeriodTrackerStore } from '@/mini-apps/period-tracker/store';
import {
  usePregnancyTrackerHydrated,
  usePregnancyTrackerStore,
} from '@/mini-apps/pregnancy-tracker/store';
import { calculateDueDateFromLmp, formatDueDate } from '@/mini-apps/pregnancy-tracker/utils';
import {
  assessPregnancySetupDraft,
  type PregnancyIssue,
} from '@/mini-apps/pregnancy-tracker/validation';
import { palette, radius, spacing } from '@/theme';

type SetupMode = 'lmp' | 'due-date';

const APP_ID = 'pregnancy-tracker' as const;

export default function PregnancySetupScreen() {
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [monthRef, setMonthRef] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [mode, setMode] = useState<SetupMode>('lmp');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const hydrated = usePregnancyTrackerHydrated();

  const babyNickname = usePregnancyTrackerStore((state) => state.babyNickname);
  const status = usePregnancyTrackerStore((state) => state.status);
  const lastMenstrualPeriod = usePregnancyTrackerStore((state) => state.lastMenstrualPeriod);
  const dueDate = usePregnancyTrackerStore((state) => state.dueDate);
  const dueDateSource = usePregnancyTrackerStore((state) => state.dueDateSource);
  const setBabyNickname = usePregnancyTrackerStore((state) => state.setBabyNickname);
  const setFromLastPeriod = usePregnancyTrackerStore((state) => state.setFromLastPeriod);
  const setFromDueDate = usePregnancyTrackerStore((state) => state.setFromDueDate);
  const periodPaused = usePeriodTrackerStore((state) => state.paused);

  const hasActiveTimeline = Boolean(status === 'active' && lastMenstrualPeriod && dueDate);
  const previouslyEnded = status === 'ended';
  const isPostpartum = status === 'postpartum';

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const seeded = dueDateSource === 'due-date' ? dueDate : lastMenstrualPeriod;
    if (!seeded) {
      return;
    }
    setMode(dueDateSource === 'due-date' ? 'due-date' : 'lmp');
    setSelectedDate((current) => current ?? seeded);
    const parsed = parseDateKey(seeded);
    setMonthRef(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }, [dueDate, dueDateSource, hydrated, lastMenstrualPeriod]);

  const previewDueDate =
    mode === 'lmp' && selectedDate ? calculateDueDateFromLmp(selectedDate) : selectedDate;

  const issueMessage = (issue: PregnancyIssue): string =>
    t(`apps.pregnancy.validation.${issue.messageKey}`, issue.params ?? {});

  const commitSetup = async () => {
    Keyboard.dismiss();
    try {
      const assessment = assessPregnancySetupDraft({
        mode,
        selectedDate,
        babyNickname,
        todayKey,
        periodTrackerActive: !periodPaused,
        hasActiveTimeline,
        previouslyEnded,
        isPostpartum,
      });

      if (assessment.hard) {
        await alert(t('apps.pregnancy.validation.checkTitle'), issueMessage(assessment.hard));
        return;
      }

      if (!assessment.payload) {
        await alert(
          t('apps.pregnancy.validation.checkTitle'),
          t('apps.pregnancy.validation.unusualCheck'),
        );
        return;
      }

      const save = () => {
        if (assessment.payload!.mode === 'lmp') {
          setFromLastPeriod(assessment.payload!.selectedDate, assessment.payload!.babyNickname);
        } else {
          setFromDueDate(assessment.payload!.selectedDate, assessment.payload!.babyNickname);
        }
        router.back();
      };

      // Pausing Period Tracker is expected — don't block first-time save on a confirm.
      const blockingSoft = assessment.soft.filter((issue) => issue.code !== 'soft_will_pause_period');
      if (blockingSoft.length > 0) {
        const ok = await confirm({
          title: t('apps.pregnancy.validation.confirmTitle'),
          message: blockingSoft.map(issueMessage).join('\n\n'),
          cancelLabel: t('apps.pregnancy.validation.cancel'),
          confirmLabel: t('apps.pregnancy.validation.saveAnyway'),
        });
        if (ok) {
          save();
        }
        return;
      }

      save();
    } catch {
      await alert(
        t('apps.pregnancy.validation.checkTitle'),
        t('apps.pregnancy.validation.unusualCheck'),
      );
    }
  };

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={t('apps.pregnancy.ui.setupEyebrow')}
        title={t('apps.pregnancy.ui.setTimeline')}
        subtitle={t('apps.pregnancy.ui.setTimelineSubtitle')}
      />

      <View style={styles.modeRow}>
        <MiniAppChip
          label={t('apps.pregnancy.ui.lastPeriod')}
          selected={mode === 'lmp'}
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => {
            setMode('lmp');
            setSelectedDate(null);
          }}
        />
        <MiniAppChip
          label={t('apps.pregnancy.ui.dueDate')}
          selected={mode === 'due-date'}
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => {
            setMode('due-date');
            setSelectedDate(null);
          }}
        />
      </View>

      <MiniAppCard index={1} title={t('apps.pregnancy.ui.babyNickname')} theme={theme}>
        <Input
          value={babyNickname}
          onChangeText={setBabyNickname}
          placeholder={t('apps.pregnancy.ui.babyPlaceholder')}
          autoCapitalize="words"
        />
      </MiniAppCard>

      <MiniAppCard index={2} eyebrow={t('apps.pregnancy.ui.pickDate')} theme={theme}>
        <MonthCalendarNavigator
          accentColor={theme.color}
          monthRef={monthRef}
          onMonthChange={setMonthRef}
        />

        <AppText variant="caption" style={styles.muted}>
          {mode === 'lmp' ? t('apps.pregnancy.ui.tapLmp') : t('apps.pregnancy.ui.tapDue')}
        </AppText>
        {!periodPaused ? (
          <AppText variant="caption" style={styles.muted}>
            {t('apps.pregnancy.validation.willPausePeriod')}
          </AppText>
        ) : null}

        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          accentColor={theme.color}
          onDayPress={setSelectedDate}
          getDayState={(dayKey) => ({ selected: dayKey === selectedDate })}
        />
      </MiniAppCard>

      {previewDueDate ? (
        <View style={[styles.preview, { backgroundColor: theme.backgroundColor }]}>
          <AppText variant="body" style={{ color: theme.titleColor }}>
            {mode === 'lmp'
              ? t('apps.pregnancy.ui.estimatedDue')
              : t('apps.pregnancy.ui.selectedDue')}
            : {formatDueDate(previewDueDate)}
          </AppText>
        </View>
      ) : null}

      <MiniAppCta
        label={t('apps.pregnancyTracker.setupSave')}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={3}
        onPress={commitSetup}
      />
    </MiniAppScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  muted: {
    color: palette.textSecondary,
  },
  preview: {
    borderRadius: radius.xl,
    padding: spacing.md,
  },
});
