import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PREGNANCY_WEEKS } from '@/mini-apps/pregnancy-tracker/constants';
import type { GestationalAge } from '@/mini-apps/pregnancy-tracker/utils';
import { fontFamily, palette, radius } from '@/theme';

const T2_START_WEEK = 14;
const T3_START_WEEK = 28;

const SEGMENTS = [
  { id: 1 as const, flex: T2_START_WEEK, from: 0, to: T2_START_WEEK - 1 },
  {
    id: 2 as const,
    flex: T3_START_WEEK - T2_START_WEEK,
    from: T2_START_WEEK,
    to: T3_START_WEEK - 1,
  },
  {
    id: 3 as const,
    flex: PREGNANCY_WEEKS - T3_START_WEEK,
    from: T3_START_WEEK,
    to: PREGNANCY_WEEKS,
  },
];

type Translate = (key: string, params?: Record<string, string | number>) => string;

type TrimesterProgressProps = {
  age: GestationalAge;
  accent: string;
  soft: string;
  t: Translate;
};

export function TrimesterProgress({ age, accent, soft, t }: TrimesterProgressProps) {
  const clamped = Math.max(0, Math.min(1, age.progress));
  const nowLeft = `${clamped * 100}%`;

  return (
    <View style={styles.wrap}>
      <AppText variant="body" style={styles.status}>
        {t('apps.pregnancy.ui.weekDay', { weeks: age.weeks, days: age.days })}
        {' · '}
        {t(`apps.pregnancy.trimester.${age.trimester}`)}
      </AppText>

      <View style={styles.barBlock}>
        <View style={[styles.track, { backgroundColor: soft }]}>
          <View style={[styles.fill, { width: nowLeft, backgroundColor: accent }]} />
          <View style={[styles.tick, { left: `${(T2_START_WEEK / PREGNANCY_WEEKS) * 100}%` }]} />
          <View style={[styles.tick, { left: `${(T3_START_WEEK / PREGNANCY_WEEKS) * 100}%` }]} />
        </View>
        <View
          accessibilityLabel={t('apps.pregnancy.ui.trimesterBar.now', { weeks: age.weeks })}
          style={[styles.nowDot, { left: nowLeft, backgroundColor: accent, borderColor: '#FFFFFF' }]}
        />
      </View>

      <View style={styles.segments}>
        {SEGMENTS.map((segment) => {
          const active = age.trimester === segment.id;
          return (
            <View key={segment.id} style={[styles.segment, { flex: segment.flex }]}>
              <AppText
                variant="caption"
                style={[styles.segmentTitle, active ? { color: accent, fontWeight: '700' } : null]}
              >
                {t(`apps.pregnancy.ui.trimesterBar.t${segment.id}`)}
              </AppText>
              <AppText variant="caption" style={styles.segmentRange}>
                {t('apps.pregnancy.ui.trimesterBar.weekRange', {
                  from: segment.from,
                  to: segment.to,
                })}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  status: {
    fontFamily: fontFamily.semiBold,
    fontWeight: '700',
  },
  barBlock: {
    height: 22,
    justifyContent: 'center',
  },
  track: {
    height: 10,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  tick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  nowDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginLeft: -8,
    top: 3,
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    gap: 1,
  },
  segmentTitle: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  segmentRange: {
    color: palette.textSecondary,
    fontSize: 10,
  },
});
