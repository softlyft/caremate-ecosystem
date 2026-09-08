import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { addDays, getMonthMatrix, toDateKey } from '@/mini-apps/_kit/date-utils';
import { palette, radius } from '@/theme';

type DayState = {
  selected?: boolean;
  logged?: boolean;
  predicted?: boolean;
  fertile?: boolean;
  ovulation?: boolean;
  today?: boolean;
  /** Non-interactive day (e.g. future date for completed doses). */
  disabled?: boolean;
};

type MonthCalendarGridProps = {
  monthRef: Date;
  onDayPress?: (dayKey: string) => void;
  getDayState?: (dayKey: string) => DayState;
  interactive?: boolean;
  /** Selected / logged day fill */
  accentColor?: string;
  /** Soft predicted-day fill (defaults to a light tint of accent) */
  predictedColor?: string;
  predictedBorderColor?: string;
  fertileColor?: string;
  fertileBorderColor?: string;
  ovulationColor?: string;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_CROSS_MONTH_DAYS = 14;

function isMarkedDay(state: DayState): boolean {
  return Boolean(state.logged || state.predicted || state.selected);
}

function isInMonth(date: Date, monthRef: Date): boolean {
  return date.getFullYear() === monthRef.getFullYear() && date.getMonth() === monthRef.getMonth();
}

/** Keep a logged/predicted streak that runs past this month's last week on the grid. */
function withCrossMonthContinuation(
  cells: Date[],
  getDayState?: (dayKey: string) => DayState,
): Date[] {
  if (!getDayState || cells.length === 0) {
    return cells;
  }

  const extended = [...cells];
  let cursor = extended[extended.length - 1]!;
  let extra = 0;
  while (extra < MAX_CROSS_MONTH_DAYS) {
    const next = addDays(cursor, 1);
    if (!isMarkedDay(getDayState(toDateKey(next)))) {
      break;
    }
    extended.push(next);
    cursor = next;
    extra += 1;
  }

  while (extended.length % 7 !== 0) {
    const last = extended[extended.length - 1]!;
    extended.push(addDays(last, 1));
  }
  return extended;
}

export function MonthCalendarGrid({
  monthRef,
  onDayPress,
  getDayState,
  interactive = false,
  accentColor = '#DB2777',
  predictedColor = '#FBCFE8',
  predictedBorderColor = '#F472B6',
  fertileColor = '#DDD6FE',
  fertileBorderColor = '#8B5CF6',
  ovulationColor = '#7C3AED',
}: MonthCalendarGridProps) {
  const monthCells = withCrossMonthContinuation(getMonthMatrix(monthRef), getDayState);
  const rows: Date[][] = [];

  for (let index = 0; index < monthCells.length; index += 7) {
    rows.push(monthCells.slice(index, index + 7));
  }

  return (
    <View>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((label, index) => (
          <View key={`${label}-${index}`} style={styles.weekdayCell}>
            <AppText variant="caption" style={styles.weekday}>
              {label}
            </AppText>
          </View>
        ))}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((date) => {
            const dayKey = toDateKey(date);
            const outsideMonth = !isInMonth(date, monthRef);
            const state = getDayState?.(dayKey) ?? {};
            const isSelected = state.selected ?? state.logged ?? false;
            const isDisabled = Boolean(state.disabled);
            const isOvulation = Boolean(state.ovulation);
            const isFertile = Boolean(state.fertile);
            const marked = isMarkedDay(state) || isOvulation || isFertile;
            const strongFill = isSelected || Boolean(state.logged) || isOvulation;

            const bubbleStyle = [
              styles.dayBubble,
              isSelected && { backgroundColor: accentColor },
              !isSelected &&
                state.logged && {
                  backgroundColor: accentColor,
                },
              !isSelected &&
                !state.logged &&
                state.predicted && {
                  backgroundColor: predictedColor,
                  borderWidth: 2,
                  borderColor: predictedBorderColor,
                },
              !isSelected &&
                !state.logged &&
                !state.predicted &&
                isOvulation && {
                  backgroundColor: ovulationColor,
                },
              !isSelected &&
                !state.logged &&
                !state.predicted &&
                !isOvulation &&
                isFertile && {
                  backgroundColor: fertileColor,
                  borderWidth: 1,
                  borderColor: fertileBorderColor,
                },
              state.today && !isDisabled && styles.todayRing,
              isDisabled && styles.disabledBubble,
              outsideMonth && !marked && styles.outsideBubble,
            ];

            const content = (
              <View style={bubbleStyle}>
                <AppText
                  variant="caption"
                  style={[
                    strongFill ? styles.selectedDayText : undefined,
                    isDisabled ? styles.disabledDayText : undefined,
                    outsideMonth && !strongFill ? styles.outsideDayText : undefined,
                  ]}
                >
                  {date.getDate()}
                </AppText>
              </View>
            );

            if (!interactive || !onDayPress || isDisabled) {
              return (
                <View key={dayKey} style={styles.dayCell}>
                  {content}
                </View>
              );
            }

            return (
              <Button
                key={dayKey}
                accessibilityRole="button"
                accessibilityLabel={`${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}${outsideMonth ? ', outside this month' : ''}, ${isSelected ? 'selected' : 'not selected'}`}
                hitSlop={6}
                style={styles.dayCell}
                onPress={() => onDayPress(dayKey)}
                variant="plain"
              >
                {content}
              </Button>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekday: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayBubble: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  todayRing: {
    borderWidth: 2,
    borderColor: palette.primary,
  },
  disabledBubble: {
    backgroundColor: palette.surface,
    opacity: 0.55,
  },
  disabledDayText: {
    color: palette.textSecondary,
  },
  outsideBubble: {
    backgroundColor: 'transparent',
  },
  outsideDayText: {
    color: palette.textSecondary,
  },
});
