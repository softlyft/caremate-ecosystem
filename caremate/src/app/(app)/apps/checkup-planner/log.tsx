import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, Input } from '@/components/ui/form-controls';
import { CHECKUP_CATALOG, getCadenceLabel } from '@/mini-apps/checkup-planner/constants';
import {
  useCheckupPlannerHydrated,
  useCheckupPlannerStore,
} from '@/mini-apps/checkup-planner/store';
import { formatDisplayDate, toDateKey } from '@/mini-apps/checkup-planner/utils';
import { MonthCalendarGrid } from '@/mini-apps/_kit/components/MonthCalendarGrid';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function CheckupPlannerLogScreen() {
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

  const monthLabel = monthRef.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loading}>
        <AppText variant="body">Set up your checkup profile first.</AppText>
        <Button
          label="Set up planner"
          onPress={() => router.replace('/(app)/apps/checkup-planner/setup')}
        />
      </View>
    );
  }

  if (!checkup) {
    return (
      <View style={styles.loading}>
        <AppText variant="body">That checkup was not found.</AppText>
        <Button label="Go back" onPress={() => router.back()} />
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
        Log that you completed this checkup for {year}. You can undo later from this screen.
      </AppText>

      <View style={styles.card}>
        <AppText variant="cardTitle">{checkup.name}</AppText>
        <AppText variant="caption" style={styles.muted}>
          {getCadenceLabel(checkup.cadence)} · {checkup.description}
        </AppText>
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
          Date completed
        </AppText>
        <MonthCalendarGrid
          monthRef={monthRef}
          interactive
          onDayPress={setCompletedDate}
          getDayState={(dayKey) => ({
            selected: dayKey === completedDate,
            today: dayKey === todayKey,
          })}
        />
        <AppText variant="body">Completed: {formatDisplayDate(completedDate)}</AppText>
      </View>

      <View style={styles.card}>
        <AppText variant="cardTitle">Notes (optional)</AppText>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="Clinic name, results to follow up…"
          multiline
        />
      </View>

      <Button
        label={existing ? 'Update log' : `Mark done for ${year}`}
        onPress={() => {
          markComplete({
            checkupId: checkup.id,
            year,
            completedDate,
            notes,
          });
          router.back();
        }}
      />

      {existing ? (
        <Button
          label="Remove completion"
          variant="secondary"
          onPress={() => {
            removeCompletion(checkup.id, year);
            router.back();
          }}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: layoutSpacing.screenHorizontal,
    backgroundColor: palette.background,
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
});
