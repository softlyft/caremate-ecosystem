import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { LoadingState } from '@/components/ui/screen-states';
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
import { spacing } from '@/theme';

const APP_ID = 'immunization-tracker' as const;

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
  const theme = getMiniAppTheme(APP_ID);
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
    return <LoadingState title="Loading children from your family…" />;
  }

  if (familySource.status === 'guest') {
    return (
      <MiniAppScreen>
        <MiniAppHero
          appId={APP_ID}
          eyebrow="Immunization"
          title="Sign in required"
          subtitle="Immunization tracking uses children from your CareMate family profile."
        />
        <MiniAppCta
          label="Sign in"
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => router.push('/(auth)/login')}
        />
      </MiniAppScreen>
    );
  }

  if (familySource.status === 'needs_family_setup' || familySource.status === 'needs_children') {
    const needsSetup = familySource.status === 'needs_family_setup';
    return (
      <MiniAppScreen>
        <MiniAppHero
          appId={APP_ID}
          eyebrow="Immunization"
          title={needsSetup ? 'Set up your family first' : 'Add children in Family'}
          subtitle={
            needsSetup
              ? 'Create your family profile and add kids with date of birth. Then their vaccine schedule will appear here.'
              : 'Your household has no children with a date of birth yet. Add kids in Family to start tracking vaccines.'
          }
        />
        <MiniAppCta
          label={needsSetup ? 'Set up family' : 'Open family'}
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => router.push(needsSetup ? '/(app)/family/setup' : '/(app)/family')}
        />
      </MiniAppScreen>
    );
  }

  const heroSubtitle = hasProfile
    ? summary.overdue > 0
      ? `${summary.overdue} vaccine${summary.overdue === 1 ? '' : 's'} overdue — schedule a visit`
      : summary.nextDue
        ? `Next: ${summary.nextDue.vaccine.name} (${summary.nextDue.vaccine.doseLabel})`
        : 'All scheduled vaccines are up to date'
    : 'Select a child to see their recommended vaccine schedule';

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={hasProfile ? profile!.name : 'Immunization'}
        title={
          hasProfile
            ? `${summary.completed} of ${summary.total} vaccines completed`
            : 'Track immunizations'
        }
        subtitle={heroSubtitle}
      />

      {profiles.length > 0 ? (
        <MiniAppCard index={1} title="Children" eyebrow="Family" theme={theme}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {profiles.map((item) => (
              <MiniAppChip
                key={item.id}
                label={item.name}
                selected={item.id === activeProfileId}
                accent={theme.color}
                soft={theme.backgroundColor}
                onPress={() => setActiveProfileId(item.id)}
              />
            ))}
          </ScrollView>
          <AppText variant="caption" style={styles.muted}>
            Children come from your Family profile.
          </AppText>
          <MiniAppCta
            label="Manage in Family"
            accent={theme.color}
            soft={theme.backgroundColor}
            secondary
            index={2}
            onPress={() => router.push('/(app)/family')}
          />
        </MiniAppCard>
      ) : null}

      {hasProfile && profile ? (
        <MiniAppCard index={3} title="Profile" eyebrow="Details" theme={theme}>
          <MiniAppRow
            title="Date of birth"
            subtitle={formatDisplayDate(profile.dateOfBirth)}
            soft={theme.backgroundColor}
          />
          <MiniAppRow
            title="Age"
            subtitle={getAgeLabel(profile.dateOfBirth, today)}
            soft={theme.backgroundColor}
          />
          <MiniAppProgress
            progress={summary.progress}
            accent={theme.color}
            label={`${Math.round(summary.progress * 100)}% complete`}
          />
        </MiniAppCard>
      ) : null}

      {hasProfile && summary.nextDue ? (
        <MiniAppCard
          index={4}
          title="Attention needed"
          eyebrow="Next up"
          theme={theme}
          style={styles.nextDueCard}
        >
          <AppText variant="body" style={styles.nextDueTitle}>
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
          <StatusPill
            label={getStatusLabel(summary.nextDue.status)}
            color={STATUS_COLORS[summary.nextDue.status]}
            background={STATUS_BACKGROUNDS[summary.nextDue.status]}
          />
          <MiniAppCta
            label="Log this vaccine"
            accent={theme.color}
            soft={theme.backgroundColor}
            index={5}
            onPress={() =>
              router.push({
                pathname: '/(app)/apps/immunization-tracker/log',
                params: { vaccineId: summary.nextDue!.vaccine.id, profileId: profile!.id },
              })
            }
          />
        </MiniAppCard>
      ) : null}

      {hasProfile ? (
        <MiniAppCard index={6} title="Vaccine schedule" eyebrow="Timeline" theme={theme}>
          {schedule.map((item) => (
            <MiniAppRow
              key={item.vaccine.id}
              title={`${item.vaccine.name} · ${item.vaccine.doseLabel}`}
              subtitle={
                item.status === 'completed' && item.record
                  ? `Given ${formatDisplayDate(item.record.administeredDate)}`
                  : `Due ${formatDisplayDate(item.recommendedDate)}`
              }
              soft={STATUS_BACKGROUNDS[item.status]}
              onPress={() =>
                router.push({
                  pathname: '/(app)/apps/immunization-tracker/log',
                  params: { vaccineId: item.vaccine.id, profileId: profile!.id },
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
          ))}
        </MiniAppCard>
      ) : null}

      {hasProfile ? (
        <MiniAppCta
          label="Log vaccine"
          accent={theme.color}
          soft={theme.backgroundColor}
          secondary
          index={7}
          onPress={() =>
            router.push({
              pathname: '/(app)/apps/immunization-tracker/log',
              params: { profileId: profile!.id },
            })
          }
        />
      ) : null}
    </MiniAppScreen>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  muted: {
    color: '#6B7280',
  },
  nextDueCard: {
    borderColor: '#FCD34D',
  },
  nextDueTitle: {
    fontWeight: '600',
  },
});
