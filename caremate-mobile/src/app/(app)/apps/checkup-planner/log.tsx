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
  clampMonthRef,
  dateInPlanYear,
  defaultCompletedDate,
  isCompletionDayAllowed,
  monthFromDateKey,
  planYearMonthBounds,
} from '@/mini-apps/checkup-planner/log-date';
import {
  useCheckupPlannerHydrated,
  useCheckupPlannerStore,
} from '@/mini-apps/checkup-planner/store';
import { buildYearSchedule, formatDisplayDate, toDateKey } from '@/mini-apps/checkup-planner/utils';
import { localizeCadence, localizeCheckup } from '@/mini-apps/checkup-planner/localize';
import { assessCompletionDraft, type CheckupIssue } from '@/mini-apps/checkup-planner/validation';
import { layoutSpacing, palette, spacing } from '@/theme';

const theme = getMiniAppTheme('checkup-planner');

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
    return existing?.completedDate && dateInPlanYear(existing.completedDate, year)
      ? existing.completedDate
      : todayKey;
  }, [canLogForYear, existing, profile, todayKey, year]);

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
  } else if (canLogForYear && profile && completedDate && !dateInPlanYear(completedDate, year)) {
    // Heal stale/out-of-year selections so the CTA year always matches the completion date.
    const fixed = defaultCompletedDate(undefined, year, todayKey, profile.dateOfBirth);
    setCompletedDate(fixed);
    setMonthRef(monthFromDateKey(fixed, year, currentYear, today));
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
    isCompletionDayAllowed(dayKey, year, todayKey, profile.dateOfBirth);

  const { minMonth, maxMonth } = planYearMonthBounds(year, currentYear, today);
  const completedMatchesPlan = dateInPlanYear(completedDate, year);
  const completedYear = Number(completedDate.slice(0, 4));

  const issueMessage = (issue: CheckupIssue): string =>
    t(`apps.checkup.validation.${issue.messageKey}`, issue.params ?? {});

  const commitCompletion = async () => {
    if (!completedMatchesPlan) {
      void alert(
        t('apps.checkup.validation.checkTitle'),
        t('apps.checkup.validation.completedYearMismatch', {
          completedYear,
          planYear: year,
        }),
      );
      return;
    }

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
            minimumYear={year}
            maximumYear={Math.min(year, currentYear)}
            minimumMonth={minMonth}
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
          {!completedMatchesPlan ? (
            <AppText variant="caption" style={styles.mismatch}>
              {t('apps.checkup.validation.completedYearMismatch', {
                completedYear,
                planYear: year,
              })}
            </AppText>
          ) : null}
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
          onPress={() => {
            void commitCompletion();
          }}
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
  mismatch: {
    color: palette.danger,
    marginTop: spacing.xs,
  },
});
