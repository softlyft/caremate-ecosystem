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
  usePregnancyTrackerHydrated,
  usePregnancyTrackerStore,
} from '@/mini-apps/pregnancy-tracker/store';
import { formatDueDate } from '@/mini-apps/pregnancy-tracker/utils';
import {
  assessBirthDraft,
  type PregnancyIssue,
} from '@/mini-apps/pregnancy-tracker/validation';
import { toDateKey } from '@/mini-apps/_kit/date-utils';
import { palette, radius, spacing } from '@/theme';

const APP_ID = 'pregnancy-tracker' as const;

export default function PregnancyBirthScreen() {
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [monthRef, setMonthRef] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);
  const hydrated = usePregnancyTrackerHydrated();

  const status = usePregnancyTrackerStore((state) => state.status);
  const lastMenstrualPeriod = usePregnancyTrackerStore((state) => state.lastMenstrualPeriod);
  const recordBirth = usePregnancyTrackerStore((state) => state.recordBirth);

  const issueMessage = (issue: PregnancyIssue): string =>
    t(`apps.pregnancy.validation.${issue.messageKey}`, issue.params ?? {});

  const commitBirth = async () => {
    if (status !== 'active') {
      void alert(
        t('apps.pregnancy.validation.checkTitle'),
        t('apps.pregnancy.postnatal.notActive'),
      );
      return;
    }

    const assessment = assessBirthDraft({
      selectedDate,
      todayKey,
      lastMenstrualPeriod,
    });

    if (assessment.hard) {
      void alert(t('apps.pregnancy.validation.checkTitle'), issueMessage(assessment.hard));
      return;
    }

    if (!assessment.payload) {
      void alert(
        t('apps.pregnancy.validation.checkTitle'),
        t('apps.pregnancy.validation.unusualCheck'),
      );
      return;
    }

    const save = () => {
      recordBirth(assessment.payload!.birthDateKey);
      router.back();
    };

    if (assessment.soft.length > 0) {
      const ok = await confirm({
        title: t('apps.pregnancy.validation.confirmTitle'),
        message: assessment.soft.map(issueMessage).join('\n\n'),
        cancelLabel: t('apps.pregnancy.validation.cancel'),
        confirmLabel: t('apps.pregnancy.validation.saveAnyway'),
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

  return (
    <MiniAppScreen>
      <MiniAppHero
        appId={APP_ID}
        eyebrow={t('apps.pregnancy.postnatal.eyebrow')}
        title={t('apps.pregnancy.postnatal.birthTitle')}
        subtitle={t('apps.pregnancy.postnatal.birthSubtitle')}
      />

      <MiniAppCard index={1} eyebrow={t('apps.pregnancy.postnatal.pickBirthDate')} theme={theme}>
        <MonthCalendarNavigator
          accentColor={theme.color}
          monthRef={monthRef}
          onMonthChange={setMonthRef}
        />
        <AppText variant="caption" style={styles.muted}>
          {t('apps.pregnancy.postnatal.tapBirthDate')}
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
            {t('apps.pregnancy.postnatal.selectedBirthDate')}: {formatDueDate(selectedDate)}
          </AppText>
        </View>
      ) : null}

      <AppText variant="caption" style={styles.disclaimer}>
        {t('apps.pregnancy.postnatal.birthDisclaimer')}
      </AppText>

      <MiniAppCta
        label={t('apps.pregnancy.postnatal.startPostpartum')}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={2}
        onPress={commitBirth}
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
