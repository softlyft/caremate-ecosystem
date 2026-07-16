import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { localizationService, useTranslation } from '@/domains/localization';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppCta,
  MiniAppHero,
  MiniAppProgress,
  MiniAppRow,
  MiniAppScreen,
  StatusPill,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import {
  useCheckupPlannerHydrated,
  useCheckupPlannerStore,
} from '@/mini-apps/checkup-planner/store';
import {
  buildYearSchedule,
  getAgeInYear,
  getYearSummary,
  resolvePlannerRegion,
  type CheckupItemStatus,
} from '@/mini-apps/checkup-planner/utils';
import {
  localizeCadence,
  localizeCheckup,
  localizeCheckupStatus,
  localizeGender,
} from '@/mini-apps/checkup-planner/localize';
import { palette, spacing } from '@/theme';

const theme = getMiniAppTheme('checkup-planner');

const STATUS_COLORS: Record<CheckupItemStatus, string> = {
  completed: '#059669',
  due: '#D97706',
  overdue: '#DC2626',
  upcoming: '#6B7280',
};

const STATUS_BACKGROUNDS: Record<CheckupItemStatus, string> = {
  completed: '#D1FAE5',
  due: '#FEF3C7',
  overdue: '#FEE2E2',
  upcoming: '#F3F4F6',
};

export default function CheckupPlannerScreen() {
  const { t } = useTranslation();
  const hydrated = useCheckupPlannerHydrated();
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const profile = useCheckupPlannerStore((state) => state.profile);
  const completions = useCheckupPlannerStore((state) => state.completions);

  const schedule = useMemo(
    () => (profile ? buildYearSchedule(profile, completions, selectedYear) : []),
    [completions, profile, selectedYear],
  );
  const summary = getYearSummary(schedule);
  const region = resolvePlannerRegion(profile?.regionCode);
  const regionLabel =
    region === localizationService.internationalCountryCode
      ? t('apps.checkup.ui.globalShort')
      : (localizationService.getCountryName(region) ?? region);
  const age = profile ? getAgeInYear(profile.dateOfBirth, selectedYear) : null;
  const isNextYear = selectedYear === currentYear + 1;

  const heroTitle = profile
    ? summary.actionable > 0
      ? t(
          summary.actionable === 1 ? 'apps.checkup.ui.actionableOne' : 'apps.checkup.ui.actionableMany',
          { count: summary.actionable, year: selectedYear },
        )
      : summary.completed > 0
        ? t('apps.checkup.ui.onTrack', { year: selectedYear })
        : t('apps.checkup.ui.yearPlan', { year: selectedYear })
    : t('apps.checkupPlanner.emptyTitle');

  const heroSubtitle = profile
    ? t('apps.checkup.ui.ageLine', {
        age: age ?? 0,
        gender: localizeGender(profile.gender, t),
        region: regionLabel,
      })
    : t('apps.checkupPlanner.emptySubtitle');

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId="checkup-planner"
        eyebrow={t('apps.checkupPlanner.eyebrow')}
        title={heroTitle}
        subtitle={heroSubtitle}
      />

      {profile ? (
        <View style={styles.yearSwitcher}>
          <MiniAppChip
            label={t('apps.checkup.ui.thisYear', { year: currentYear })}
            selected={!isNextYear}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={() => setSelectedYear(currentYear)}
          />
          <MiniAppChip
            label={t('apps.checkup.ui.nextYear', { year: currentYear + 1 })}
            selected={isNextYear}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={() => setSelectedYear(currentYear + 1)}
          />
        </View>
      ) : null}

      {profile ? (
        <MiniAppCard index={1} theme={theme}>
          <View style={styles.summaryRow}>
            <AppText variant="body">{t('apps.checkup.ui.done')}</AppText>
            <AppText variant="body">
              {t('apps.checkup.ui.ofTotal', { completed: summary.completed, total: summary.total })}
            </AppText>
          </View>
          <MiniAppProgress progress={summary.progress} accent={theme.color} />
          <AppText variant="caption" style={styles.muted}>
            {t('apps.checkup.ui.guidance')}
          </AppText>
        </MiniAppCard>
      ) : null}

      {profile ? (
        <MiniAppCard index={2} title={t('apps.checkup.ui.checklist', { year: selectedYear })} theme={theme}>
          {schedule.length === 0 ? (
            <AppText variant="caption" style={styles.muted}>
              {t('apps.checkup.ui.emptyYear')}
            </AppText>
          ) : (
            schedule.map((item) => (
              <MiniAppRow
                key={item.checkup.id}
                title={localizeCheckup(item.checkup, t).name}
                subtitle={`${localizeCadence(item.checkup.cadence, t)}${
                  item.completion
                    ? ` · ${t('apps.checkup.ui.doneDate', { date: item.completion.completedDate })}`
                    : ` · ${t('apps.checkup.ui.tapToLog')}`
                }`}
                soft={STATUS_BACKGROUNDS[item.status]}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/apps/checkup-planner/log',
                    params: { checkupId: item.checkup.id, year: String(selectedYear) },
                  })
                }
                trailing={
                  <StatusPill
                    label={localizeCheckupStatus(item.status, t)}
                    color={STATUS_COLORS[item.status]}
                    background={STATUS_BACKGROUNDS[item.status]}
                  />
                }
              />
            ))
          )}
        </MiniAppCard>
      ) : null}

      <MiniAppCta
        label={profile ? t('apps.checkupPlanner.editProfile') : t('apps.checkupPlanner.setUpPlanner')}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={3}
        onPress={() => {
          if (!hydrated) {
            return;
          }
          router.push('/(app)/apps/checkup-planner/setup');
        }}
      />
    </MiniAppScreen>
  );
}

const styles = StyleSheet.create({
  yearSwitcher: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  muted: {
    color: palette.textSecondary,
  },
});
