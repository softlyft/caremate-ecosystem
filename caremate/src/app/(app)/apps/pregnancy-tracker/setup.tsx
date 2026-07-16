import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/form-controls';
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
        eyebrow="Setup"
        title="Set your timeline"
        subtitle="Choose how you want to set up your pregnancy timeline. You can use your last period or a due date from your provider."
      />

      <View style={styles.modeRow}>
        <MiniAppChip
          label="Last period"
          selected={mode === 'lmp'}
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => {
            setMode('lmp');
            setSelectedDate(null);
          }}
        />
        <MiniAppChip
          label="Due date"
          selected={mode === 'due-date'}
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => {
            setMode('due-date');
            setSelectedDate(null);
          }}
        />
      </View>

      <MiniAppCard index={1} title="Baby nickname" theme={theme}>
        <Input
          value={babyNickname}
          onChangeText={setBabyNickname}
          placeholder="Baby"
          autoCapitalize="words"
        />
      </MiniAppCard>

      <MiniAppCard index={2} eyebrow="Pick a date" theme={theme}>
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
          {mode === 'lmp'
            ? 'Tap the first day of your last menstrual period.'
            : 'Tap your estimated due date from your provider.'}
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
            {mode === 'lmp' ? 'Estimated due date' : 'Selected due date'}:{' '}
            {formatDueDate(previewDueDate)}
          </AppText>
        </View>
      ) : null}

      <View style={!selectedDate ? styles.ctaDisabled : undefined}>
        <MiniAppCta
          label="Save"
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
