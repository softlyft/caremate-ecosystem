import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { MILESTONES } from '@/mini-apps/pregnancy-tracker/constants';
import {
  formatDueDate,
  getDaysUntilDue,
  getGestationalAge,
  getTrimesterLabel,
  getUpcomingMilestones,
  toDateKey,
} from '@/mini-apps/pregnancy-tracker/utils';
import {
  usePregnancyTrackerHydrated,
  usePregnancyTrackerStore,
} from '@/mini-apps/pregnancy-tracker/store';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

export default function PregnancyTrackerScreen() {
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const hydrated = usePregnancyTrackerHydrated();

  const lastMenstrualPeriod = usePregnancyTrackerStore((state) => state.lastMenstrualPeriod);
  const dueDate = usePregnancyTrackerStore((state) => state.dueDate);
  const babyNickname = usePregnancyTrackerStore((state) => state.babyNickname);
  const dailyLogs = usePregnancyTrackerStore((state) => state.dailyLogs);

  const gestationalAge = getGestationalAge(lastMenstrualPeriod, today);
  const daysUntilDue = getDaysUntilDue(dueDate, today);
  const milestones = getUpcomingMilestones(lastMenstrualPeriod, today);
  const nextMilestone = milestones.find((milestone) => !milestone.isPast);
  const todayLog = dailyLogs[todayKey];

  const hasSetup = Boolean(lastMenstrualPeriod && dueDate);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <AppText variant="caption" style={styles.heroLabel}>
          {hasSetup ? getTrimesterLabel(gestationalAge!.trimester) : 'Pregnancy'}
        </AppText>
        <AppText variant="screenTitle" style={styles.heroTitle}>
          {hasSetup && gestationalAge
            ? `Week ${gestationalAge.weeks}, Day ${gestationalAge.days}`
            : 'Track your pregnancy journey'}
        </AppText>
        <AppText variant="subtitle" style={styles.heroSubtitle}>
          {hasSetup && daysUntilDue !== null
            ? daysUntilDue > 0
              ? `${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} until ${babyNickname}'s due date`
              : daysUntilDue === 0
                ? `Today is ${babyNickname}'s due date`
                : `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} past due date`
            : 'Set your due date or last period to get started'}
        </AppText>
      </View>

      {hasSetup && gestationalAge ? (
        <View style={[styles.card, shadow.soft]}>
          <View style={styles.progressHeader}>
            <AppText variant="cardTitle">Pregnancy progress</AppText>
            <AppText variant="caption">{Math.round(gestationalAge.progress * 100)}%</AppText>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${gestationalAge.progress * 100}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <AppText variant="caption">Week 0</AppText>
            <AppText variant="caption">Week 40</AppText>
          </View>
        </View>
      ) : null}

      {hasSetup && dueDate ? (
        <View style={[styles.card, shadow.soft]}>
          <AppText variant="cardTitle">Due date</AppText>
          <AppText variant="body">{formatDueDate(dueDate)}</AppText>
          <AppText variant="caption" style={styles.muted}>
            Estimated from your last menstrual period
          </AppText>
        </View>
      ) : null}

      {hasSetup ? (
        <View style={[styles.card, shadow.soft]}>
          <AppText variant="cardTitle">Today&apos;s log</AppText>
          {todayLog?.mood ? (
            <View style={styles.summaryRow}>
              <AppText variant="body">Mood</AppText>
              <AppText variant="body">{todayLog.mood}</AppText>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <AppText variant="body">Kicks logged</AppText>
            <AppText variant="body">{todayLog?.kickCount ?? 0}</AppText>
          </View>
          {todayLog && todayLog.symptoms.length > 0 ? (
            <AppText variant="caption">{todayLog.symptoms.join(' · ')}</AppText>
          ) : (
            <AppText variant="caption" style={styles.muted}>
              No symptoms logged yet today
            </AppText>
          )}
        </View>
      ) : null}

      {hasSetup && nextMilestone ? (
        <View style={[styles.card, shadow.soft]}>
          <AppText variant="cardTitle">Coming up</AppText>
          <AppText variant="body">{nextMilestone.title}</AppText>
          <AppText variant="caption" style={styles.muted}>
            Week {nextMilestone.week} ·{' '}
            {nextMilestone.daysUntil === 0
              ? 'This week'
              : `In about ${nextMilestone.daysUntil} day${nextMilestone.daysUntil === 1 ? '' : 's'}`}
          </AppText>
          <AppText variant="quickActionSubtitle">{nextMilestone.description}</AppText>
        </View>
      ) : null}

      {hasSetup ? (
        <View style={[styles.card, shadow.soft]}>
          <AppText variant="cardTitle">Milestones</AppText>
          {MILESTONES.map((milestone) => {
            const status = milestones.find((item) => item.week === milestone.week);
            const isPast = status?.isPast ?? false;
            return (
              <View key={milestone.week} style={styles.milestoneRow}>
                <View style={[styles.milestoneDot, isPast && styles.milestoneDotDone]} />
                <View style={styles.milestoneCopy}>
                  <AppText variant="body">Week {milestone.week}</AppText>
                  <AppText variant="caption" style={styles.muted}>
                    {milestone.title}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={hasSetup ? 'Update due date' : 'Set up pregnancy'}
          onPress={() => router.push('/(app)/apps/pregnancy-tracker/setup')}
          disabled={!hydrated}
        />
        {hasSetup ? (
          <Button
            label="Log today"
            variant="secondary"
            onPress={() => router.push('/(app)/apps/pregnancy-tracker/log')}
            disabled={!hydrated}
          />
        ) : null}
      </View>
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
    backgroundColor: '#E0F2FE',
    borderRadius: radius.xxl,
    padding: layoutSpacing.cardPadding,
    gap: 4,
  },
  heroLabel: {
    color: '#0284C7',
  },
  heroTitle: {
    color: '#0C4A6E',
  },
  heroSubtitle: {
    color: '#0369A1',
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: '#BAE6FD',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: '#0284C7',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  milestoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#BAE6FD',
    marginTop: 6,
  },
  milestoneDotDone: {
    backgroundColor: '#0284C7',
  },
  milestoneCopy: {
    flex: 1,
    gap: 2,
  },
  muted: {
    color: palette.textSecondary,
  },
  actions: {
    gap: spacing.sm,
  },
});
