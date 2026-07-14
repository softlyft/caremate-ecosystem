import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { MonthCalendarGrid } from '@/mini-apps/_kit/components/MonthCalendarGrid';
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
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

export default function PeriodTrackerScreen() {
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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <AppText variant="caption" style={styles.heroLabel}>
          Today
        </AppText>
        <AppText variant="screenTitle" style={styles.heroTitle}>
          {cycleDay ? `Day ${cycleDay} of your cycle` : 'Start tracking your cycle'}
        </AppText>
        <AppText variant="subtitle" style={styles.heroSubtitle}>
          {daysUntil !== null
            ? daysUntil === 0
              ? 'Your next period may start today'
              : `About ${daysUntil} day${daysUntil === 1 ? '' : 's'} until your next period`
            : 'Log your last period to see predictions'}
        </AppText>
      </View>

      <View style={[styles.card, shadow.soft]}>
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
                <AppText variant="caption">
                  {date.toLocaleDateString(undefined, { weekday: 'short' })}
                </AppText>
                <View
                  style={[
                    styles.stripBubble,
                    isLogged && styles.loggedDay,
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
      </View>

      <View style={[styles.card, shadow.soft]}>
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
            <View style={[styles.legendDot, styles.loggedDay]} />
            <AppText variant="caption">Logged period</AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.predictedDay]} />
            <AppText variant="caption">Predicted</AppText>
          </View>
        </View>
      </View>

      <View style={[styles.card, shadow.soft]}>
        <AppText variant="cardTitle">Cycle summary</AppText>
        <View style={styles.summaryRow}>
          <AppText variant="body">Average cycle</AppText>
          <AppText variant="body">{cycleLength} days</AppText>
        </View>
        <View style={styles.summaryRow}>
          <AppText variant="body">Period length</AppText>
          <AppText variant="body">{periodLength} days</AppText>
        </View>
        <View style={styles.summaryRow}>
          <AppText variant="body">Logged days</AppText>
          <AppText variant="body">{loggedPeriodDays.length}</AppText>
        </View>
      </View>

      <Button
        label="Log Period Days"
        onPress={() => router.push('/(app)/apps/period-tracker/log')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  hero: {
    backgroundColor: '#FCE7F3',
    borderRadius: radius.xxl,
    padding: layoutSpacing.cardPadding,
    gap: 4,
  },
  heroLabel: {
    color: '#DB2777',
  },
  heroTitle: {
    color: '#831843',
  },
  heroSubtitle: {
    color: '#9D174D',
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
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
  loggedDay: {
    backgroundColor: '#DB2777',
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
