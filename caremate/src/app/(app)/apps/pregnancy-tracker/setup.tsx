import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/form-controls';
import { useTranslation } from '@/domains/localization';
import {
  MiniAppCard,
  MiniAppChip,
  MiniAppCta,
  MiniAppHero,
  MiniAppScreen,
  MonthCalendarGrid,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import {
  usePregnancyTrackerHydrated,
  usePregnancyTrackerStore,
} from '@/mini-apps/pregnancy-tracker/store';
import { calculateDueDateFromLmp, formatDueDate } from '@/mini-apps/pregnancy-tracker/utils';
import { palette, radius, spacing } from '@/theme';

type SetupMode = 'lmp' | 'due-date';

const APP_ID = 'pregnancy-tracker' as const;

export default function PregnancySetupScreen() {
  const { t } = useTranslation();
  const theme = getMiniAppTheme(APP_ID);
  const today = useMemo(() => new Date(), []);
  const [monthRef, setMonthRef] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [mode, setMode] = useState<SetupMode>('lmp');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const hydrated = usePregnancyTrackerHydrated();

  const babyNickname = usePregnancyTrackerStore((state) => state.babyNickname);
  const setBabyNickname = usePregnancyTrackerStore((state) => state.setBabyNickname);
  const setFromLastPeriod = usePregnancyTrackerStore((state) => state.setFromLastPeriod);
  const setFromDueDate = usePregnancyTrackerStore((state) => state.setFromDueDate);

  const monthLabel = monthRef.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const previewDueDate =
    mode === 'lmp' && selectedDate ? calculateDueDateFromLmp(selectedDate) : selectedDate;

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
        eyebrow={t('apps.pregnancy.ui.setupEyebrow')}
        title={t('apps.pregnancy.ui.setTimeline')}
        subtitle={t('apps.pregnancy.ui.setTimelineSubtitle')}
      />

      <View style={styles.modeRow}>
        <MiniAppChip
          label={t('apps.pregnancy.ui.lastPeriod')}
          selected={mode === 'lmp'}
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => {
            setMode('lmp');
            setSelectedDate(null);
          }}
        />
        <MiniAppChip
          label={t('apps.pregnancy.ui.dueDate')}
          selected={mode === 'due-date'}
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => {
            setMode('due-date');
            setSelectedDate(null);
          }}
        />
      </View>

      <MiniAppCard index={1} title={t('apps.pregnancy.ui.babyNickname')} theme={theme}>
        <Input
          value={babyNickname}
          onChangeText={setBabyNickname}
          placeholder={t('apps.pregnancy.ui.babyPlaceholder')}
          autoCapitalize="words"
        />
      </MiniAppCard>

      <MiniAppCard index={2} eyebrow={t('apps.pregnancy.ui.pickDate')} theme={theme}>
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

        <AppText variant="caption" style={styles.muted}>
          {mode === 'lmp' ? t('apps.pregnancy.ui.tapLmp') : t('apps.pregnancy.ui.tapDue')}
        </AppText>

        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          accentColor={theme.color}
          onDayPress={setSelectedDate}
          getDayState={(dayKey) => ({ selected: dayKey === selectedDate })}
        />
      </MiniAppCard>

      {previewDueDate ? (
        <View style={[styles.preview, { backgroundColor: theme.backgroundColor }]}>
          <AppText variant="body" style={{ color: theme.titleColor }}>
            {mode === 'lmp'
              ? t('apps.pregnancy.ui.estimatedDue')
              : t('apps.pregnancy.ui.selectedDue')}
            : {formatDueDate(previewDueDate)}
          </AppText>
        </View>
      ) : null}

      <View style={!selectedDate ? styles.ctaDisabled : undefined}>
        <MiniAppCta
          label={t('apps.pregnancyTracker.setupSave')}
          accent={theme.color}
          soft={theme.backgroundColor}
          index={3}
          onPress={() => {
            if (!selectedDate) {
              return;
            }
            if (mode === 'lmp') {
              setFromLastPeriod(selectedDate);
            } else {
              setFromDueDate(selectedDate);
            }
            router.back();
          }}
        />
      </View>
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
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muted: {
    color: palette.textSecondary,
  },
  preview: {
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
});
