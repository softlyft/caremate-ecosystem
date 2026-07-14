import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, Input } from '@/components/ui/form-controls';
import { MonthCalendarGrid } from '@/mini-apps/_kit/components/MonthCalendarGrid';
import {
  usePregnancyTrackerHydrated,
  usePregnancyTrackerStore,
} from '@/mini-apps/pregnancy-tracker/store';
import { calculateDueDateFromLmp, formatDueDate } from '@/mini-apps/pregnancy-tracker/utils';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

type SetupMode = 'lmp' | 'due-date';

export default function PregnancySetupScreen() {
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
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <AppText variant="subtitle">
        Choose how you want to set up your pregnancy timeline. You can use your last period or a due
        date from your provider.
      </AppText>

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeChip, mode === 'lmp' && styles.modeChipActive]}
          onPress={() => {
            setMode('lmp');
            setSelectedDate(null);
          }}
        >
          <AppText variant="caption" style={mode === 'lmp' ? styles.modeChipTextActive : undefined}>
            Last period
          </AppText>
        </Pressable>
        <Pressable
          style={[styles.modeChip, mode === 'due-date' && styles.modeChipActive]}
          onPress={() => {
            setMode('due-date');
            setSelectedDate(null);
          }}
        >
          <AppText
            variant="caption"
            style={mode === 'due-date' ? styles.modeChipTextActive : undefined}
          >
            Due date
          </AppText>
        </Pressable>
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Baby nickname</AppText>
        <Input
          value={babyNickname}
          onChangeText={setBabyNickname}
          placeholder="Baby"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.card}>
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
          onDayPress={setSelectedDate}
          getDayState={(dayKey) => ({ selected: dayKey === selectedDate })}
        />
      </View>

      {previewDueDate ? (
        <View style={styles.preview}>
          <AppText variant="body">
            {mode === 'lmp' ? 'Estimated due date' : 'Selected due date'}:{' '}
            {formatDueDate(previewDueDate)}
          </AppText>
        </View>
      ) : null}

      <Button
        label="Save"
        disabled={!selectedDate}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  content: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeChip: {
    flex: 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: palette.surface,
  },
  modeChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  modeChipTextActive: {
    color: '#0284C7',
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
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
    backgroundColor: '#E0F2FE',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});
