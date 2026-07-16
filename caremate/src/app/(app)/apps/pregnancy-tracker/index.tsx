import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
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
import {
  formatDueDate,
  getDaysUntilDue,
  getGestationalAge,
  getUpcomingMilestones,
  toDateKey,
} from '@/mini-apps/pregnancy-tracker/utils';
import {
  usePregnancyTrackerHydrated,
  usePregnancyTrackerStore,
} from '@/mini-apps/pregnancy-tracker/store';
import {
  localizeMilestones,
  localizeMood,
  localizePregnancyMilestone,
  localizeSymptom,
  localizeTrimester,
} from '@/mini-apps/pregnancy-tracker/localize';
import { pluralKey } from '@/mini-apps/_kit/i18n';
import { palette } from '@/theme';

const APP_ID = 'pregnancy-tracker' as const;

export default function PregnancyTrackerScreen() {
  const { t } = useTranslation();
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
        ? t(pluralKey('apps.pregnancy.ui.daysUntilDue', daysUntilDue), {
            count: daysUntilDue,
            name: babyNickname,
          })
        : daysUntilDue === 0
          ? t('apps.pregnancy.ui.todayIsDue', { name: babyNickname })
          : t(pluralKey('apps.pregnancy.ui.daysPastDue', Math.abs(daysUntilDue)), {
              count: Math.abs(daysUntilDue),
            })
      : t('apps.pregnancyTracker.emptySubtitle');

  let cardIndex = 1;

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={
          hasSetup ? localizeTrimester(gestationalAge!.trimester, t) : t('apps.pregnancyTracker.eyebrow')
        }
        title={
          hasSetup && gestationalAge
            ? t('apps.pregnancy.ui.weekDay', { weeks: gestationalAge.weeks, days: gestationalAge.days })
            : t('apps.pregnancyTracker.emptyTitle')
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
          title={t('apps.pregnancy.ui.progress')}
          eyebrow={t('apps.pregnancy.ui.timeline')}
          theme={theme}
        >
          <MiniAppProgress
            progress={gestationalAge.progress}
            accent={theme.color}
            label={t('apps.pregnancy.ui.percentComplete', {
              percent: Math.round(gestationalAge.progress * 100),
            })}
          />
          <View style={styles.progressLabels}>
            <AppText variant="caption" style={styles.muted}>
              {t('apps.pregnancy.ui.week0')}
            </AppText>
            <AppText variant="caption" style={styles.muted}>
              {t('apps.pregnancy.ui.week40')}
            </AppText>
          </View>
        </MiniAppCard>
      ) : null}

      {hasSetup && dueDate ? (
        <MiniAppCard index={cardIndex++} title={t('apps.pregnancy.ui.dueDate')} theme={theme}>
          <AppText variant="body">{formatDueDate(dueDate)}</AppText>
          <AppText variant="caption" style={styles.muted}>
            {t('apps.pregnancy.ui.estimatedFromLmp')}
          </AppText>
        </MiniAppCard>
      ) : null}

      {hasSetup ? (
        <MiniAppCard
          index={cardIndex++}
          title={t('apps.pregnancy.ui.todaysLog')}
          eyebrow={t('apps.pregnancy.ui.daily')}
          theme={theme}
        >
          {todayLog?.mood ? (
            <MiniAppRow
              title={t('apps.pregnancy.ui.mood')}
              soft={theme.backgroundColor}
              trailing={<AppText variant="body">{localizeMood(todayLog.mood, t)}</AppText>}
            />
          ) : null}
          <MiniAppRow
            title={t('apps.pregnancy.ui.kicksLogged')}
            soft={theme.backgroundColor}
            trailing={<AppText variant="body">{todayLog?.kickCount ?? 0}</AppText>}
          />
          {todayLog && todayLog.symptoms.length > 0 ? (
            <AppText variant="caption">
              {todayLog.symptoms.map((symptom) => localizeSymptom(symptom, t)).join(' · ')}
            </AppText>
          ) : (
            <AppText variant="caption" style={styles.muted}>
              {t('apps.pregnancy.ui.noSymptomsToday')}
            </AppText>
          )}
        </MiniAppCard>
      ) : null}

      {hasSetup && nextMilestone ? (
        <MiniAppCard index={cardIndex++} title={t('apps.pregnancy.ui.comingUp')} theme={theme}>
          <MiniAppRow
            title={localizePregnancyMilestone(nextMilestone, t).title}
            subtitle={
              nextMilestone.daysUntil === 0
                ? t('apps.pregnancy.ui.weekThisWeek', { week: nextMilestone.week })
                : t(pluralKey('apps.pregnancy.ui.weekInDays', nextMilestone.daysUntil), {
                    week: nextMilestone.week,
                    count: nextMilestone.daysUntil,
                  })
            }
            soft={theme.backgroundColor}
          />
          <AppText variant="quickActionSubtitle">
            {localizePregnancyMilestone(nextMilestone, t).description}
          </AppText>
        </MiniAppCard>
      ) : null}

      {hasSetup ? (
        <MiniAppCard
          index={cardIndex++}
          title={t('apps.pregnancy.ui.milestonesTitle')}
          eyebrow={t('apps.pregnancy.ui.journey')}
          theme={theme}
        >
          {localizeMilestones(t).map((milestone) => {
            const status = milestones.find((item) => item.week === milestone.week);
            const isPast = status?.isPast ?? false;
            return (
              <MiniAppRow
                key={milestone.week}
                title={t('apps.pregnancy.ui.weekLabel', { week: milestone.week })}
                subtitle={milestone.title}
                soft={isPast ? theme.color : theme.backgroundColor}
              />
            );
          })}
        </MiniAppCard>
      ) : null}

      <View style={!hydrated ? styles.ctaDisabled : undefined}>
        <MiniAppCta
          label={
            hasSetup
              ? t('apps.pregnancyTracker.updateDueDate')
              : t('apps.pregnancyTracker.setUp')
          }
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
            label={t('apps.pregnancyTracker.logToday')}
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
