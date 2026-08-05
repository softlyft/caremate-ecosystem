import { router } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/form-controls';

import { alert, confirm } from '@/components/ui/AppDialogHost';
import { AppText } from '@/components/ui/AppText';
import { AD_SLOTS } from '@/domains/ads';
import { useTranslation } from '@/domains/localization';
import { AdSlot } from '@/features/ads/AdSlot';
import {
  MiniAppCard,
  MiniAppCta,
  MiniAppHero,
  MiniAppRow,
  MiniAppScreen,
  MonthCalendarGrid,
  MonthCalendarNavigator,
  StatusPill,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import {
  daysBetween,
  getCycleDay,
  getWeekStrip,
  predictNextPeriodStart,
  toDateKey,
} from '@/mini-apps/period-tracker/utils';
import {
  CYCLE_LENGTH_MAX,
  CYCLE_LENGTH_MIN,
  isPredictedPeriodDay,
  usePeriodTrackerHydrated,
  usePeriodTrackerStore,
} from '@/mini-apps/period-tracker/store';
import { assessPeriodDayToggle, type PeriodIssue } from '@/mini-apps/period-tracker/validation';
import { usePregnancyTrackerStore } from '@/mini-apps/pregnancy-tracker/store';
import { pluralKey } from '@/mini-apps/_kit/i18n';
import { palette, radius, spacing } from '@/theme';

const APP_ID = 'period-tracker' as const;

export default function PeriodTrackerScreen() {
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [monthRef, setMonthRef] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const hydrated = usePeriodTrackerHydrated();

  const cycleLength = usePeriodTrackerStore((state) => state.cycleLength);
  const periodLength = usePeriodTrackerStore((state) => state.periodLength);
  const loggedPeriodDays = usePeriodTrackerStore((state) => state.loggedPeriodDays);
  const lastPeriodStart = usePeriodTrackerStore((state) => state.lastPeriodStart);
  const paused = usePeriodTrackerStore((state) => state.paused);
  const pausedReason = usePeriodTrackerStore((state) => state.pausedReason);
  const togglePeriodDay = usePeriodTrackerStore((state) => state.togglePeriodDay);
  const setCycleLength = usePeriodTrackerStore((state) => state.setCycleLength);
  const pauseForPregnancy = usePeriodTrackerStore((state) => state.pauseForPregnancy);
  const resume = usePeriodTrackerStore((state) => state.resume);

  const pregnancyLmp = usePregnancyTrackerStore((state) => state.lastMenstrualPeriod);
  const pregnancyDue = usePregnancyTrackerStore((state) => state.dueDate);
  const isPregnant = Boolean(pregnancyLmp && pregnancyDue);

  const issueMessage = (issue: PeriodIssue): string =>
    t(`apps.period.validation.${issue.messageKey}`, issue.params ?? {});

  const requestTogglePeriodDay = async (dayKey: string) => {
    const assessment = assessPeriodDayToggle({
      dayKey,
      todayKey,
      paused,
      loggedPeriodDays,
      cycleLength,
    });

    if (assessment.hard) {
      void alert(t('apps.period.validation.checkTitle'), issueMessage(assessment.hard));
      return;
    }

    const apply = () => togglePeriodDay(dayKey);

    if (assessment.soft.length > 0) {
      const ok = await confirm({
        title: t('apps.period.validation.confirmTitle'),
        message: assessment.soft.map(issueMessage).join('\n\n'),
        cancelLabel: t('apps.period.validation.cancel'),
        confirmLabel: t('apps.period.validation.saveAnyway'),
      });
      if (ok) {
        apply();
      }
      return;
    }

    apply();
  };

  const requestResume = async () => {
    if (isPregnant) {
      const ok = await confirm({
        title: t('apps.period.validation.confirmTitle'),
        message: t('apps.period.validation.resumeWhilePregnant'),
        cancelLabel: t('apps.period.validation.cancel'),
        confirmLabel: t('apps.period.validation.saveAnyway'),
      });
      if (ok) {
        resume();
      }
      return;
    }
    resume();
  };

  const cycleDay = paused ? null : getCycleDay(lastPeriodStart, today);
  const nextPeriod = paused ? null : predictNextPeriodStart(lastPeriodStart, cycleLength);
  const daysUntil =
    nextPeriod && lastPeriodStart ? Math.max(0, daysBetween(today, nextPeriod)) : null;
  const weekStrip = getWeekStrip(today);
  const interactive = hydrated && !paused;

  const heroTitle = paused
    ? t('apps.period.ui.pausedTitle')
    : cycleDay
      ? t('apps.period.ui.dayOfCycle', { day: cycleDay })
      : t('apps.periodTracker.emptyTitle');

  const heroSubtitle = paused
    ? pausedReason === 'pregnancy'
      ? t('apps.period.ui.pausedBecausePregnant')
      : t('apps.period.ui.pausedSubtitle')
    : daysUntil !== null
      ? daysUntil === 0
        ? t('apps.period.ui.nextMayStartToday')
        : t(pluralKey('apps.period.ui.daysUntilPeriod', daysUntil), { count: daysUntil })
      : t('apps.periodTracker.emptySubtitle');

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={t('apps.periodTracker.eyebrow')}
        title={heroTitle}
        subtitle={heroSubtitle}
        trailing={
          paused ? (
            <StatusPill
              label={t('apps.period.ui.pausedPill')}
              color={theme.color}
              background={`${theme.color}22`}
            />
          ) : cycleDay ? (
            <StatusPill
              label={t('apps.period.ui.dayPill', { day: cycleDay })}
              color={theme.color}
              background={`${theme.color}22`}
            />
          ) : undefined
        }
      />

      {paused ? (
        <MiniAppCard index={0} title={t('apps.period.ui.pausedCardTitle')} theme={theme}>
          <AppText variant="caption" style={styles.pausedBody}>
            {t('apps.period.ui.pausedCardBody')}
          </AppText>
          <MiniAppCta
            label={t('apps.period.ui.resumeTracking')}
            accent={theme.color}
            soft={theme.backgroundColor}
            index={0}
            onPress={requestResume}
          />
          {isPregnant ? (
            <Button
              style={styles.pregnancyLink}
              onPress={() => router.push('/(app)/apps/pregnancy-tracker')}
              variant="plain"
            >
              <AppText variant="caption" style={{ color: theme.color }}>
                {t('apps.period.ui.openPregnancyTracker')}
              </AppText>
            </Button>
          ) : null}
        </MiniAppCard>
      ) : null}

      {!paused && isPregnant ? (
        <MiniAppCard index={0} title={t('apps.period.ui.pauseWhilePregnantTitle')} theme={theme}>
          <AppText variant="caption" style={styles.pausedBody}>
            {t('apps.period.ui.pauseWhilePregnantBody')}
          </AppText>
          <MiniAppCta
            label={t('apps.period.ui.pauseTracking')}
            accent={theme.color}
            soft={theme.backgroundColor}
            index={0}
            onPress={pauseForPregnancy}
          />
        </MiniAppCard>
      ) : null}

      <AdSlot slotId={AD_SLOTS.PERIOD_WEEK} />

      <MiniAppCard index={1} title={t('apps.period.ui.thisWeek')} theme={theme}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {weekStrip.map((date) => {
            const key = toDateKey(date);
            const isToday = key === todayKey;
            const isLogged = loggedPeriodDays.includes(key);
            const isPredicted = isPredictedPeriodDay(
              key,
              lastPeriodStart,
              cycleLength,
              periodLength,
              loggedPeriodDays,
              paused,
            );
            return (
              <Button
                key={key}
                disabled={!interactive}
                style={styles.stripDay}
                onPress={() => requestTogglePeriodDay(key)}
                variant="plain"
              >
                <AppText variant="caption" style={styles.stripWeekday}>
                  {date.toLocaleDateString(undefined, { weekday: 'short' })}
                </AppText>
                <View
                  style={[
                    styles.stripBubble,
                    isLogged && { backgroundColor: theme.color },
                    isPredicted && styles.predictedDay,
                    isToday && styles.todayRing,
                  ]}
                >
                  <AppText variant="body" style={isLogged ? styles.loggedDayText : undefined}>
                    {date.getDate()}
                  </AppText>
                </View>
              </Button>
            );
          })}
        </ScrollView>
      </MiniAppCard>

      <MiniAppCard index={2} eyebrow={t('apps.period.ui.calendar')} theme={theme}>
        <MonthCalendarNavigator
          accentColor={theme.color}
          monthRef={monthRef}
          onMonthChange={setMonthRef}
        />

        <MonthCalendarGrid
          monthRef={monthRef}
          interactive={interactive}
          accentColor={theme.color}
          predictedColor="#FBCFE8"
          predictedBorderColor="#F472B6"
          onDayPress={requestTogglePeriodDay}
          getDayState={(dayKey) => ({
            logged: loggedPeriodDays.includes(dayKey),
            predicted: isPredictedPeriodDay(
              dayKey,
              lastPeriodStart,
              cycleLength,
              periodLength,
              loggedPeriodDays,
              paused,
            ),
            today: dayKey === todayKey,
          })}
        />

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.color }]} />
            <AppText variant="caption">{t('apps.period.ui.loggedPeriod')}</AppText>
          </View>
          {!paused ? (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.predictedDay]} />
              <AppText variant="caption">{t('apps.period.ui.predicted')}</AppText>
            </View>
          ) : null}
        </View>
      </MiniAppCard>

      <MiniAppCard index={3} title={t('apps.period.ui.cycleSummary')} theme={theme}>
        <MiniAppRow
          title={t('apps.period.ui.averageCycle')}
          soft={theme.backgroundColor}
          trailing={
            <View style={styles.cycleStepper}>
              <Button
                variant="plain"
                disabled={!hydrated || cycleLength <= CYCLE_LENGTH_MIN}
                accessibilityLabel={t('apps.period.ui.decreaseAverageCycle')}
                style={[styles.cycleStepperButton, { borderColor: theme.color }]}
                onPress={() => setCycleLength(cycleLength - 1)}
              >
                <Minus color={theme.color} size={16} />
              </Button>
              <AppText variant="body" style={styles.cycleStepperValue}>
                {t('apps.period.ui.daysCount', { count: cycleLength })}
              </AppText>
              <Button
                variant="plain"
                disabled={!hydrated || cycleLength >= CYCLE_LENGTH_MAX}
                accessibilityLabel={t('apps.period.ui.increaseAverageCycle')}
                style={[styles.cycleStepperButton, { borderColor: theme.color }]}
                onPress={() => setCycleLength(cycleLength + 1)}
              >
                <Plus color={theme.color} size={16} />
              </Button>
            </View>
          }
        />
        <MiniAppRow
          title={t('apps.period.ui.periodLength')}
          soft={theme.backgroundColor}
          trailing={
            <AppText variant="body">
              {t('apps.period.ui.daysCount', { count: periodLength })}
            </AppText>
          }
        />
        <MiniAppRow
          title={t('apps.period.ui.loggedDays')}
          soft={theme.backgroundColor}
          trailing={<AppText variant="body">{loggedPeriodDays.length}</AppText>}
        />
      </MiniAppCard>

      <AdSlot slotId={AD_SLOTS.PERIOD_FOOTER} />

      {!paused ? (
        <MiniAppCta
          label={t('apps.periodTracker.logPeriodDays')}
          accent={theme.color}
          soft={theme.backgroundColor}
          index={4}
          onPress={() => router.push('/(app)/apps/period-tracker/log')}
        />
      ) : null}
    </MiniAppScreen>
  );
}

const styles = StyleSheet.create({
  pausedBody: {
    color: palette.textSecondary,
    marginBottom: spacing.sm,
  },
  pregnancyLink: {
    alignSelf: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  strip: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stripDay: {
    width: 52,
    alignItems: 'center',
    gap: 6,
  },
  stripWeekday: {
    color: palette.textSecondary,
  },
  stripBubble: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  predictedDay: {
    backgroundColor: '#FBCFE8',
    borderWidth: 1,
    borderColor: '#F472B6',
    borderStyle: 'dashed',
  },
  loggedDayText: {
    color: '#FFFFFF',
  },
  todayRing: {
    borderWidth: 2,
    borderColor: palette.primary,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cycleStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cycleStepperButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  cycleStepperValue: {
    minWidth: 72,
    textAlign: 'center',
  },
});
