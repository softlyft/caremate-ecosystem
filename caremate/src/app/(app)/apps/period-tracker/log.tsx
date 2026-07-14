import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { MonthCalendarGrid } from '@/mini-apps/_kit/components/MonthCalendarGrid';
import { usePeriodTrackerHydrated, usePeriodTrackerStore } from '@/mini-apps/period-tracker/store';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function LogPeriodScreen() {
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
        Tap the days you were on your period. You can select multiple days across the month.
      </AppText>

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

        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          onDayPress={togglePeriodDay}
          getDayState={(dayKey) => ({ selected: loggedPeriodDays.includes(dayKey) })}
        />
      </View>

      <AppText variant="caption">{loggedPeriodDays.length} day(s) selected</AppText>

      <View style={styles.actions}>
        <Button label="Save" onPress={() => router.back()} />
        <Button
          label="Clear selection"
          variant="secondary"
          onPress={() => setLoggedPeriodDays([])}
        />
      </View>
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
  actions: {
    gap: spacing.sm,
  },
});
