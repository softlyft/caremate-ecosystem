import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { alert, confirm } from '@/components/ui/AppDialogHost';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/form-controls';
import { isCheckupItemUnlocked } from '@/domains/billing/entitlements';
import { useTranslation } from '@/domains/localization';
import { trackMiniAppUsed } from '@/lib/monitoring/product-analytics';
import { UpgradePrompt } from '@/features/premium/UpgradePrompt';
import { usePremiumTier } from '@/hooks/use-premium-state';
import {
  MiniAppCard,
  MiniAppCta,
  MiniAppScreen,
  MonthCalendarGrid,
  MonthCalendarNavigator,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import { CHECKUP_CATALOG } from '@/mini-apps/checkup-planner/constants';
import {
  useCheckupPlannerHydrated,
  useCheckupPlannerStore,
} from '@/mini-apps/checkup-planner/store';
import { buildYearSchedule, formatDisplayDate, toDateKey } from '@/mini-apps/checkup-planner/utils';
import { localizeCadence, localizeCheckup } from '@/mini-apps/checkup-planner/localize';
import { assessCompletionDraft, type CheckupIssue } from '@/mini-apps/checkup-planner/validation';
import { layoutSpacing, palette, spacing } from '@/theme';

const theme = getMiniAppTheme('checkup-planner');

function dateInPlanYear(dayKey: string, planYear: number): boolean {
  return Number(dayKey.slice(0, 4)) === planYear;
}

function defaultCompletedDate(
  existingDate: string | undefined,
  planYear: number,
  todayKey: string,
  dateOfBirth: string,
): string {
  if (existingDate && dateInPlanYear(existingDate, planYear)) {
    return existingDate;
  }
  if (dateInPlanYear(todayKey, planYear) && todayKey >= dateOfBirth) {
    return todayKey;
  }
  if (planYear < Number(todayKey.slice(0, 4))) {
    const endOfYear = `${planYear}-12-31`;
    return endOfYear >= dateOfBirth ? endOfYear : dateOfBirth;
  }
  // Future plan year: no selectable completion date yet.
  return `${planYear}-01-01`;
}

function clampMonthRef(candidate: Date, planYear: number, currentYear: number, today: Date): Date {
  const maxMonth = new Date(
    Math.min(planYear, currentYear),
    planYear < currentYear ? 11 : today.getMonth(),
    1,
  );
  const minMonth = new Date(planYear, 0, 1);
  if (candidate > maxMonth) return maxMonth;
  if (candidate < minMonth) return minMonth;
  return candidate;
}

function monthFromDateKey(
  dateKey: string,
  planYear: number,
  currentYear: number,
  today: Date,
): Date {
  const [y, m] = dateKey.split('-').map(Number);
  return clampMonthRef(new Date(y, (m || 1) - 1, 1), planYear, currentYear, today);
}

export default function CheckupPlannerLogScreen() {
  const { t } = useTranslation();
  const tier = usePremiumTier();
  const { checkupId: paramCheckupId, year: paramYear } = useLocalSearchParams<{
    checkupId?: string;
    year?: string;
  }>();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const currentYear = today.getFullYear();
  const hydrated = useCheckupPlannerHydrated();

  const profile = useCheckupPlannerStore((state) => state.profile);
  const completions = useCheckupPlannerStore((state) => state.completions) ?? [];
  const markComplete = useCheckupPlannerStore((state) => state.markComplete);
  const removeCompletion = useCheckupPlannerStore((state) => state.removeCompletion);

  const year =
    typeof paramYear === 'string' && Number.isFinite(Number(paramYear))
      ? Number(paramYear)
      : currentYear;

  const checkup =
    typeof paramCheckupId === 'string'
      ? CHECKUP_CATALOG.find((item) => item.id === paramCheckupId)
      : undefined;

  const existing = checkup
    ? completions.find((item) => item.checkupId === checkup.id && item.year === year)
    : undefined;

  const canLogForYear = year <= currentYear;

  const dateSeed = useMemo(() => {
    if (profile && canLogForYear) {
      return defaultCompletedDate(existing?.completedDate, year, todayKey, profile.dateOfBirth);
    }
    return existing?.completedDate ?? todayKey;
  }, [canLogForYear, existing?.completedDate, profile, todayKey, year]);

  const [dateSeedApplied, setDateSeedApplied] = useState(dateSeed);
  const [completedDate, setCompletedDate] = useState(dateSeed);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [monthRef, setMonthRef] = useState(() =>
    monthFromDateKey(dateSeed, year, currentYear, today),
  );

  // Reset local date/month when the plan year or saved completion changes (React "adjust state while rendering").
  if (dateSeed !== dateSeedApplied) {
    setDateSeedApplied(dateSeed);
    setCompletedDate(dateSeed);
    setMonthRef(monthFromDateKey(dateSeed, year, currentYear, today));
  }
  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loading}>
        <AppText variant="body">{t('apps.checkupPlanner.needSetup')}</AppText>
        <MiniAppCta
          label={t('apps.checkupPlanner.setUpPlanner')}
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => router.replace('/(app)/apps/checkup-planner/setup')}
        />
      </View>
    );
  }

  if (!checkup) {
    return (
      <View style={styles.loading}>
        <AppText variant="body">{t('apps.checkup.ui.notFound')}</AppText>
        <MiniAppCta
          label={t('common.goBack')}
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => router.back()}
        />
      </View>
    );
  }

  const scheduleItem = buildYearSchedule(profile, completions, year).find(
    (item) => item.checkup.id === checkup.id,
  );
  const itemUnlocked = isCheckupItemUnlocked(tier, {
    year,
    stableIndexInYear: scheduleItem?.stableIndexInYear ?? Number.MAX_SAFE_INTEGER,
    currentYear,
  });

  if (!itemUnlocked) {
    return (
      <MiniAppScreen>
        <UpgradePrompt
          title={t('profile.premium.checkupLockedTitle')}
          message={t('profile.premium.checkupLockedMessage')}
        />
        <MiniAppCta
          label={t('common.goBack')}
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => router.back()}
        />
      </MiniAppScreen>
    );
  }

  const localizedCheckup = localizeCheckup(checkup, t);
  const isDayAllowed = (dayKey: string) =>
    dateInPlanYear(dayKey, year) && dayKey <= todayKey && dayKey >= profile.dateOfBirth;

  const maxMonth = new Date(
    Math.min(year, currentYear),
    year < currentYear ? 11 : today.getMonth(),
    1,
  );
  const minYear = year;

  const issueMessage = (issue: CheckupIssue): string =>
    t(`apps.checkup.validation.${issue.messageKey}`, issue.params ?? {});

  const commitCompletion = async () => {
    const assessment = assessCompletionDraft({
      checkupId: checkup.id,
      year,
      completedDate,
      notes,
      profile,
      todayKey,
      currentYear,
      completions,
      checkup,
    });

    if (assessment.hard) {
      void alert(t('apps.checkup.validation.checkTitle'), issueMessage(assessment.hard));
      return;
    }

    if (!assessment.payload) {
      void alert(
        t('apps.checkup.validation.checkTitle'),
        t('apps.checkup.validation.unusualCheck'),
      );
      return;
    }

    const save = () => {
      markComplete(assessment.payload!);
      trackMiniAppUsed('checkup-planner', 'checkup_completed');
      router.back();
    };

    if (assessment.soft.length > 0) {
      const ok = await confirm({
        title: t('apps.checkup.validation.confirmTitle'),
        message: assessment.soft.map(issueMessage).join('\n\n'),
        cancelLabel: t('apps.checkup.validation.cancel'),
        confirmLabel: t('apps.checkup.validation.saveAnyway'),
      });
      if (ok) {
        save();
      }
      return;
    }

    save();
  };

  return (
    <MiniAppScreen>
      <AppText variant="subtitle" style={styles.intro}>
        {canLogForYear
          ? t('apps.checkup.ui.logIntro', { year })
          : t('apps.checkup.ui.futureYearLog', { year })}
      </AppText>

      <MiniAppCard index={1} title={localizedCheckup.name} theme={theme}>
        <AppText variant="caption" style={styles.muted}>
          {localizeCadence(checkup.cadence, t)} · {localizedCheckup.description}
        </AppText>
      </MiniAppCard>

      {canLogForYear ? (
        <MiniAppCard index={2} theme={theme}>
          <MonthCalendarNavigator
            accentColor={theme.color}
            monthRef={monthRef}
            onMonthChange={(next) => {
              setMonthRef(clampMonthRef(next, year, currentYear, today));
            }}
            minimumYear={minYear}
            maximumYear={Math.min(year, currentYear)}
            maximumMonth={maxMonth}
          />
          <AppText variant="caption" style={styles.muted}>
            {t('apps.checkup.ui.dateCompleted')}
          </AppText>
          <MonthCalendarGrid
            monthRef={monthRef}
            interactive
            accentColor={theme.color}
            onDayPress={(dayKey) => {
              if (!isDayAllowed(dayKey)) {
                return;
              }
              setCompletedDate(dayKey);
            }}
            getDayState={(dayKey) => ({
              selected: dayKey === completedDate,
              today: dayKey === todayKey,
              disabled: !isDayAllowed(dayKey),
            })}
          />
          <AppText variant="body">
            {t('apps.checkup.ui.completedLabel', { date: formatDisplayDate(completedDate) })}
          </AppText>
        </MiniAppCard>
      ) : null}

      {canLogForYear ? (
        <MiniAppCard index={3} title={t('apps.checkup.ui.notesOptional')} theme={theme}>
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder={t('apps.checkup.ui.notesPlaceholder')}
            multiline
          />
        </MiniAppCard>
      ) : null}

      {canLogForYear ? (
        <MiniAppCta
          label={
            existing ? t('apps.checkup.ui.updateLog') : t('apps.checkup.ui.markDone', { year })
          }
          accent={theme.color}
          soft={theme.backgroundColor}
          index={4}
          onPress={commitCompletion}
        />
      ) : (
        <MiniAppCta
          label={t('common.goBack')}
          accent={theme.color}
          soft={theme.backgroundColor}
          index={2}
          onPress={() => router.back()}
        />
      )}

      {existing && canLogForYear ? (
        <MiniAppCta
          label={t('apps.checkup.ui.removeCompletion')}
          accent={theme.color}
          soft={theme.backgroundColor}
          secondary
          index={5}
          onPress={async () => {
            const ok = await confirm({
              title: t('apps.checkup.validation.undoTitle'),
              message: t('apps.checkup.validation.undoMessage'),
              cancelLabel: t('apps.checkup.validation.cancel'),
              confirmLabel: t('apps.checkup.validation.undoConfirm'),
              confirmVariant: 'destructive',
            });
            if (ok) {
              removeCompletion(checkup.id, year);
              router.back();
            }
          }}
        />
      ) : null}
    </MiniAppScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: layoutSpacing.screenHorizontal,
    backgroundColor: palette.surface,
  },
  intro: {
    color: palette.textSecondary,
  },
  muted: {
    color: palette.textSecondary,
  },
});
