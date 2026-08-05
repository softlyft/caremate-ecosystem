import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { LoadingState } from '@/components/ui/screen-states';
import { isImmunizationScheduleItemUnlocked } from '@/domains/billing/entitlements';
import { useTranslation } from '@/domains/localization';
import { PremiumLockedOverlay } from '@/features/premium/PremiumLockedOverlay';
import { UpgradePrompt } from '@/features/premium/UpgradePrompt';
import { useFamilyImmunizationChildren } from '@/mini-apps/immunization-tracker/use-family-children';
import {
  useActiveImmunizationProfile,
  useActiveImmunizationRecords,
} from '@/mini-apps/immunization-tracker/selectors';
import { useImmunizationTrackerStore } from '@/mini-apps/immunization-tracker/store';
import {
  buildSchedule,
  formatDisplayDate,
  getAgeLabel,
  getScheduleSummary,
  VaccineStatus,
} from '@/mini-apps/immunization-tracker/utils';
import { localizeVaccine, localizeVaccineStatus } from '@/mini-apps/immunization-tracker/localize';
import { pluralKey } from '@/mini-apps/_kit/i18n';
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
import { usePremiumTier } from '@/hooks/use-premium-state';
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
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
  const today = useMemo(() => new Date(), []);
  const tier = usePremiumTier();
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
    return <LoadingState title={t('apps.immunizationTracker.loading')} />;
  }

  if (familySource.status === 'guest') {
    return (
      <MiniAppScreen>
        <MiniAppHero
          appId={APP_ID}
          eyebrow={t('apps.immunizationTracker.eyebrow')}
          title={t('apps.signInRequiredTitle')}
          subtitle={t('apps.immunizationTracker.signInSubtitle')}
        />
        <MiniAppCta
          label={t('common.signIn')}
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
          eyebrow={t('apps.immunizationTracker.eyebrow')}
          title={needsSetup ? t('apps.setUpFamilyFirst') : t('apps.addChildren')}
          subtitle={
            needsSetup
              ? t('apps.immunizationTracker.needsFamilySubtitle')
              : t('apps.immunizationTracker.needsChildrenSubtitle')
          }
        />
        <MiniAppCta
          label={needsSetup ? t('apps.setUpFamily') : t('apps.openFamily')}
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => router.push(needsSetup ? '/(app)/family/setup' : '/(app)/family')}
        />
      </MiniAppScreen>
    );
  }

  const heroSubtitle = hasProfile
    ? summary.overdue > 0
      ? t(pluralKey('apps.immunization.ui.overdueVisit', summary.overdue), {
          count: summary.overdue,
        })
      : summary.nextDue
        ? t('apps.immunization.ui.nextDue', {
            name: localizeVaccine(summary.nextDue.vaccine, t).name,
            dose: localizeVaccine(summary.nextDue.vaccine, t).doseLabel,
          })
        : t('apps.immunization.ui.allUpToDate')
    : t('apps.immunization.ui.selectChild');

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={hasProfile ? profile!.name : t('apps.immunizationTracker.eyebrow')}
        title={
          hasProfile
            ? t('apps.immunization.ui.vaccinesCompleted', {
                completed: summary.completed,
                total: summary.total,
              })
            : t('apps.immunizationTracker.emptyTitle')
        }
        subtitle={heroSubtitle}
      />

      {profiles.length > 0 ? (
        <MiniAppCard
          index={1}
          title={t('apps.immunization.ui.children')}
          eyebrow={t('apps.immunization.ui.family')}
          theme={theme}
        >
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
            {t('apps.immunization.ui.childrenFromFamilyCaption')}
          </AppText>
          <MiniAppCta
            label={t('apps.manageInFamily')}
            accent={theme.color}
            soft={theme.backgroundColor}
            secondary
            index={2}
            onPress={() => router.push('/(app)/family')}
          />
        </MiniAppCard>
      ) : null}

      {hasProfile && profile ? (
        <MiniAppCard
          index={3}
          title={t('apps.immunization.ui.profile')}
          eyebrow={t('apps.immunization.ui.details')}
          theme={theme}
        >
          <MiniAppRow
            title={t('apps.immunization.ui.dob')}
            subtitle={formatDisplayDate(profile.dateOfBirth)}
            soft={theme.backgroundColor}
          />
          <MiniAppRow
            title={t('apps.immunization.ui.age')}
            subtitle={getAgeLabel(profile.dateOfBirth, today)}
            soft={theme.backgroundColor}
          />
          <MiniAppProgress
            progress={summary.progress}
            accent={theme.color}
            label={t('apps.immunization.ui.percentComplete', {
              percent: Math.round(summary.progress * 100),
            })}
          />
        </MiniAppCard>
      ) : null}

      {hasProfile && summary.nextDue ? (
        <MiniAppCard
          index={4}
          title={t('apps.immunization.ui.attention')}
          eyebrow={t('apps.immunization.ui.nextUp')}
          theme={theme}
          style={styles.nextDueCard}
        >
          <AppText variant="body" style={styles.nextDueTitle}>
            {localizeVaccine(summary.nextDue.vaccine, t).name} ·{' '}
            {localizeVaccine(summary.nextDue.vaccine, t).doseLabel}
          </AppText>
          <AppText variant="caption" style={styles.muted}>
            {t('apps.immunization.ui.recommendedBy', {
              date: formatDisplayDate(summary.nextDue.recommendedDate),
            })}
            {summary.nextDue.status === 'overdue'
              ? ` · ${t(
                  pluralKey(
                    'apps.immunization.ui.daysOverdue',
                    Math.abs(summary.nextDue.daysUntilDue),
                  ),
                  { count: Math.abs(summary.nextDue.daysUntilDue) },
                )}`
              : summary.nextDue.daysUntilDue === 0
                ? ` · ${t('apps.immunization.ui.dueToday')}`
                : ` · ${t(
                    pluralKey('apps.immunization.ui.dueInDays', summary.nextDue.daysUntilDue),
                    { count: summary.nextDue.daysUntilDue },
                  )}`}
          </AppText>
          <StatusPill
            label={localizeVaccineStatus(summary.nextDue.status, t)}
            color={STATUS_COLORS[summary.nextDue.status]}
            background={STATUS_BACKGROUNDS[summary.nextDue.status]}
          />
          {isImmunizationScheduleItemUnlocked(tier, summary.nextDue.vaccine.recommendedAgeWeeks) ? (
            <MiniAppCta
              label={t('apps.immunizationTracker.logVaccine')}
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
          ) : (
            <UpgradePrompt
              title={t('profile.premium.immunizationLockedTitle')}
              message={t('profile.premium.immunizationLockedMessage')}
              compact
            />
          )}
        </MiniAppCard>
      ) : null}

      {hasProfile ? (
        <MiniAppCard
          index={6}
          title={t('apps.immunization.ui.scheduleTitle')}
          eyebrow={t('apps.immunization.ui.timeline')}
          theme={theme}
        >
          {schedule.map((item) => {
            const unlocked = isImmunizationScheduleItemUnlocked(
              tier,
              item.vaccine.recommendedAgeWeeks,
            );
            const row = (
              <MiniAppRow
                title={`${localizeVaccine(item.vaccine, t).name} · ${localizeVaccine(item.vaccine, t).doseLabel}`}
                subtitle={
                  item.status === 'completed' && item.record
                    ? t('apps.immunization.ui.givenOn', {
                        date: formatDisplayDate(item.record.administeredDate),
                      })
                    : t('apps.immunization.ui.dueOn', {
                        date: formatDisplayDate(item.recommendedDate),
                      })
                }
                soft={STATUS_BACKGROUNDS[item.status]}
                onPress={
                  unlocked
                    ? () =>
                        router.push({
                          pathname: '/(app)/apps/immunization-tracker/log',
                          params: { vaccineId: item.vaccine.id, profileId: profile!.id },
                        })
                    : undefined
                }
                trailing={
                  <StatusPill
                    label={localizeVaccineStatus(item.status, t)}
                    color={STATUS_COLORS[item.status]}
                    background={STATUS_BACKGROUNDS[item.status]}
                  />
                }
              />
            );

            return (
              <PremiumLockedOverlay
                key={item.vaccine.id}
                locked={!unlocked}
                title={t('profile.premium.immunizationLockedTitle')}
                message={t('profile.premium.immunizationLockedMessage')}
              >
                {row}
              </PremiumLockedOverlay>
            );
          })}
        </MiniAppCard>
      ) : null}

      {hasProfile ? (
        <MiniAppCta
          label={t('apps.immunizationTracker.logVaccine')}
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
