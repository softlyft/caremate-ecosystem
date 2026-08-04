import { Check, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { palette, radius, shadow, spacing } from '@/theme';

type MonthCalendarNavigatorProps = {
  monthRef: Date;
  onMonthChange: (month: Date) => void;
  accentColor?: string;
  minimumYear?: number;
  maximumYear?: number;
  /** Inclusive latest month the user may navigate to (day is ignored). */
  maximumMonth?: Date;
  subtitle?: string;
};

const MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Date(2024, month, 1).toLocaleDateString(undefined, { month: 'short' }),
);

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isMonthBefore(a: Date, b: Date): boolean {
  return (
    a.getFullYear() < b.getFullYear() ||
    (a.getFullYear() === b.getFullYear() && a.getMonth() < b.getMonth())
  );
}

function isMonthAfter(a: Date, b: Date): boolean {
  return isMonthBefore(b, a);
}

export function MonthCalendarNavigator({
  monthRef,
  onMonthChange,
  accentColor = palette.primary,
  minimumYear = new Date().getFullYear() - 100,
  maximumYear = new Date().getFullYear() + 20,
  maximumMonth,
  subtitle,
}: MonthCalendarNavigatorProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(monthRef.getFullYear());
  const yearListRef = useRef<FlatList<number>>(null);
  const maxMonthStart = useMemo(
    () => (maximumMonth ? startOfMonth(maximumMonth) : null),
    [maximumMonth],
  );
  const effectiveMaximumYear = maxMonthStart
    ? Math.min(maximumYear, maxMonthStart.getFullYear())
    : maximumYear;
  const years = useMemo(
    () =>
      Array.from(
        { length: Math.max(1, effectiveMaximumYear - minimumYear + 1) },
        (_, index) => minimumYear + index,
      ),
    [effectiveMaximumYear, minimumYear],
  );
  const today = new Date();
  const isCurrentMonth =
    monthRef.getFullYear() === today.getFullYear() && monthRef.getMonth() === today.getMonth();
  const canGoNext = !maxMonthStart || isMonthBefore(monthRef, maxMonthStart);
  const monthLabel = monthRef.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  // Gesture / 3-button nav bars vary by device; keep the bottom month row clear of them.
  const sheetBottomPadding = spacing.lg + Math.max(insets.bottom, spacing.sm);
  const sheetMaxHeight = Math.min(height * 0.72, 520) + Math.max(insets.bottom, 0);

  const changeMonthBy = (offset: number) => {
    if (offset > 0 && !canGoNext) {
      return;
    }
    const next = startOfMonth(new Date(monthRef.getFullYear(), monthRef.getMonth() + offset, 1));
    if (maxMonthStart && isMonthAfter(next, maxMonthStart)) {
      onMonthChange(maxMonthStart);
      return;
    }
    onMonthChange(next);
  };

  const openPicker = () => {
    setPickerYear(Math.min(monthRef.getFullYear(), effectiveMaximumYear));
    setPickerOpen(true);
    requestAnimationFrame(() => {
      yearListRef.current?.scrollToIndex({
        index: Math.max(0, Math.min(monthRef.getFullYear(), effectiveMaximumYear) - minimumYear),
        animated: false,
        viewPosition: 0.5,
      });
    });
  };

  const selectMonth = (month: number) => {
    const next = startOfMonth(new Date(pickerYear, month, 1));
    if (maxMonthStart && isMonthAfter(next, maxMonthStart)) {
      return;
    }
    onMonthChange(next);
    setPickerOpen(false);
  };

  return (
    <>
      <View style={styles.header}>
        <Button
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => changeMonthBy(-1)}
          style={styles.arrowButton}
          variant="plain"
        >
          <ChevronLeft color={palette.textSecondary} size={20} />
        </Button>

        <View style={styles.heading}>
          <Button
            accessibilityHint="Opens month and year picker"
            accessibilityLabel={`Choose month and year, currently ${monthLabel}`}
            accessibilityRole="button"
            onPress={openPicker}
            style={styles.monthButton}
            variant="plain"
          >
            <AppText variant="cardTitle">{monthLabel}</AppText>
            <ChevronDown color={palette.textSecondary} size={17} />
          </Button>
          {subtitle ? (
            <AppText variant="caption" style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>

        <Button
          accessibilityLabel="Next month"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canGoNext }}
          disabled={!canGoNext}
          hitSlop={12}
          onPress={() => changeMonthBy(1)}
          style={[styles.arrowButton, !canGoNext && styles.arrowButtonDisabled]}
          variant="plain"
        >
          <ChevronRight
            color={!canGoNext ? palette.divider : palette.textSecondary}
            size={20}
          />
        </Button>
      </View>

      {!isCurrentMonth ? (
        <Button
          accessibilityRole="button"
          onPress={() => onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1))}
          style={styles.todayButton}
          variant="plain"
        >
          <AppText variant="caption" color={accentColor}>
            Today
          </AppText>
        </Button>
      ) : null}

      <Modal
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
        presentationStyle="overFullScreen"
        transparent
        visible={pickerOpen}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close month picker"
            onPress={() => setPickerOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.sheet,
              {
                maxHeight: sheetMaxHeight,
                paddingBottom: sheetBottomPadding,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View>
                <AppText variant="cardTitle">Choose month and year</AppText>
                <AppText variant="caption" style={styles.sheetHint}>
                  Select a year, then a month
                </AppText>
              </View>
              <Button
                accessibilityLabel="Close"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setPickerOpen(false)}
                style={styles.closeButton}
                variant="plain"
              >
                <X color={palette.textSecondary} size={20} />
              </Button>
            </View>

            <View style={styles.pickerBody}>
              <FlatList
                ref={yearListRef}
                data={years}
                getItemLayout={(_, index) => ({ index, length: 48, offset: 48 * index })}
                keyExtractor={(year) => String(year)}
                onScrollToIndexFailed={({ index }) => {
                  yearListRef.current?.scrollToOffset({ offset: index * 48, animated: false });
                }}
                renderItem={({ item: year }) => {
                  const selected = year === pickerYear;
                  return (
                    <Button
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setPickerYear(year)}
                      style={[
                        styles.yearButton,
                        selected && { backgroundColor: `${accentColor}18` },
                      ]}
                      variant="plain"
                    >
                      <AppText
                        variant="categoryPill"
                        color={selected ? accentColor : palette.textSecondary}
                      >
                        {year}
                      </AppText>
                    </Button>
                  );
                }}
                showsVerticalScrollIndicator={false}
                style={styles.yearList}
              />

              <View style={styles.monthGrid}>
                {MONTHS.map((label, month) => {
                  const candidate = startOfMonth(new Date(pickerYear, month, 1));
                  const monthDisabled = Boolean(
                    maxMonthStart && isMonthAfter(candidate, maxMonthStart),
                  );
                  const selected =
                    pickerYear === monthRef.getFullYear() && month === monthRef.getMonth();
                  return (
                    <Button
                      accessibilityLabel={`${label} ${pickerYear}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: monthDisabled }}
                      disabled={monthDisabled}
                      key={label}
                      onPress={() => selectMonth(month)}
                      style={[
                        styles.monthOption,
                        selected && { backgroundColor: accentColor, borderColor: accentColor },
                        monthDisabled && styles.monthOptionDisabled,
                      ]}
                      variant="plain"
                    >
                      <AppText
                        variant="categoryPill"
                        color={
                          monthDisabled
                            ? palette.textSecondary
                            : selected
                              ? '#FFFFFF'
                              : palette.text
                        }
                      >
                        {label}
                      </AppText>
                      {selected ? <Check color="#FFFFFF" size={14} /> : null}
                    </Button>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  arrowButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: palette.surface,
  },
  arrowButtonDisabled: {
    opacity: 0.45,
  },
  heading: {
    flex: 1,
    alignItems: 'center',
  },
  monthButton: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  subtitle: {
    color: palette.textSecondary,
    textAlign: 'center',
  },
  todayButton: {
    alignSelf: 'center',
    minHeight: 32,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: palette.surface,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  sheet: {
    minHeight: 410,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: palette.background,
    ...shadow.card,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sheetHint: {
    marginTop: 2,
    color: palette.textSecondary,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: palette.surface,
  },
  pickerBody: {
    flex: 1,
    minHeight: 300,
    flexDirection: 'row',
    gap: spacing.md,
  },
  yearList: {
    width: 82,
    flexGrow: 0,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
  },
  yearButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  monthGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    gap: spacing.sm,
  },
  monthOption: {
    width: '30%',
    minWidth: 68,
    height: 56,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: palette.divider,
    borderRadius: radius.lg,
    backgroundColor: palette.background,
  },
  monthOptionDisabled: {
    opacity: 0.4,
    backgroundColor: palette.surface,
  },
});
