import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import {
  MiniAppCard,
  MiniAppCta,
  MiniAppHero,
  MiniAppScreen,
  MonthCalendarGrid,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import { usePeriodTrackerHydrated, usePeriodTrackerStore } from '@/mini-apps/period-tracker/store';
import { pluralKey } from '@/mini-apps/_kit/i18n';
import { palette, spacing } from '@/theme';

const APP_ID = 'period-tracker' as const;

export default function LogPeriodScreen() {
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
  const today = useMemo(() => new Date(), []);
  const [monthRef, setMonthRef] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const hydrated = usePeriodTrackerHydrated();

  const loggedPeriodDays = usePeriodTrackerStore((state) => state.loggedPeriodDays);
  const togglePeriodDay = usePeriodTrackerStore((state) => state.togglePeriodDay);
  const setLoggedPeriodDays = usePeriodTrackerStore((state) => state.setLoggedPeriodDays);

  const monthLabel = monthRef.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

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
        eyebrow={t('apps.periodTracker.logPeriodDays')}
        title={t('apps.periodTracker.markPeriod')}
        subtitle={t('apps.periodTracker.markPeriodSubtitle')}
      />

      <MiniAppCard index={1} eyebrow={t('apps.period.ui.calendar')} theme={theme}>
        <View style={styles.monthHeader}>
          <Pressable
            hitSlop={12}
            onPress={() =>
              setMonthRef(new Date(monthRef.getFullYear(), monthRef.getMonth() - 1, 1))
            }
          >
            <ChevronLeft color={palette.textSecondary} size={20} />
          </Pressable>
          <AppText variant="cardTitle">{monthLabel}</AppText>
          <Pressable
            hitSlop={12}
            onPress={() =>
              setMonthRef(new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 1))
            }
          >
            <ChevronRight color={palette.textSecondary} size={20} />
          </Pressable>
        </View>

        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          accentColor={theme.color}
          predictedColor="#FBCFE8"
          predictedBorderColor="#F472B6"
          onDayPress={togglePeriodDay}
          getDayState={(dayKey) => ({ selected: loggedPeriodDays.includes(dayKey) })}
        />
      </MiniAppCard>

      <AppText variant="caption" style={styles.selectedCount}>
        {t(pluralKey('apps.period.ui.daysSelected', loggedPeriodDays.length), {
          count: loggedPeriodDays.length,
        })}
      </AppText>

      <MiniAppCta
        label={t('apps.save')}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={2}
        onPress={() => router.back()}
      />
      <MiniAppCta
        label={t('apps.clearSelection')}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={3}
        secondary
        onPress={() => setLoggedPeriodDays([])}
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
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCount: {
    color: palette.textSecondary,
    marginTop: -spacing.xs,
  },
});
