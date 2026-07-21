import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import type { MiniAppId } from '@/mini-apps/_kit/registry';
import { getMiniAppTheme, type MiniAppTheme } from '@/mini-apps/_kit/theme';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

export function MiniAppScreen({
  children,
  contentStyle,
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

type HeroProps = {
  appId: MiniAppId;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  index?: number;
  trailing?: ReactNode;
};

export function MiniAppHero({ appId, eyebrow, title, subtitle, index = 0, trailing }: HeroProps) {
  const theme = getMiniAppTheme(appId);
  const Icon = theme.icon;

  return (
    <AnimatedSection index={index}>
      <View style={[styles.heroShell, shadow.soft]}>
        <LinearGradientFill
          colors={[
            { offset: '0%', color: theme.backgroundColor },
            { offset: '55%', color: theme.backgroundColor },
            { offset: '100%', color: theme.softEnd },
          ]}
          angle={125}
          style={styles.hero}
        >
          <View style={styles.heroBlob} />
          <View style={[styles.heroBlobSm, { backgroundColor: theme.color, opacity: 0.12 }]} />

          <View style={styles.heroTop}>
            <View style={[styles.heroIconRing, { borderColor: `${theme.color}33` }]}>
              <View style={[styles.heroIconInner, { backgroundColor: `${theme.color}18` }]}>
                <Icon color={theme.color} size={24} strokeWidth={2.25} />
              </View>
            </View>
            {trailing}
          </View>

          {eyebrow ? (
            <AppText variant="caption" style={[styles.heroEyebrow, { color: theme.color }]}>
              {eyebrow}
            </AppText>
          ) : null}
          <AppText variant="screenTitle" style={[styles.heroTitle, { color: theme.titleColor }]}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText
              variant="subtitle"
              style={[styles.heroSubtitle, { color: theme.subtitleColor }]}
            >
              {subtitle}
            </AppText>
          ) : null}
        </LinearGradientFill>
      </View>
    </AnimatedSection>
  );
}

type CardProps = {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
  title?: string;
  eyebrow?: string;
  theme?: MiniAppTheme;
};

export function MiniAppCard({ children, index = 1, style, title, eyebrow, theme }: CardProps) {
  return (
    <AnimatedSection index={index}>
      <View style={[styles.card, shadow.soft, style]}>
        {title || eyebrow ? (
          <View style={styles.cardHeader}>
            {eyebrow ? (
              <AppText
                variant="caption"
                style={[styles.cardEyebrow, theme ? { color: theme.color } : null]}
              >
                {eyebrow}
              </AppText>
            ) : null}
            {title ? <AppText variant="cardTitle">{title}</AppText> : null}
          </View>
        ) : null}
        {children}
      </View>
    </AnimatedSection>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accent: string;
  soft: string;
  disabled?: boolean;
};

export function MiniAppChip({ label, selected, onPress, accent, soft, disabled }: ChipProps) {
  return (
    <PressableScale
      disabled={disabled || !onPress}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: soft, borderColor: accent }
          : { backgroundColor: palette.background, borderColor: palette.divider },
      ]}
    >
      <AppText
        variant="caption"
        style={{ color: selected ? accent : palette.text, fontWeight: selected ? '600' : '500' }}
      >
        {label}
      </AppText>
    </PressableScale>
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  accent?: string;
  soft?: string;
};

export function MiniAppRow({ title, subtitle, onPress, trailing, soft }: RowProps) {
  const body = (
    <View style={styles.row}>
      <View style={[styles.rowAccent, soft ? { backgroundColor: soft } : null]} />
      <View style={styles.rowCopy}>
        <AppText variant="body" style={styles.rowTitle}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" style={styles.rowSubtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <PressableScale onPress={onPress} style={styles.rowPressable}>
      {body}
    </PressableScale>
  );
}

export function MiniAppProgress({
  progress,
  accent,
  label,
}: {
  progress: number;
  accent: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.progressBlock}>
      {label ? (
        <AppText variant="caption" style={styles.progressLabel}>
          {label}
        </AppText>
      ) : null}
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${clamped * 100}%`, backgroundColor: accent }]}
        />
      </View>
    </View>
  );
}

export function MiniAppCta({
  label,
  onPress,
  accent,
  soft,
  index = 8,
  secondary,
}: {
  label: string;
  onPress: () => void;
  accent: string;
  soft: string;
  index?: number;
  secondary?: boolean;
}) {
  return (
    <AnimatedSection index={index}>
      <PressableScale
        onPress={onPress}
        style={[
          styles.cta,
          secondary
            ? { backgroundColor: soft, borderColor: accent, borderWidth: 1 }
            : { backgroundColor: accent },
          shadow.soft,
        ]}
      >
        <AppText
          variant="button"
          style={{ color: secondary ? accent : '#FFFFFF', textAlign: 'center' }}
        >
          {label}
        </AppText>
      </PressableScale>
    </AnimatedSection>
  );
}

export function StatusPill({
  label,
  color,
  background,
}: {
  label: string;
  color: string;
  background: string;
}) {
  return (
    <View style={[styles.statusPill, { backgroundColor: background }]}>
      <AppText variant="caption" style={{ color, fontWeight: '600', fontSize: 11 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: 40,
    gap: spacing.md,
  },
  heroShell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
  },
  hero: {
    borderRadius: radius.xxl,
    padding: layoutSpacing.cardPadding + 2,
    gap: 8,
    minHeight: 148,
  },
  heroBlob: {
    position: 'absolute',
    top: -36,
    right: -28,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  heroBlobSm: {
    position: 'absolute',
    bottom: 20,
    left: -34,
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  heroIconRing: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    padding: 3,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  heroIconInner: {
    flex: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '600',
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    zIndex: 1,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    zIndex: 1,
    maxWidth: '96%',
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  cardHeader: {
    gap: 2,
    marginBottom: 2,
  },
  cardEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontSize: 11,
    color: palette.primary,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  rowPressable: {
    borderRadius: radius.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  rowAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 4,
    backgroundColor: palette.surface,
    minHeight: 36,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: palette.textSecondary,
    lineHeight: 17,
  },
  progressBlock: {
    gap: 8,
  },
  progressLabel: {
    color: palette.textSecondary,
  },
  progressTrack: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  cta: {
    minHeight: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
});
