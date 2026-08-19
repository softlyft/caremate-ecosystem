import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { healthTimelineRepository } from '@/domains/timeline/repository';
import {
  HealthTimelineEmptyRail,
  HealthTimelineRail,
} from '@/features/timeline/HealthTimelineRail';
import { TimelineDatePicker } from '@/features/timeline/TimelineDatePicker';
import { defaultTimelineRange, monthsInRange } from '@/features/timeline/format';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

const ACCENT = '#4338CA';

export default function HealthTimelineScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const defaults = useMemo(() => defaultTimelineRange(), []);
  const [fromDate, setFromDate] = useState(defaults.fromDate);
  const [toDate, setToDate] = useState(defaults.toDate);
  const [activeMonth, setActiveMonth] = useState(() => toDate.slice(0, 7));
  const listRef = useRef<ScrollView>(null);
  const monthOffsets = useRef<Record<string, number>>({});

  const months = useMemo(() => monthsInRange(fromDate, toDate), [fromDate, toDate]);

  useEffect(() => {
    monthOffsets.current = {};
    const latest = months[months.length - 1]?.key;
    if (latest) {
      setActiveMonth(latest);
    }
  }, [fromDate, toDate, months]);

  const query = useQuery({
    queryKey: [...QUERY_KEYS.healthTimeline, 'list', userId, fromDate, toDate],
    queryFn: () =>
      healthTimelineRepository.listForUser(userId, {
        fromDate,
        toDate,
        limit: 2000,
      }),
    enabled: !isGuest && Boolean(userId),
  });

  function applyFromDate(next: string) {
    setFromDate(next);
    if (next > toDate) {
      setToDate(next);
    }
  }

  function applyToDate(next: string) {
    setToDate(next);
    if (next < fromDate) {
      setFromDate(next);
    }
  }

  function resetThreeMonths() {
    const range = defaultTimelineRange();
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  }

  function jumpToMonth(monthKey: string) {
    setActiveMonth(monthKey);
    const y = monthOffsets.current[monthKey];
    if (y == null) {
      return;
    }
    listRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  }

  if (isGuest) {
    return (
      <View style={styles.padded}>
        <HealthTimelineEmptyRail message={t('home.timeline.guestBody')} />
      </View>
    );
  }

  const isDefaultRange = (() => {
    const range = defaultTimelineRange();
    return fromDate === range.fromDate && toDate === range.toDate;
  })();
  const events = query.data ?? [];

  return (
    <View style={styles.screen}>
      <View style={styles.filters}>
        <View style={styles.dateRow}>
          <TimelineDatePicker
            label={t('home.timeline.rangeFrom')}
            value={fromDate}
            onChange={applyFromDate}
          />
          <TimelineDatePicker
            label={t('home.timeline.rangeTo')}
            value={toDate}
            onChange={applyToDate}
          />
        </View>
        {isDefaultRange ? null : (
          <Button
            label={t('home.timeline.lastThreeMonths')}
            onPress={resetThreeMonths}
            size="sm"
            variant="secondary"
            style={styles.reset}
          />
        )}
        {months.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.months}
          >
            {months.map((month) => {
              const selected = month.key === activeMonth;
              return (
                <Pressable
                  key={month.key}
                  onPress={() => jumpToMonth(month.key)}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.timeline.jumpToMonth', { month: month.label })}
                  style={[styles.monthChip, selected ? styles.monthChipSelected : null]}
                >
                  <AppText
                    variant="caption"
                    style={[styles.monthLabel, selected ? styles.monthLabelSelected : null]}
                  >
                    {month.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {query.isLoading ? (
        <LoadingState title={t('home.timeline.loading')} />
      ) : query.isError ? (
        <ErrorState
          title={t('home.timeline.loadFailedTitle')}
          message={
            query.error instanceof Error ? query.error.message : t('home.timeline.loadFailedMessage')
          }
          actionLabel={t('common.retry')}
          onAction={() => {
            void query.refetch();
          }}
        />
      ) : (
        <ScrollView
          ref={listRef}
          style={styles.list}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          {events.length === 0 ? (
            <HealthTimelineEmptyRail message={t('home.timeline.rangeEmpty')} />
          ) : (
            <HealthTimelineRail
              events={events}
              t={t}
              onMonthLayout={(monthKey, y) => {
                const current = monthOffsets.current[monthKey];
                if (current == null || y < current) {
                  monthOffsets.current[monthKey] = y;
                }
              }}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  filters: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
    backgroundColor: palette.surface,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reset: {
    alignSelf: 'flex-start',
  },
  months: {
    gap: 8,
    paddingRight: spacing.sm,
  },
  monthChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: 'rgba(67, 56, 202, 0.16)',
  },
  monthChipSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  monthLabel: {
    fontWeight: '700',
    color: ACCENT,
  },
  monthLabelSelected: {
    color: palette.background,
  },
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  padded: {
    flex: 1,
    padding: layoutSpacing.screenHorizontal,
    justifyContent: 'center',
  },
});
