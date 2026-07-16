import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import {
  MiniAppCard,
  MiniAppCta,
  MiniAppHero,
  MiniAppRow,
  MiniAppScreen,
  MonthCalendarGrid,
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
  isPredictedPeriodDay,
  usePeriodTrackerHydrated,
  usePeriodTrackerStore,
} from '@/mini-apps/period-tracker/store';
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
  const togglePeriodDay = usePeriodTrackerStore((state) => state.togglePeriodDay);

  const cycleDay = getCycleDay(lastPeriodStart, today);
  const nextPeriod = predictNextPeriodStart(lastPeriodStart, cycleLength);
  const daysUntil =
    nextPeriod && lastPeriodStart ? Math.max(0, daysBetween(today, nextPeriod)) : null;
  const weekStrip = getWeekStrip(today);
  const monthLabel = monthRef.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const heroSubtitle =
    daysUntil !== null
      ? daysUntil === 0
        ? t('apps.period.ui.nextMayStartToday')
        : t(pluralKey('apps.period.ui.daysUntilPeriod', daysUntil), { count: daysUntil })
      : t('apps.periodTracker.emptySubtitle');

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={t('apps.periodTracker.eyebrow')}
        title={
          cycleDay
            ? t('apps.period.ui.dayOfCycle', { day: cycleDay })
            : t('apps.periodTracker.emptyTitle')
        }
        subtitle={heroSubtitle}
        trailing={
          cycleDay ? (
            <StatusPill
              label={t('apps.period.ui.dayPill', { day: cycleDay })}
              color={theme.color}
              background={`${theme.color}22`}
            />
          ) : undefined
        }
      />

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
            );
            return (
              <Pressable
                key={key}
                disabled={!hydrated}
                style={styles.stripDay}
                onPress={() => togglePeriodDay(key)}
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
              </Pressable>
            );
          })}
        </ScrollView>
      </MiniAppCard>

      <MiniAppCard index={2} eyebrow={t('apps.period.ui.calendar')} theme={theme}>
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

        <MonthCalendarGrid
          monthRef={monthRef}
          interactive={hydrated}
          accentColor={theme.color}
          predictedColor="#FBCFE8"
          predictedBorderColor="#F472B6"
          onDayPress={togglePeriodDay}
          getDayState={(dayKey) => ({
            logged: loggedPeriodDays.includes(dayKey),
            predicted: isPredictedPeriodDay(
              dayKey,
              lastPeriodStart,
              cycleLength,
              periodLength,
              loggedPeriodDays,
            ),
            today: dayKey === todayKey,
          })}
        />

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.color }]} />
            <AppText variant="caption">{t('apps.period.ui.loggedPeriod')}</AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.predictedDay]} />
            <AppText variant="caption">{t('apps.period.ui.predicted')}</AppText>
          </View>
        </View>
      </MiniAppCard>

      <MiniAppCard index={3} title={t('apps.period.ui.cycleSummary')} theme={theme}>
        <MiniAppRow
          title={t('apps.period.ui.averageCycle')}
          soft={theme.backgroundColor}
          trailing={<AppText variant="body">{t('apps.period.ui.daysCount', { count: cycleLength })}</AppText>}
        />
        <MiniAppRow
          title={t('apps.period.ui.periodLength')}
          soft={theme.backgroundColor}
          trailing={<AppText variant="body">{t('apps.period.ui.daysCount', { count: periodLength })}</AppText>}
        />
        <MiniAppRow
          title={t('apps.period.ui.loggedDays')}
          soft={theme.backgroundColor}
          trailing={<AppText variant="body">{loggedPeriodDays.length}</AppText>}
        />
      </MiniAppCard>

      <MiniAppCta
        label={t('apps.periodTracker.logPeriodDays')}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={4}
        onPress={() => router.push('/(app)/apps/period-tracker/log')}
      />
    </MiniAppScreen>
  );
}

const styles = StyleSheet.create({
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
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
});
