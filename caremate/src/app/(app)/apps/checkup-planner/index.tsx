import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { getCountryName } from '@/constants/locations';
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
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <AppText variant="caption" style={styles.heroLabel}>
          Checkup Planner
        </AppText>
        <AppText variant="screenTitle" style={styles.heroTitle}>
          {profile
            ? summary.actionable > 0
              ? `${summary.actionable} checkup${summary.actionable === 1 ? '' : 's'} for ${selectedYear}`
              : summary.completed > 0
                ? `${selectedYear} checkups on track`
                : `Your ${selectedYear} plan`
            : 'Plan your health checkups'}
        </AppText>
        <AppText variant="subtitle" style={styles.heroSubtitle}>
          {profile
            ? `Age ${age} · ${profile.gender} · ${regionLabel}`
            : 'Enter your date of birth, gender, and optional region to see recommended tests'}
        </AppText>
      </View>

      {profile ? (
        <View style={styles.yearSwitcher}>
          <Pressable
            style={[styles.yearChip, !isNextYear && styles.yearChipSelected]}
            onPress={() => setSelectedYear(currentYear)}
          >
            <AppText
              variant="caption"
              style={!isNextYear ? styles.yearChipTextSelected : undefined}
            >
              This year ({currentYear})
            </AppText>
          </Pressable>
          <Pressable
            style={[styles.yearChip, isNextYear && styles.yearChipSelected]}
            onPress={() => setSelectedYear(currentYear + 1)}
          >
            <AppText variant="caption" style={isNextYear ? styles.yearChipTextSelected : undefined}>
              Next year ({currentYear + 1})
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {profile ? (
        <View style={[styles.card, shadow.soft]}>
          <View style={styles.summaryRow}>
            <AppText variant="body">Done</AppText>
            <AppText variant="body">
              {summary.completed} of {summary.total}
            </AppText>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${summary.progress * 100}%` }]} />
          </View>
          <AppText variant="caption" style={styles.muted}>
            Guidance only — talk with a clinician for personal advice.
          </AppText>
        </View>
      ) : null}

      {profile ? (
        <View style={[styles.card, shadow.soft]}>
          <AppText variant="cardTitle">{selectedYear} checklist</AppText>
          {schedule.length === 0 ? (
            <AppText variant="caption" style={styles.muted}>
              No checkups listed for this year with your current profile.
            </AppText>
          ) : (
            schedule.map((item) => (
              <Pressable
                key={item.checkup.id}
                style={styles.row}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/apps/checkup-planner/log',
                    params: { checkupId: item.checkup.id, year: String(selectedYear) },
                  })
                }
              >
                <View style={styles.rowCopy}>
                  <AppText variant="body">{item.checkup.name}</AppText>
                  <AppText variant="caption" style={styles.muted}>
                    {getCadenceLabel(item.checkup.cadence)}
                    {item.completion ? ` · Done ${item.completion.completedDate}` : ` · Tap to log`}
                  </AppText>
                </View>
                <View
                  style={[styles.statusBadge, { backgroundColor: STATUS_BACKGROUNDS[item.status] }]}
                >
                  <AppText variant="caption" style={{ color: STATUS_COLORS[item.status] }}>
                    {getStatusLabel(item.status)}
                  </AppText>
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={profile ? 'Edit profile' : 'Set up planner'}
          onPress={() => router.push('/(app)/apps/checkup-planner/setup')}
          disabled={!hydrated}
        />
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
    backgroundColor: '#CCFBF1',
    borderRadius: radius.xxl,
    padding: layoutSpacing.cardPadding,
    gap: 4,
  },
  heroLabel: {
    color: '#0F766E',
  },
  heroTitle: {
    color: '#134E4A',
  },
  heroSubtitle: {
    color: '#0F766E',
  },
  yearSwitcher: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  yearChip: {
    flex: 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: palette.background,
  },
  yearChipSelected: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0F766E',
  },
  yearChipTextSelected: {
    color: '#0F766E',
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: '#99F6E4',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: '#0F766E',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  muted: {
    color: palette.textSecondary,
  },
  actions: {
    gap: spacing.sm,
  },
});
