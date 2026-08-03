import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/form-controls';
import { useTranslation } from '@/domains/localization';
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
import { formatDisplayDate, toDateKey } from '@/mini-apps/checkup-planner/utils';
import { localizeCadence, localizeCheckup } from '@/mini-apps/checkup-planner/localize';
import {
  assessCompletionDraft,
  type CheckupIssue,
} from '@/mini-apps/checkup-planner/validation';
import { layoutSpacing, palette, spacing } from '@/theme';

const theme = getMiniAppTheme('checkup-planner');

export default function CheckupPlannerLogScreen() {
  const { t } = useTranslation();
  const { checkupId: paramCheckupId, year: paramYear } = useLocalSearchParams<{
    checkupId?: string;
    year?: string;
  }>();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const currentYear = today.getFullYear();
  const hydrated = useCheckupPlannerHydrated();

  const profile = useCheckupPlannerStore((state) => state.profile);
  const completions = useCheckupPlannerStore((state) => state.completions);
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

  const [completedDate, setCompletedDate] = useState(existing?.completedDate ?? todayKey);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [monthRef, setMonthRef] = useState(() => {
    const base = existing?.completedDate ?? todayKey;
    const [y, m] = base.split('-').map(Number);
    return new Date(y, (m || 1) - 1, 1);
  });

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

  const localizedCheckup = localizeCheckup(checkup, t);

  const issueMessage = (issue: CheckupIssue): string =>
    t(`apps.checkup.validation.${issue.messageKey}`, issue.params ?? {});

  const commitCompletion = () => {
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
      Alert.alert(t('apps.checkup.validation.checkTitle'), issueMessage(assessment.hard));
      return;
    }

    if (!assessment.payload) {
      Alert.alert(
        t('apps.checkup.validation.checkTitle'),
        t('apps.checkup.validation.unusualCheck'),
      );
      return;
    }

    const save = () => {
      markComplete(assessment.payload!);
      router.back();
    };

    if (assessment.soft.length > 0) {
      Alert.alert(
        t('apps.checkup.validation.confirmTitle'),
        assessment.soft.map(issueMessage).join('\n\n'),
        [
          { text: t('apps.checkup.validation.cancel'), style: 'cancel' },
          { text: t('apps.checkup.validation.saveAnyway'), onPress: save },
        ],
      );
      return;
    }

    save();
  };

  return (
    <MiniAppScreen>
      <AppText variant="subtitle" style={styles.intro}>
        {t('apps.checkup.ui.logIntro', { year })}
      </AppText>

      <MiniAppCard index={1} title={localizedCheckup.name} theme={theme}>
        <AppText variant="caption" style={styles.muted}>
          {localizeCadence(checkup.cadence, t)} · {localizedCheckup.description}
        </AppText>
      </MiniAppCard>

      <MiniAppCard index={2} theme={theme}>
        <MonthCalendarNavigator
          accentColor={theme.color}
          monthRef={monthRef}
          onMonthChange={setMonthRef}
        />
        <AppText variant="caption" style={styles.muted}>
          {t('apps.checkup.ui.dateCompleted')}
        </AppText>
        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          accentColor={theme.color}
          onDayPress={setCompletedDate}
          getDayState={(dayKey) => ({
            selected: dayKey === completedDate,
            today: dayKey === todayKey,
          })}
        />
        <AppText variant="body">
          {t('apps.checkup.ui.completedLabel', { date: formatDisplayDate(completedDate) })}
        </AppText>
      </MiniAppCard>

      <MiniAppCard index={3} title={t('apps.checkup.ui.notesOptional')} theme={theme}>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder={t('apps.checkup.ui.notesPlaceholder')}
          multiline
        />
      </MiniAppCard>

      <MiniAppCta
        label={existing ? t('apps.checkup.ui.updateLog') : t('apps.checkup.ui.markDone', { year })}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={4}
        onPress={commitCompletion}
      />

      {existing ? (
        <MiniAppCta
          label={t('apps.checkup.ui.removeCompletion')}
          accent={theme.color}
          soft={theme.backgroundColor}
          secondary
          index={5}
          onPress={() => {
            Alert.alert(
              t('apps.checkup.validation.undoTitle'),
              t('apps.checkup.validation.undoMessage'),
              [
                { text: t('apps.checkup.validation.cancel'), style: 'cancel' },
                {
                  text: t('apps.checkup.validation.undoConfirm'),
                  style: 'destructive',
                  onPress: () => {
                    removeCompletion(checkup.id, year);
                    router.back();
                  },
                },
              ],
            );
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
