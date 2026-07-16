import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { getCountryName } from '@/constants/locations';
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
  getCadenceLabel,
  getStatusLabel,
  getYearSummary,
  resolvePlannerRegion,
  type CheckupItemStatus,
} from '@/mini-apps/checkup-planner/utils';
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
  const regionLabel = region === 'INT' ? 'International' : (getCountryName(region) ?? region);
  const age = profile ? getAgeInYear(profile.dateOfBirth, selectedYear) : null;
  const isNextYear = selectedYear === currentYear + 1;

  const heroTitle = profile
    ? summary.actionable > 0
      ? `${summary.actionable} checkup${summary.actionable === 1 ? '' : 's'} for ${selectedYear}`
      : summary.completed > 0
        ? `${selectedYear} checkups on track`
        : `Your ${selectedYear} plan`
    : 'Plan your health checkups';

  const heroSubtitle = profile
    ? `Age ${age} · ${profile.gender} · ${regionLabel}`
    : 'Enter your date of birth, gender, and optional region to see recommended tests';

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId="checkup-planner"
        eyebrow="Checkup Planner"
        title={heroTitle}
        subtitle={heroSubtitle}
      />

      {profile ? (
        <View style={styles.yearSwitcher}>
          <MiniAppChip
            label={`This year (${currentYear})`}
            selected={!isNextYear}
            accent={theme.color}
            soft={theme.backgroundColor}
            onPress={() => setSelectedYear(currentYear)}
          />
          <MiniAppChip
            label={`Next year (${currentYear + 1})`}
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
            <AppText variant="body">Done</AppText>
            <AppText variant="body">
              {summary.completed} of {summary.total}
            </AppText>
          </View>
          <MiniAppProgress progress={summary.progress} accent={theme.color} />
          <AppText variant="caption" style={styles.muted}>
            Guidance only — talk with a clinician for personal advice.
          </AppText>
        </MiniAppCard>
      ) : null}

      {profile ? (
        <MiniAppCard index={2} title={`${selectedYear} checklist`} theme={theme}>
          {schedule.length === 0 ? (
            <AppText variant="caption" style={styles.muted}>
              No checkups listed for this year with your current profile.
            </AppText>
          ) : (
            schedule.map((item) => (
              <MiniAppRow
                key={item.checkup.id}
                title={item.checkup.name}
                subtitle={`${getCadenceLabel(item.checkup.cadence)}${
                  item.completion ? ` · Done ${item.completion.completedDate}` : ` · Tap to log`
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
                    label={getStatusLabel(item.status)}
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
        label={profile ? 'Edit profile' : 'Set up planner'}
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
