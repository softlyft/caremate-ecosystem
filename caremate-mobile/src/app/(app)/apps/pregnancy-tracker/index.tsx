import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { confirm } from '@/components/ui/AppDialogHost';
import { AppText } from '@/components/ui/AppText';
import { AD_SLOTS } from '@/domains/ads';
import { AdSlot } from '@/features/ads/AdSlot';
import { useTranslation } from '@/domains/localization';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { useSettingsStore } from '@/domains/profile/store';
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
import { evaluatePregnancyAlerts } from '@/mini-apps/pregnancy-tracker/alerts';
import {
  formatDueDate,
  getDaysSinceBirth,
  getDaysUntilDue,
  getGestationalAge,
  getUpcomingMilestones,
  toDateKey,
} from '@/mini-apps/pregnancy-tracker/utils';
import {
  getMaternalTtDose,
  MATERNAL_TT_DOSE_IDS,
  maternalTtSummary,
} from '@/mini-apps/pregnancy-tracker/maternal-tt';
import {
  listRecentDailyLogs,
  usePregnancyTrackerHydrated,
  usePregnancyTrackerStore,
} from '@/mini-apps/pregnancy-tracker/store';
import {
  buildPregnancyAlertCopy,
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
  const userId = useCurrentUserId();
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);

  const lastMenstrualPeriod = usePregnancyTrackerStore((state) => state.lastMenstrualPeriod);
  const dueDate = usePregnancyTrackerStore((state) => state.dueDate);
  const dueDateSource = usePregnancyTrackerStore((state) => state.dueDateSource);
  const babyNickname = usePregnancyTrackerStore((state) => state.babyNickname);
  const dailyLogs = usePregnancyTrackerStore((state) => state.dailyLogs);
  const status = usePregnancyTrackerStore((state) => state.status);
  const birthDate = usePregnancyTrackerStore((state) => state.birthDate);
  const pastPregnancies = usePregnancyTrackerStore((state) => state.pastPregnancies);
  const maternalTtDoses = usePregnancyTrackerStore((state) => state.maternalTtDoses);
  const closePregnancyQuietly = usePregnancyTrackerStore((state) => state.closePregnancyQuietly);
  const finishPostpartum = usePregnancyTrackerStore((state) => state.finishPostpartum);

  const gestationalAge = getGestationalAge(lastMenstrualPeriod, today);
  const daysUntilDue = getDaysUntilDue(dueDate, today);
  const daysSinceBirth = getDaysSinceBirth(birthDate, today);
  const milestones = getUpcomingMilestones(lastMenstrualPeriod, today);
  const nextMilestone = milestones.find((milestone) => !milestone.isPast);
  const todayLog = dailyLogs[todayKey];
  const recentLogs = useMemo(() => listRecentDailyLogs(dailyLogs, 14), [dailyLogs]);
  const historyLogs = recentLogs.filter((log) => log.dateKey !== todayKey);
  const ttSummary = useMemo(() => maternalTtSummary(maternalTtDoses), [maternalTtDoses]);
  const nextTtId = ttSummary.next;

  const isPostpartum = status === 'postpartum';
  const hasSetup = Boolean(lastMenstrualPeriod && dueDate && status === 'active');
  const isPastDue =
    hasSetup && daysUntilDue !== null && (daysUntilDue < 0 || (gestationalAge?.weeks ?? 0) >= 42);

  useFocusEffect(
    useCallback(() => {
      if (!hydrated || !userId) {
        return;
      }
      void evaluatePregnancyAlerts({
        userId,
        lastMenstrualPeriod,
        dueDate,
        babyNickname,
        hasTodayLog: Boolean(todayLog),
        status,
        maternalTtDoses,
        notificationsEnabled,
        copy: buildPregnancyAlertCopy(t),
      });
    }, [
      hydrated,
      userId,
      lastMenstrualPeriod,
      dueDate,
      babyNickname,
      todayLog,
      status,
      maternalTtDoses,
      notificationsEnabled,
      t,
    ]),
  );

  const heroEyebrow = isPostpartum
    ? t('apps.pregnancy.postnatal.eyebrow')
    : hasSetup
      ? isPastDue
        ? t('apps.pregnancy.ui.postpartumEyebrow')
        : localizeTrimester(gestationalAge!.trimester, t)
      : t('apps.pregnancyTracker.eyebrow');

  const heroTitle = isPostpartum
    ? t('apps.pregnancy.postnatal.heroTitle')
    : hasSetup && gestationalAge
      ? t('apps.pregnancy.ui.weekDay', {
          weeks: gestationalAge.weeks,
          days: gestationalAge.days,
        })
      : t('apps.pregnancyTracker.emptyTitle');

  const heroSubtitle = isPostpartum
    ? daysSinceBirth != null && daysSinceBirth >= 0
      ? t(pluralKey('apps.pregnancy.postnatal.daysSinceBirth', daysSinceBirth), {
          count: daysSinceBirth,
        })
      : t('apps.pregnancy.postnatal.heroSubtitle')
    : hasSetup && daysUntilDue !== null
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

  const onCloseQuietly = async () => {
    const ok = await confirm({
      title: t('apps.pregnancy.postnatal.closeTitle'),
      message: t('apps.pregnancy.postnatal.closeMessage'),
      cancelLabel: t('apps.pregnancy.validation.cancel'),
      confirmLabel: t('apps.pregnancy.postnatal.closeConfirm'),
    });
    if (ok) {
      closePregnancyQuietly();
    }
  };

  const onFinishPostpartum = async () => {
    const ok = await confirm({
      title: t('apps.pregnancy.postnatal.finishTitle'),
      message: t('apps.pregnancy.postnatal.finishMessage'),
      cancelLabel: t('apps.pregnancy.validation.cancel'),
      confirmLabel: t('apps.pregnancy.postnatal.finishConfirm'),
    });
    if (ok) {
      finishPostpartum();
    }
  };

  let cardIndex = 1;

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={heroEyebrow}
        title={heroTitle}
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

      <MiniAppCard
        index={cardIndex++}
        title={t('apps.pregnancy.motherCare.title')}
        eyebrow={t('apps.pregnancy.motherCare.eyebrow')}
        theme={theme}
      >
        <AppText variant="caption" style={styles.muted}>
          {t('apps.pregnancy.motherCare.body')}
        </AppText>
        <AppText variant="caption" style={styles.ttProgress}>
          {ttSummary.next
            ? t('apps.pregnancy.motherCare.progress', {
                completed: ttSummary.completed,
                total: ttSummary.total,
              }) +
              ' · ' +
              t('apps.pregnancy.motherCare.nextDose', {
                dose: t(`apps.pregnancy.motherCare.doses.${ttSummary.next}`),
              })
            : t('apps.pregnancy.motherCare.complete')}
        </AppText>
        {MATERNAL_TT_DOSE_IDS.map((doseId) => {
          const logged = getMaternalTtDose(maternalTtDoses, doseId);
          return (
            <MiniAppRow
              key={doseId}
              title={t(`apps.pregnancy.motherCare.doses.${doseId}`)}
              subtitle={
                logged
                  ? formatDueDate(logged.dateKey)
                  : t('apps.pregnancy.motherCare.notLogged')
              }
              soft={logged ? theme.color : theme.backgroundColor}
            />
          );
        })}
        {nextTtId ? (
          <View style={!hydrated ? styles.ctaDisabled : undefined}>
            <MiniAppCta
              label={
                nextTtId === 'tt1'
                  ? t('apps.pregnancy.motherCare.logTt1')
                  : t('apps.pregnancy.motherCare.logNext')
              }
              accent={theme.color}
              soft={theme.backgroundColor}
              index={0}
              secondary
              onPress={() => {
                if (!hydrated) {
                  return;
                }
                router.push('/(app)/apps/pregnancy-tracker/tt' as Href);
              }}
            />
          </View>
        ) : null}
      </MiniAppCard>

      <AdSlot slotId={AD_SLOTS.PREGNANCY_TIMELINE} />

      {isPostpartum ? (
        <MiniAppCard
          index={cardIndex++}
          title={t('apps.pregnancy.postnatal.careTitle')}
          eyebrow={t('apps.pregnancy.postnatal.eyebrow')}
          theme={theme}
        >
          <AppText variant="caption" style={styles.muted}>
            {t('apps.pregnancy.postnatal.careBody')}
          </AppText>
          {birthDate ? (
            <MiniAppRow
              title={t('apps.pregnancy.postnatal.birthDateLabel')}
              soft={theme.backgroundColor}
              trailing={<AppText variant="body">{formatDueDate(birthDate)}</AppText>}
            />
          ) : null}
        </MiniAppCard>
      ) : null}

      {isPastDue ? (
        <MiniAppCard
          index={cardIndex++}
          title={t('apps.pregnancy.ui.postpartumTitle')}
          eyebrow={t('apps.pregnancy.ui.postpartumEyebrow')}
          theme={theme}
        >
          <AppText variant="caption" style={styles.muted}>
            {t('apps.pregnancy.postnatal.pastDueHint')}
          </AppText>
        </MiniAppCard>
      ) : null}

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
            {dueDateSource === 'due-date'
              ? t('apps.pregnancy.ui.estimatedFromProvider')
              : t('apps.pregnancy.ui.estimatedFromLmp')}
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
          {todayLog?.weightKg != null ? (
            <MiniAppRow
              title={t('apps.pregnancy.ui.weight')}
              soft={theme.backgroundColor}
              trailing={
                <AppText variant="body">
                  {t('apps.pregnancy.ui.weightValue', { value: todayLog.weightKg })}
                </AppText>
              }
            />
          ) : null}
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

      {hasSetup && historyLogs.length > 0 ? (
        <MiniAppCard
          index={cardIndex++}
          title={t('apps.pregnancy.ui.logHistory')}
          eyebrow={t('apps.pregnancy.ui.recent')}
          theme={theme}
        >
          {historyLogs.slice(0, 7).map((log) => (
            <MiniAppRow
              key={log.dateKey}
              title={log.dateKey}
              subtitle={[
                log.mood ? localizeMood(log.mood, t) : null,
                log.kickCount > 0
                  ? t('apps.pregnancy.ui.kicksCount', { count: log.kickCount })
                  : null,
                log.weightKg != null
                  ? t('apps.pregnancy.ui.weightValue', { value: log.weightKg })
                  : null,
                log.symptoms.length > 0
                  ? log.symptoms.map((symptom) => localizeSymptom(symptom, t)).join(', ')
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              soft={theme.backgroundColor}
            />
          ))}
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
            const milestoneStatus = milestones.find((item) => item.week === milestone.week);
            const isPast = milestoneStatus?.isPast ?? false;
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

      {pastPregnancies.length > 0 ? (
        <MiniAppCard
          index={cardIndex++}
          title={t('apps.pregnancy.ui.pastPregnancies')}
          eyebrow={t('apps.pregnancy.ui.history')}
          theme={theme}
        >
          {pastPregnancies.slice(0, 5).map((item) => (
            <MiniAppRow
              key={item.id}
              title={
                item.outcome === 'birth'
                  ? item.babyNickname
                  : t('apps.pregnancy.postnatal.closedPregnancyTitle')
              }
              subtitle={
                item.outcome === 'birth'
                  ? t('apps.pregnancy.postnatal.pastBirthSubtitle', {
                      born: item.birthDate ? formatDueDate(item.birthDate) : item.endedAt,
                      logs: item.logCount,
                    })
                  : t('apps.pregnancy.postnatal.pastClosedSubtitle', {
                      ended: item.endedAt,
                    })
              }
              soft={theme.backgroundColor}
            />
          ))}
        </MiniAppCard>
      ) : null}

      <AdSlot slotId={AD_SLOTS.PREGNANCY_FOOTER} />

      {!isPostpartum ? (
        <View style={!hydrated ? styles.ctaDisabled : undefined}>
          <MiniAppCta
            label={
              hasSetup ? t('apps.pregnancyTracker.updateDueDate') : t('apps.pregnancyTracker.setUp')
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
      ) : null}
      {hasSetup || isPostpartum ? (
        <View style={!hydrated ? styles.ctaDisabled : undefined}>
          <MiniAppCta
            label={
              isPostpartum
                ? t('apps.pregnancy.postnatal.logMotherDay')
                : t('apps.pregnancyTracker.logToday')
            }
            accent={theme.color}
            soft={theme.backgroundColor}
            index={cardIndex++}
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
      {hasSetup ? (
        <View style={!hydrated ? styles.ctaDisabled : undefined}>
          <MiniAppCta
            label={t('apps.pregnancy.postnatal.iveGivenBirth')}
            accent={theme.color}
            soft={theme.backgroundColor}
            index={cardIndex++}
            onPress={() => {
              if (!hydrated) {
                return;
              }
              router.push('/(app)/apps/pregnancy-tracker/birth' as Href);
            }}
          />
        </View>
      ) : null}
      {isPostpartum ? (
        <View style={!hydrated ? styles.ctaDisabled : undefined}>
          <MiniAppCta
            label={t('apps.pregnancy.postnatal.finishPostpartum')}
            accent={theme.color}
            soft={theme.backgroundColor}
            index={cardIndex++}
            secondary
            onPress={() => {
              if (!hydrated) {
                return;
              }
              void onFinishPostpartum();
            }}
          />
        </View>
      ) : null}
      {hasSetup ? (
        <Pressable
          accessibilityRole="button"
          disabled={!hydrated}
          onPress={() => {
            if (!hydrated) {
              return;
            }
            void onCloseQuietly();
          }}
          style={styles.subtleClose}
        >
          <AppText variant="caption" style={styles.subtleCloseText}>
            {t('apps.pregnancy.postnatal.closeLink')}
          </AppText>
        </Pressable>
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
  ttProgress: {
    color: palette.textSecondary,
    marginTop: 4,
    marginBottom: 4,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  subtleClose: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  subtleCloseText: {
    color: palette.textSecondary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
