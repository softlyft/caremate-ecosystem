import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { alert, confirm } from '@/components/ui/AppDialogHost';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import {
  MiniAppCard,
  MiniAppCta,
  MiniAppHero,
  MiniAppScreen,
  MonthCalendarGrid,
  MonthCalendarNavigator,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import {
  getNextMaternalTtDoseId,
  maternalTtSummary,
} from '@/mini-apps/pregnancy-tracker/maternal-tt';
import {
  usePregnancyTrackerHydrated,
  usePregnancyTrackerStore,
} from '@/mini-apps/pregnancy-tracker/store';
import {
  assessMaternalTtDraft,
  type PregnancyIssue,
} from '@/mini-apps/pregnancy-tracker/validation';
import { formatDueDate } from '@/mini-apps/pregnancy-tracker/utils';
import { toDateKey } from '@/mini-apps/_kit/date-utils';
import { palette, radius, spacing } from '@/theme';

const APP_ID = 'pregnancy-tracker' as const;

export default function PregnancyTtScreen() {
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [monthRef, setMonthRef] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);
  const hydrated = usePregnancyTrackerHydrated();

  const maternalTtDoses = usePregnancyTrackerStore((state) => state.maternalTtDoses);
  const logMaternalTtDose = usePregnancyTrackerStore((state) => state.logMaternalTtDose);

  const nextDoseId = getNextMaternalTtDoseId(maternalTtDoses);
  const summary = maternalTtSummary(maternalTtDoses);

  const issueMessage = (issue: PregnancyIssue): string =>
    t(`apps.pregnancy.motherCare.validation.${issue.messageKey}`, issue.params ?? {});

  const commitDose = async () => {
    if (!nextDoseId) {
      void alert(
        t('apps.pregnancy.motherCare.validation.checkTitle'),
        t('apps.pregnancy.motherCare.completeBody'),
      );
      return;
    }

    const assessment = assessMaternalTtDraft({
      doseId: nextDoseId,
      selectedDate,
      todayKey,
      existingDoses: maternalTtDoses,
    });

    if (assessment.hard) {
      void alert(
        t('apps.pregnancy.motherCare.validation.checkTitle'),
        issueMessage(assessment.hard),
      );
      return;
    }

    if (!assessment.payload) {
      void alert(
        t('apps.pregnancy.motherCare.validation.checkTitle'),
        t('apps.pregnancy.motherCare.validation.unusualCheck'),
      );
      return;
    }

    const save = () => {
      logMaternalTtDose(assessment.payload!.doseId, assessment.payload!.dateKey);
      router.back();
    };

    if (assessment.soft.length > 0) {
      const ok = await confirm({
        title: t('apps.pregnancy.motherCare.validation.confirmTitle'),
        message: assessment.soft.map(issueMessage).join('\n\n'),
        cancelLabel: t('apps.pregnancy.motherCare.validation.cancel'),
        confirmLabel: t('apps.pregnancy.motherCare.validation.saveAnyway'),
      });
      if (ok) {
        save();
      }
      return;
    }

    save();
  };

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  if (!nextDoseId) {
    return (
      <MiniAppScreen>
        <MiniAppHero
          appId={APP_ID}
          eyebrow={t('apps.pregnancy.motherCare.eyebrow')}
          title={t('apps.pregnancy.motherCare.completeTitle')}
          subtitle={t('apps.pregnancy.motherCare.completeBody')}
        />
        <MiniAppCta
          label={t('apps.pregnancy.motherCare.done')}
          accent={theme.color}
          soft={theme.backgroundColor}
          index={1}
          onPress={() => router.back()}
        />
      </MiniAppScreen>
    );
  }

  const doseLabel = t(`apps.pregnancy.motherCare.doses.${nextDoseId}`);

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={t('apps.pregnancy.motherCare.eyebrow')}
        title={t('apps.pregnancy.motherCare.logTitle', { dose: doseLabel })}
        subtitle={t('apps.pregnancy.motherCare.logSubtitle', {
          completed: summary.completed,
          total: summary.total,
        })}
      />

      <MiniAppCard index={1} eyebrow={t('apps.pregnancy.motherCare.pickDate')} theme={theme}>
        <MonthCalendarNavigator
          accentColor={theme.color}
          monthRef={monthRef}
          onMonthChange={setMonthRef}
        />

        <AppText variant="caption" style={styles.muted}>
          {t('apps.pregnancy.motherCare.tapDate', { dose: doseLabel })}
        </AppText>

        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          accentColor={theme.color}
          onDayPress={setSelectedDate}
          getDayState={(dayKey) => ({ selected: dayKey === selectedDate })}
        />
      </MiniAppCard>

      {selectedDate ? (
        <View style={[styles.preview, { backgroundColor: theme.backgroundColor }]}>
          <AppText variant="body" style={{ color: theme.titleColor }}>
            {t('apps.pregnancy.motherCare.selectedDate')}: {formatDueDate(selectedDate)}
          </AppText>
        </View>
      ) : null}

      <AppText variant="caption" style={styles.disclaimer}>
        {t('apps.pregnancy.motherCare.disclaimer')}
      </AppText>

      <MiniAppCta
        label={t('apps.pregnancy.motherCare.saveDose', { dose: doseLabel })}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={2}
        onPress={commitDose}
      />
    </MiniAppScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  muted: {
    color: palette.textSecondary,
  },
  disclaimer: {
    color: palette.textSecondary,
    textAlign: 'center',
  },
  preview: {
    borderRadius: radius.xl,
    padding: spacing.md,
  },
});
