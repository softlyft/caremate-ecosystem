import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { TranslationParams } from '@/domains/localization/i18n/types';
import { HEALTH_TIMELINE_APP_IDS, HEALTH_TIMELINE_APP_ROUTES } from '@/domains/timeline/routes';
import type { HealthTimelineEvent, HealthTimelineKind } from '@/domains/timeline/types';
import { formatTimelineDayLabel, formatTimelineTime } from '@/features/timeline/format';
import { getMiniAppTheme } from '@/mini-apps/_kit/theme';
import { fontFamily, palette, radius, shadow, spacing } from '@/theme';

const RAIL_COLOR = '#C7D2FE';
const DAY_DOT = '#4338CA';

type Translate = (key: string, params?: TranslationParams) => string;

type HealthTimelineRailProps = {
  events: HealthTimelineEvent[];
  t: Translate;
  compact?: boolean;
  /** When true, rows are display-only (parent handles navigation). */
  inert?: boolean;
  onMonthLayout?: (monthKey: string, y: number) => void;
};

type RailRow =
  | { type: 'day'; day: string; isFirst: boolean }
  | { type: 'event'; event: HealthTimelineEvent; isLast: boolean };

function toRows(events: HealthTimelineEvent[], compact: boolean): RailRow[] {
  if (compact) {
    return events.map((event, index) => ({
      type: 'event',
      event,
      isLast: index === events.length - 1,
    }));
  }

  const rows: RailRow[] = [];
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const prev = events[index - 1];
    if (!prev || prev.occurredOn !== event.occurredOn) {
      rows.push({ type: 'day', day: event.occurredOn, isFirst: index === 0 });
    }
    rows.push({ type: 'event', event, isLast: index === events.length - 1 });
  }
  return rows;
}

function kindLabel(kind: HealthTimelineKind, t: Translate): string {
  return t(`home.timeline.kinds.${kind}`);
}

