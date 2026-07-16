import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import {
  MiniAppCard,
  MiniAppCta,
  MiniAppHero,
  MiniAppProgress,
  MiniAppRow,
  MiniAppScreen,
  StatusPill,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
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
import { palette } from '@/theme';

const APP_ID = 'pregnancy-tracker' as const;

export default function PregnancyTrackerScreen() {
  const theme = getMiniAppTheme(APP_ID);
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

  const heroSubtitle =
    hasSetup && daysUntilDue !== null
      ? daysUntilDue > 0
        ? `${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} until ${babyNickname}'s due date`
        : daysUntilDue === 0
          ? `Today is ${babyNickname}'s due date`
          : `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} past due date`
      : 'Set your due date or last period to get started';

  let cardIndex = 1;

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={hasSetup ? getTrimesterLabel(gestationalAge!.trimester) : 'Pregnancy'}
        title={
          hasSetup && gestationalAge
            ? `Week ${gestationalAge.weeks}, Day ${gestationalAge.days}`
            : 'Track your pregnancy journey'
        }
        subtitle={heroSubtitle}
        trailing={
          hasSetup && gestationalAge ? (
            <StatusPill
              label={`${Math.round(gestationalAge.progress * 100)}%`}
              color={theme.color}
              background={`${theme.color}22`}
            />
          ) : undefined
        }
      />

      {hasSetup && gestationalAge ? (
        <MiniAppCard
          index={cardIndex++}
          title="Pregnancy progress"
          eyebrow="Timeline"
          theme={theme}
        >
          <MiniAppProgress
            progress={gestationalAge.progress}
            accent={theme.color}
            label={`${Math.round(gestationalAge.progress * 100)}% complete`}
          />
          <View style={styles.progressLabels}>
            <AppText variant="caption" style={styles.muted}>
              Week 0
            </AppText>
            <AppText variant="caption" style={styles.muted}>
              Week 40
            </AppText>
          </View>
        </MiniAppCard>
      ) : null}

      {hasSetup && dueDate ? (
        <MiniAppCard index={cardIndex++} title="Due date" theme={theme}>
          <AppText variant="body">{formatDueDate(dueDate)}</AppText>
          <AppText variant="caption" style={styles.muted}>
            Estimated from your last menstrual period
          </AppText>
        </MiniAppCard>
      ) : null}

      {hasSetup ? (
        <MiniAppCard index={cardIndex++} title="Today's log" eyebrow="Daily" theme={theme}>
          {todayLog?.mood ? (
            <MiniAppRow
              title="Mood"
              soft={theme.backgroundColor}
              trailing={<AppText variant="body">{todayLog.mood}</AppText>}
            />
          ) : null}
          <MiniAppRow
            title="Kicks logged"
            soft={theme.backgroundColor}
            trailing={<AppText variant="body">{todayLog?.kickCount ?? 0}</AppText>}
          />
          {todayLog && todayLog.symptoms.length > 0 ? (
            <AppText variant="caption">{todayLog.symptoms.join(' · ')}</AppText>
          ) : (
            <AppText variant="caption" style={styles.muted}>
              No symptoms logged yet today
            </AppText>
          )}
        </MiniAppCard>
      ) : null}

      {hasSetup && nextMilestone ? (
        <MiniAppCard index={cardIndex++} title="Coming up" theme={theme}>
          <MiniAppRow
            title={nextMilestone.title}
            subtitle={
              nextMilestone.daysUntil === 0
                ? `Week ${nextMilestone.week} · This week`
                : `Week ${nextMilestone.week} · In about ${nextMilestone.daysUntil} day${nextMilestone.daysUntil === 1 ? '' : 's'}`
            }
            soft={theme.backgroundColor}
          />
          <AppText variant="quickActionSubtitle">{nextMilestone.description}</AppText>
        </MiniAppCard>
      ) : null}

      {hasSetup ? (
        <MiniAppCard index={cardIndex++} title="Milestones" eyebrow="Journey" theme={theme}>
          {MILESTONES.map((milestone) => {
            const status = milestones.find((item) => item.week === milestone.week);
            const isPast = status?.isPast ?? false;
            return (
              <MiniAppRow
                key={milestone.week}
                title={`Week ${milestone.week}`}
                subtitle={milestone.title}
                soft={isPast ? theme.color : theme.backgroundColor}
              />
            );
          })}
        </MiniAppCard>
      ) : null}

      <View style={!hydrated ? styles.ctaDisabled : undefined}>
        <MiniAppCta
          label={hasSetup ? 'Update due date' : 'Set up pregnancy'}
          accent={theme.color}
          soft={theme.backgroundColor}
          index={cardIndex++}
          onPress={() => {
            if (!hydrated) {
              return;
            }
            router.push('/(app)/apps/pregnancy-tracker/setup');
          }}
        />
      </View>
      {hasSetup ? (
        <View style={!hydrated ? styles.ctaDisabled : undefined}>
          <MiniAppCta
            label="Log today"
            accent={theme.color}
            soft={theme.backgroundColor}
            index={cardIndex}
            secondary
            onPress={() => {
              if (!hydrated) {
                return;
              }
              router.push('/(app)/apps/pregnancy-tracker/log');
            }}
          />
        </View>
      ) : null}
    </MiniAppScreen>
  );
}

const styles = StyleSheet.create({
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  muted: {
    color: palette.textSecondary,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
});
