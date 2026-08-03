import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import {
  MiniAppCard,
  MiniAppCta,
  MiniAppHero,
  MiniAppScreen,
  MonthCalendarGrid,
  MonthCalendarNavigator,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import { usePeriodTrackerHydrated, usePeriodTrackerStore } from '@/mini-apps/period-tracker/store';
import {
  assessPeriodDayToggle,
  type PeriodIssue,
} from '@/mini-apps/period-tracker/validation';
import { usePregnancyTrackerStore } from '@/mini-apps/pregnancy-tracker/store';
import { pluralKey } from '@/mini-apps/_kit/i18n';
import { toDateKey } from '@/mini-apps/_kit/date-utils';
import { palette, spacing } from '@/theme';

const APP_ID = 'period-tracker' as const;

export default function LogPeriodScreen() {
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [monthRef, setMonthRef] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const hydrated = usePeriodTrackerHydrated();

  const loggedPeriodDays = usePeriodTrackerStore((state) => state.loggedPeriodDays);
  const cycleLength = usePeriodTrackerStore((state) => state.cycleLength);
  const paused = usePeriodTrackerStore((state) => state.paused);
  const togglePeriodDay = usePeriodTrackerStore((state) => state.togglePeriodDay);
  const setLoggedPeriodDays = usePeriodTrackerStore((state) => state.setLoggedPeriodDays);
  const resume = usePeriodTrackerStore((state) => state.resume);

  const pregnancyLmp = usePregnancyTrackerStore((state) => state.lastMenstrualPeriod);
  const pregnancyDue = usePregnancyTrackerStore((state) => state.dueDate);
  const isPregnant = Boolean(pregnancyLmp && pregnancyDue);

  const issueMessage = (issue: PeriodIssue): string =>
    t(`apps.period.validation.${issue.messageKey}`, issue.params ?? {});

  const requestTogglePeriodDay = (dayKey: string) => {
    const assessment = assessPeriodDayToggle({
      dayKey,
      todayKey,
      paused,
      loggedPeriodDays,
      cycleLength,
    });

    if (assessment.hard) {
      Alert.alert(t('apps.period.validation.checkTitle'), issueMessage(assessment.hard));
      return;
    }

    const apply = () => togglePeriodDay(dayKey);

    if (assessment.soft.length > 0) {
      Alert.alert(
        t('apps.period.validation.confirmTitle'),
        assessment.soft.map(issueMessage).join('\n\n'),
        [
          { text: t('apps.period.validation.cancel'), style: 'cancel' },
          { text: t('apps.period.validation.saveAnyway'), onPress: apply },
        ],
      );
      return;
    }

    apply();
  };

  const requestResume = () => {
    if (isPregnant) {
      Alert.alert(
        t('apps.period.validation.confirmTitle'),
        t('apps.period.validation.resumeWhilePregnant'),
        [
          { text: t('apps.period.validation.cancel'), style: 'cancel' },
          { text: t('apps.period.validation.saveAnyway'), onPress: () => resume() },
        ],
      );
      return;
    }
    resume();
  };

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  if (paused) {
    return (
      <MiniAppScreen>
        <MiniAppHero
          appId={APP_ID}
          eyebrow={t('apps.periodTracker.logPeriodDays')}
          title={t('apps.period.ui.pausedTitle')}
          subtitle={t('apps.period.ui.pausedBecausePregnant')}
        />
        <MiniAppCta
          label={t('apps.period.ui.resumeTracking')}
          accent={theme.color}
          soft={theme.backgroundColor}
          index={1}
          onPress={requestResume}
        />
        <MiniAppCta
          label={t('apps.period.ui.backToTracker')}
          accent={theme.color}
          soft={theme.backgroundColor}
          index={2}
          secondary
          onPress={() => router.back()}
        />
      </MiniAppScreen>
    );
  }

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={t('apps.periodTracker.logPeriodDays')}
        title={t('apps.periodTracker.markPeriod')}
        subtitle={t('apps.periodTracker.markPeriodSubtitle')}
      />

      <MiniAppCard index={1} eyebrow={t('apps.period.ui.calendar')} theme={theme}>
        <MonthCalendarNavigator
          accentColor={theme.color}
          monthRef={monthRef}
          onMonthChange={setMonthRef}
        />

        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          accentColor={theme.color}
          predictedColor="#FBCFE8"
          predictedBorderColor="#F472B6"
          onDayPress={requestTogglePeriodDay}
          getDayState={(dayKey) => ({ selected: loggedPeriodDays.includes(dayKey) })}
        />
      </MiniAppCard>

      <AppText variant="caption" style={styles.selectedCount}>
        {t(pluralKey('apps.period.ui.daysSelected', loggedPeriodDays.length), {
          count: loggedPeriodDays.length,
        })}
      </AppText>

      <MiniAppCta
        label={t('apps.save')}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={2}
        onPress={() => router.back()}
      />
      <MiniAppCta
        label={t('apps.clearSelection')}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={3}
        secondary
        onPress={() => {
          if (loggedPeriodDays.length === 0) {
            return;
          }
          Alert.alert(
            t('apps.period.validation.clearTitle'),
            t('apps.period.validation.clearMessage'),
            [
              { text: t('apps.period.validation.cancel'), style: 'cancel' },
              {
                text: t('apps.period.validation.clearConfirm'),
                style: 'destructive',
                onPress: () => setLoggedPeriodDays([]),
              },
            ],
          );
        }}
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
  selectedCount: {
    color: palette.textSecondary,
    marginTop: -spacing.xs,
  },
});