export function HealthTimelineRail({
  events,
  t,
  compact = false,
  inert = false,
  onMonthLayout,
}: HealthTimelineRailProps) {
  const rows = toRows(events, compact);
  const nodeSize = compact ? 26 : 34;
  const railWidth = compact ? 30 : 40;

  return (
    <View style={styles.rail}>
      {rows.map((row, index) => {
        if (row.type === 'day') {
          return (
            <View
              key={`day-${row.day}`}
              style={styles.row}
              onLayout={(event) => {
                onMonthLayout?.(row.day.slice(0, 7), event.nativeEvent.layout.y);
              }}
            >
              <View style={[styles.track, { width: railWidth }]}>
                {!row.isFirst ? <View style={styles.line} /> : <View style={styles.lineSpacer} />}
                <View style={styles.dayDot} />
                <View style={styles.line} />
              </View>
              <View style={styles.dayCopy}>
                <AppText variant="caption" style={styles.dayLabel}>
                  {formatTimelineDayLabel(row.day, {
                    today: t('home.timeline.today'),
                    yesterday: t('home.timeline.yesterday'),
                  })}
                </AppText>
              </View>
            </View>
          );
        }

        const theme = getMiniAppTheme(HEALTH_TIMELINE_APP_IDS[row.event.appKey]);
        const Icon = theme.icon;
        const time = formatTimelineTime(row.event.occurredAt);
        const isFirstPreview = compact && index === 0;
        const Card = (
          <View
            style={[
              compact ? styles.previewCard : styles.eventCard,
              !compact ? shadow.soft : null,
              { borderColor: `${theme.color}22` },
            ]}
          >
            {!compact ? (
              <View style={[styles.accentBar, { backgroundColor: theme.color }]} />
            ) : null}
            <View style={[styles.eventCopy, compact ? styles.previewCopy : null]}>
              <View style={styles.metaRow}>
                <AppText variant="caption" style={[styles.kind, { color: theme.color }]}>
                  {kindLabel(row.event.kind, t)}
                </AppText>
                {compact ? (
                  <AppText variant="caption" style={styles.metaMuted}>
                    {formatTimelineDayLabel(row.event.occurredOn, {
                      today: t('home.timeline.today'),
                      yesterday: t('home.timeline.yesterday'),
                    })}
                  </AppText>
                ) : time ? (
                  <AppText variant="caption" style={styles.metaMuted}>
                    {time}
                  </AppText>
                ) : null}
              </View>
              <AppText variant="body" style={styles.eventTitle} numberOfLines={compact ? 1 : 2}>
                {row.event.title}
              </AppText>
              {row.event.summary ? (
                <AppText
                  variant="caption"
                  style={styles.eventSummary}
                  numberOfLines={compact ? 1 : 3}
                >
                  {row.event.summary}
                </AppText>
              ) : null}
            </View>
          </View>
        );

        return (
          <View key={row.event.id} style={styles.row}>
            <View style={[styles.track, { width: railWidth }]}>
              {!isFirstPreview ? <View style={styles.line} /> : <View style={styles.lineSpacer} />}
              <View
                style={[
                  styles.node,
                  {
                    width: nodeSize,
                    height: nodeSize,
                    borderRadius: nodeSize / 2,
                    backgroundColor: theme.backgroundColor,
                    borderColor: theme.color,
                  },
                ]}
              >
                <Icon color={theme.color} size={compact ? 13 : 16} strokeWidth={2.4} />
              </View>
              {!row.isLast ? <View style={styles.line} /> : <View style={styles.lineSpacer} />}
            </View>
            {inert ? (
              <View style={styles.cardWrap}>{Card}</View>
            ) : (
              <Pressable
                style={styles.cardWrap}
                onPress={() => router.push(HEALTH_TIMELINE_APP_ROUTES[row.event.appKey])}
                accessibilityRole="button"
                accessibilityLabel={row.event.title}
              >
                {Card}
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

export function HealthTimelineEmptyRail({ message }: { message: string }) {
  return (
    <View style={styles.rail}>
      {[0, 1, 2].map((index) => (
        <View key={index} style={styles.row}>
          <View style={[styles.track, { width: 30 }]}>
            {index > 0 ? (
              <View style={[styles.line, styles.ghostLine]} />
            ) : (
              <View style={styles.lineSpacer} />
            )}
            <View style={styles.ghostDot} />
            {index < 2 ? (
              <View style={[styles.line, styles.ghostLine]} />
            ) : (
              <View style={styles.lineSpacer} />
            )}
          </View>
          {index === 1 ? (
            <View style={styles.emptyCopy}>
              <AppText variant="caption" style={styles.eventSummary}>
                {message}
              </AppText>
            </View>
          ) : (
            <View style={styles.ghostBar} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 36,
  },
  track: {
    alignItems: 'center',
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: RAIL_COLOR,
    minHeight: 8,
  },
  lineSpacer: {
    flex: 1,
    minHeight: 8,
  },
  ghostLine: {
    backgroundColor: '#E0E7FF',
  },
  dayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: DAY_DOT,
    borderWidth: 2,
    borderColor: '#EEF2FF',
  },
  ghostDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E0E7FF',
    borderWidth: 2,
    borderColor: '#F8FAFC',
  },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  dayCopy: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 10,
    paddingVertical: 6,
  },
  dayLabel: {
    fontFamily: fontFamily.semiBold,
    fontWeight: '700',
    color: DAY_DOT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
  },
  cardWrap: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: spacing.sm,
    paddingTop: 2,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: palette.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewCard: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  accentBar: {
    width: 4,
  },
  eventCopy: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  previewCopy: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kind: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  metaMuted: {
    color: palette.textSecondary,
    fontSize: 11,
  },
  eventTitle: {
    fontWeight: '700',
    fontSize: 15,
  },
  eventSummary: {
    color: palette.textSecondary,
    lineHeight: 18,
  },
  emptyCopy: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 10,
    paddingRight: 4,
  },
  ghostBar: {
    flex: 1,
    height: 14,
    marginLeft: 10,
    marginVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: '#EEF2FF',
  },
});
