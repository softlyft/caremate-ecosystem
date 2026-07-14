import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { useFamilyImmunizationChildren } from '@/mini-apps/immunization-tracker/use-family-children';
import {
  useActiveImmunizationProfile,
  useActiveImmunizationRecords,
  useImmunizationTrackerStore,
} from '@/mini-apps/immunization-tracker/store';
import {
  buildSchedule,
  formatDisplayDate,
  getAgeLabel,
  getScheduleSummary,
  getStatusLabel,
  VaccineStatus,
} from '@/mini-apps/immunization-tracker/utils';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

const STATUS_COLORS: Record<VaccineStatus, string> = {
  completed: '#059669',
  overdue: '#DC2626',
  'due-soon': '#D97706',
  upcoming: '#6B7280',
};

const STATUS_BACKGROUNDS: Record<VaccineStatus, string> = {
  completed: '#D1FAE5',
  overdue: '#FEE2E2',
  'due-soon': '#FEF3C7',
  upcoming: '#F3F4F6',
};

export default function ImmunizationTrackerScreen() {
  const today = useMemo(() => new Date(), []);
  const familySource = useFamilyImmunizationChildren();

  const profiles = useImmunizationTrackerStore((state) => state.profiles);
  const activeProfileId = useImmunizationTrackerStore((state) => state.activeProfileId);
  const setActiveProfileId = useImmunizationTrackerStore((state) => state.setActiveProfileId);
  const profile = useActiveImmunizationProfile();
  const records = useActiveImmunizationRecords();

  const schedule = profile ? buildSchedule(profile, records, today) : [];
  const summary = getScheduleSummary(schedule);
  const hasProfile = Boolean(profile);

  if (familySource.status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
        <AppText variant="subtitle">Loading children from your family…</AppText>
      </View>
    );
  }

  if (familySource.status === 'guest') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <AppText variant="caption" style={styles.heroLabel}>
            Immunization
          </AppText>
          <AppText variant="screenTitle" style={styles.heroTitle}>
            Sign in required
          </AppText>
          <AppText variant="subtitle" style={styles.heroSubtitle}>
            Immunization tracking uses children from your CareMate family profile.
          </AppText>
        </View>
        <Button label="Sign in" onPress={() => router.push('/(auth)/login')} />
      </ScrollView>
    );
  }

  if (familySource.status === 'needs_family_setup' || familySource.status === 'needs_children') {
    const needsSetup = familySource.status === 'needs_family_setup';
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <AppText variant="caption" style={styles.heroLabel}>
            Immunization
          </AppText>
          <AppText variant="screenTitle" style={styles.heroTitle}>
            {needsSetup ? 'Set up your family first' : 'Add children in Family'}
          </AppText>
          <AppText variant="subtitle" style={styles.heroSubtitle}>
            {needsSetup
              ? 'Create your family profile and add kids with date of birth. Then their vaccine schedule will appear here.'
              : 'Your household has no children with a date of birth yet. Add kids in Family to start tracking vaccines.'}
          </AppText>
        </View>
        <Button
          label={needsSetup ? 'Set up family' : 'Open family'}
          onPress={() => router.push(needsSetup ? '/(app)/family/setup' : '/(app)/family')}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <AppText variant="caption" style={styles.heroLabel}>
          {hasProfile ? profile!.name : 'Immunization'}
        </AppText>
        <AppText variant="screenTitle" style={styles.heroTitle}>
          {hasProfile
            ? `${summary.completed} of ${summary.total} vaccines completed`
            : 'Track immunizations'}
        </AppText>
        <AppText variant="subtitle" style={styles.heroSubtitle}>
          {hasProfile
            ? summary.overdue > 0
              ? `${summary.overdue} vaccine${summary.overdue === 1 ? '' : 's'} overdue — schedule a visit`
              : summary.nextDue
                ? `Next: ${summary.nextDue.vaccine.name} (${summary.nextDue.vaccine.doseLabel})`
                : 'All scheduled vaccines are up to date'
            : 'Select a child to see their recommended vaccine schedule'}
        </AppText>
      </View>

      {profiles.length > 0 ? (
        <View style={styles.childSwitcher}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.childRow}
          >
            {profiles.map((item) => {
              const selected = item.id === activeProfileId;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.childChip, selected && styles.childChipSelected]}
                  onPress={() => setActiveProfileId(item.id)}
                >
                  <AppText
                    variant="caption"
                    style={selected ? styles.childChipTextSelected : undefined}
                  >
                    {item.name}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
          <AppText variant="caption" style={styles.muted}>
            Children come from your Family profile.
          </AppText>
          <Button
            label="Manage in Family"
            variant="secondary"
            onPress={() => router.push('/(app)/family')}
          />
        </View>
      ) : null}

      {hasProfile && profile ? (
        <View style={[styles.card, shadow.soft]}>
          <View style={styles.summaryRow}>
            <AppText variant="body">Date of birth</AppText>
            <AppText variant="body">{formatDisplayDate(profile.dateOfBirth)}</AppText>
          </View>
          <View style={styles.summaryRow}>
            <AppText variant="body">Age</AppText>
            <AppText variant="body">{getAgeLabel(profile.dateOfBirth, today)}</AppText>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${summary.progress * 100}%` }]} />
          </View>
        </View>
      ) : null}

      {hasProfile && summary.nextDue ? (
        <View style={[styles.card, shadow.soft, styles.nextDueCard]}>
          <AppText variant="cardTitle">Attention needed</AppText>
          <AppText variant="body">
            {summary.nextDue.vaccine.name} · {summary.nextDue.vaccine.doseLabel}
          </AppText>
          <AppText variant="caption" style={styles.muted}>
            Recommended by {formatDisplayDate(summary.nextDue.recommendedDate)}
            {summary.nextDue.status === 'overdue'
              ? ` · ${Math.abs(summary.nextDue.daysUntilDue)} day${Math.abs(summary.nextDue.daysUntilDue) === 1 ? '' : 's'} overdue`
              : summary.nextDue.daysUntilDue === 0
                ? ' · Due today'
                : ` · Due in ${summary.nextDue.daysUntilDue} day${summary.nextDue.daysUntilDue === 1 ? '' : 's'}`}
          </AppText>
          <Button
            label="Log this vaccine"
            onPress={() =>
              router.push({
                pathname: '/(app)/apps/immunization-tracker/log',
                params: { vaccineId: summary.nextDue!.vaccine.id, profileId: profile!.id },
              })
            }
          />
        </View>
      ) : null}

      {hasProfile ? (
        <View style={[styles.card, shadow.soft]}>
          <AppText variant="cardTitle">Vaccine schedule</AppText>
          {schedule.map((item) => (
            <Pressable
              key={item.vaccine.id}
              style={styles.vaccineRow}
              onPress={() =>
                router.push({
                  pathname: '/(app)/apps/immunization-tracker/log',
                  params: { vaccineId: item.vaccine.id, profileId: profile!.id },
                })
              }
            >
              <View style={styles.vaccineCopy}>
                <AppText variant="body">
                  {item.vaccine.name} · {item.vaccine.doseLabel}
                </AppText>
                <AppText variant="caption" style={styles.muted}>
                  {item.status === 'completed' && item.record
                    ? `Given ${formatDisplayDate(item.record.administeredDate)}`
                    : `Due ${formatDisplayDate(item.recommendedDate)}`}
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
          ))}
        </View>
      ) : null}

      {hasProfile ? (
        <View style={styles.actions}>
          <Button
            label="Log vaccine"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/(app)/apps/immunization-tracker/log',
                params: { profileId: profile!.id },
              })
            }
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
    gap: spacing.md,
    padding: layoutSpacing.screenHorizontal,
  },
  content: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  hero: {
    backgroundColor: '#D1FAE5',
    borderRadius: radius.xxl,
    padding: layoutSpacing.cardPadding,
    gap: 4,
  },
  heroLabel: {
    color: '#059669',
  },
  heroTitle: {
    color: '#064E3B',
  },
  heroSubtitle: {
    color: '#047857',
  },
  childSwitcher: {
    gap: spacing.sm,
  },
  childRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  childChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: palette.background,
  },
  childChipSelected: {
    backgroundColor: '#D1FAE5',
    borderColor: '#059669',
  },
  childChipTextSelected: {
    color: '#059669',
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  nextDueCard: {
    borderColor: '#FCD34D',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: '#A7F3D0',
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: '#059669',
  },
  vaccineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  vaccineCopy: {
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
