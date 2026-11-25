import { Image, StyleSheet, Text, View } from 'react-native';

import { images } from '@/constants/assets';
import { fontFamily, palette, radius } from '@/theme';

/** Logical size of the branded share canvas (captured at 3× for social). */
export const DAILY_INSIGHT_SHARE_WIDTH = 360;
export const DAILY_INSIGHT_SHARE_HEIGHT = 640;

export type DailyInsightShareCardProps = {
  tip: string;
  categoryName: string;
  emoji: string;
  label: string;
  footer: string;
};

/**
 * Fixed CareMate-branded share artwork for Daily insight (YouVersion-style card,
 * single template — no random photos).
 */
export function DailyInsightShareCard({
  tip,
  categoryName,
  emoji,
  label,
  footer,
}: DailyInsightShareCardProps) {
  return (
    <View
      collapsable={false}
      style={styles.root}
      // Capture targets must not collapse on Android.
    >
      <View style={styles.bgBlobTop} />
      <View style={styles.bgBlobBottom} />

      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Image source={images.icon} style={styles.logo} accessibilityIgnoresInvertColors />
        </View>
        <Text style={styles.brand}>CareMate</Text>
      </View>

      <Text style={styles.eyebrow}>{label}</Text>
      <Text style={styles.category}>
        {emoji} {categoryName}
      </Text>

      <View style={styles.quoteBlock}>
        <Text style={styles.tip}>{tip.trim()}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerRule} />
        <Text style={styles.footerText}>{footer}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: DAILY_INSIGHT_SHARE_WIDTH,
    height: DAILY_INSIGHT_SHARE_HEIGHT,
    backgroundColor: palette.primaryDark,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  bgBlobTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: palette.primary,
    opacity: 0.35,
    top: -80,
    right: -90,
  },
  bgBlobBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: palette.primaryLight,
    opacity: 0.12,
    bottom: -60,
    left: -70,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  /** White plate so the teal/blue mark stays visible on the branded teal canvas. */
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
  },
  brand: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  eyebrow: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  category: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    fontWeight: '600',
    color: palette.primaryLight,
    marginBottom: 20,
  },
  quoteBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  tip: {
    fontFamily: fontFamily.semiBold,
    fontSize: 26,
    fontWeight: '600',
    lineHeight: 36,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  footer: {
    gap: 14,
  },
  footerRule: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  footerText: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.15,
  },
});
