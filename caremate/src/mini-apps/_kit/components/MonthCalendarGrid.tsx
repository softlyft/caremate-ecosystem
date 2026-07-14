import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { getMonthMatrix, toDateKey } from '@/mini-apps/_kit/date-utils';
import { palette, radius } from '@/theme';

type DayState = {
  selected?: boolean;
  logged?: boolean;
  predicted?: boolean;
  today?: boolean;
};

type MonthCalendarGridProps = {
  monthRef: Date;
  onDayPress?: (dayKey: string) => void;
  getDayState?: (dayKey: string) => DayState;
  interactive?: boolean;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthCalendarGrid({
  monthRef,
  onDayPress,
  getDayState,
  interactive = false,
}: MonthCalendarGridProps) {
  const monthCells = getMonthMatrix(monthRef);
  const rows: (Date | null)[][] = [];

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
          {row.map((date, columnIndex) => {
            if (!date) {
              return <View key={`empty-${rowIndex}-${columnIndex}`} style={styles.dayCell} />;
            }

            const dayKey = toDateKey(date);
            const state = getDayState?.(dayKey) ?? {};
            const isSelected = state.selected ?? state.logged ?? false;

            const bubbleStyle = [
              styles.dayBubble,
              isSelected && styles.selectedDay,
              !isSelected && state.logged && styles.loggedDay,
              !isSelected && state.predicted && styles.predictedDay,
              state.today && styles.todayRing,
            ];

            const content = (
              <View style={bubbleStyle}>
                <AppText
                  variant="caption"
                  style={isSelected || state.logged ? styles.selectedDayText : undefined}
                >
                  {date.getDate()}
                </AppText>
              </View>
            );

            if (!interactive || !onDayPress) {
              return (
                <View key={dayKey} style={styles.dayCell}>
                  {content}
                </View>
              );
            }

            return (
              <Pressable
                key={dayKey}
                accessibilityRole="button"
                accessibilityLabel={`${date.toLocaleDateString()}, ${isSelected ? 'selected' : 'not selected'}`}
                hitSlop={6}
                style={({ pressed }) => [styles.dayCell, pressed && styles.dayCellPressed]}
                onPress={() => onDayPress(dayKey)}
              >
                {content}
              </Pressable>
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
  dayCellPressed: {
    opacity: 0.7,
  },
  dayBubble: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  selectedDay: {
    backgroundColor: '#DB2777',
  },
  loggedDay: {
    backgroundColor: '#DB2777',
  },
  predictedDay: {
    backgroundColor: '#FBCFE8',
    borderWidth: 1,
    borderColor: '#F472B6',
    borderStyle: 'dashed',
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  todayRing: {
    borderWidth: 2,
    borderColor: palette.primary,
  },
});
