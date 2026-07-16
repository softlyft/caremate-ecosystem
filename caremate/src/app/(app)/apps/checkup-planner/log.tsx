import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/form-controls';
import {
  MiniAppCard,
  MiniAppCta,
  MiniAppScreen,
  MonthCalendarGrid,
  getMiniAppTheme,
} from '@/mini-apps/_kit';
import { CHECKUP_CATALOG, getCadenceLabel } from '@/mini-apps/checkup-planner/constants';
import {
  useCheckupPlannerHydrated,
  useCheckupPlannerStore,
} from '@/mini-apps/checkup-planner/store';
import { formatDisplayDate, toDateKey } from '@/mini-apps/checkup-planner/utils';
import { layoutSpacing, palette, spacing } from '@/theme';

const theme = getMiniAppTheme('checkup-planner');

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
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loading}>
        <AppText variant="body">Set up your checkup profile first.</AppText>
        <MiniAppCta
          label="Set up planner"
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
        <AppText variant="body">That checkup was not found.</AppText>
        <MiniAppCta
          label="Go back"
          accent={theme.color}
          soft={theme.backgroundColor}
          onPress={() => router.back()}
        />
      </View>
    );
  }

  return (
    <MiniAppScreen>
      <AppText variant="subtitle" style={styles.intro}>
        Log that you completed this checkup for {year}. You can undo later from this screen.
      </AppText>

      <MiniAppCard index={1} title={checkup.name} theme={theme}>
        <AppText variant="caption" style={styles.muted}>
          {getCadenceLabel(checkup.cadence)} · {checkup.description}
        </AppText>
      </MiniAppCard>

      <MiniAppCard index={2} theme={theme}>
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
          accentColor={theme.color}
          onDayPress={setCompletedDate}
          getDayState={(dayKey) => ({
            selected: dayKey === completedDate,
            today: dayKey === todayKey,
          })}
        />
        <AppText variant="body">Completed: {formatDisplayDate(completedDate)}</AppText>
      </MiniAppCard>

      <MiniAppCard index={3} title="Notes (optional)" theme={theme}>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="Clinic name, results to follow up…"
          multiline
        />
      </MiniAppCard>

      <MiniAppCta
        label={existing ? 'Update log' : `Mark done for ${year}`}
        accent={theme.color}
        soft={theme.backgroundColor}
        index={4}
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
        <MiniAppCta
          label="Remove completion"
          accent={theme.color}
          soft={theme.backgroundColor}
          secondary
          index={5}
          onPress={() => {
            removeCompletion(checkup.id, year);
            router.back();
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
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muted: {
    color: palette.textSecondary,
  },
});
