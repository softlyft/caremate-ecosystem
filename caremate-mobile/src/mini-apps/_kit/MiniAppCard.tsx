import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/form-controls';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import { getMiniAppLabel, type MiniAppDefinition } from '@/mini-apps/_kit/registry';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

type MiniAppCardProps = {
  app: MiniAppDefinition;
  index: number;
  onLongPress?: () => void;
  isDragging?: boolean;
};

function lightenForGradient(_hex: string): string {
  // Soft top wash — keep registry pastel as the saturated end of the gradient.
  return '#FFFFFF';
}

export function MiniAppCard({ app, index, onLongPress, isDragging = false }: MiniAppCardProps) {
  const { t } = useTranslation();
  const isGuest = useIsGuest();
  const Icon = app.icon;
  const { name, description } = getMiniAppLabel(app.id, t);

  return (
    <AnimatedSection index={index + 1}>
      <Button
        disabled={!app.available && !onLongPress}
        style={[
          styles.shell,
          shadow.soft,
          !app.available ? styles.unavailable : null,
          isDragging ? styles.dragging : null,
        ]}
        onPress={() => {
          if (!app.available) {
            return;
          }
          if (isGuest) {
            router.push('/(auth)/login');
            return;
          }
          router.push(app.route);
        }}
        onLongPress={onLongPress}
        delayLongPress={280}
        accessibilityRole="button"
        accessibilityLabel={name}
        accessibilityHint={onLongPress ? t('apps.reorderHintA11y') : undefined}
        accessibilityState={{ disabled: !app.available }}
        variant="plain"
      >
        <LinearGradientFill
          colors={[
            { offset: '0%', color: app.backgroundColor },
            { offset: '55%', color: app.backgroundColor },
            { offset: '100%', color: lightenForGradient(app.backgroundColor) },
          ]}
          angle={125}
          style={styles.card}
        >
          <View style={styles.accentBlob} />
          <View style={[styles.accentBlobSm, { backgroundColor: app.color, opacity: 0.12 }]} />

          <View style={styles.topRow}>
            <View style={[styles.iconWrap, { borderColor: `${app.color}22` }]}>
              <View style={[styles.iconInner, { backgroundColor: `${app.color}18` }]}>
                <Icon color={app.color} size={26} strokeWidth={2.25} />
              </View>
            </View>

            {app.available ? (
              <View style={[styles.openPill, { backgroundColor: palette.background }]}>
                <AppText variant="caption" style={[styles.openLabel, { color: app.color }]}>
                  {t('common.open')}
                </AppText>
                <ChevronRight color={app.color} size={15} strokeWidth={2.5} />
              </View>
            ) : (
              <View style={styles.soonPill}>
                <AppText variant="comingSoon">{t('apps.comingSoon')}</AppText>
              </View>
            )}
          </View>

          <View style={styles.copy}>
            <AppText variant="quickActionTitle" style={styles.title}>
              {name}
            </AppText>
            <AppText variant="quickActionSubtitle" style={styles.description} numberOfLines={3}>
              {description}
            </AppText>
          </View>

          <View style={[styles.bottomBar, { backgroundColor: `${app.color}14` }]}>
            <View style={[styles.dot, { backgroundColor: app.color }]} />
            <AppText variant="caption" style={{ color: app.color }}>
              Health tool
            </AppText>
          </View>
        </LinearGradientFill>
      </Button>
    </AnimatedSection>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  dragging: {
    opacity: 0.92,
    transform: [{ scale: 1.02 }],
    borderColor: 'rgba(13, 148, 136, 0.35)',
  },
  unavailable: {
    opacity: 0.62,
  },
  card: {
    borderRadius: radius.xxl,
    padding: layoutSpacing.cardPadding,
    gap: spacing.md,
    minHeight: 168,
  },
  accentBlob: {
    position: 'absolute',
    top: -36,
    right: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  accentBlobSm: {
    position: 'absolute',
    bottom: 36,
    left: -28,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.xl,
    padding: 3,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  iconInner: {
    flex: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    ...shadow.soft,
  },
  openLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  soonPill: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  copy: {
    gap: 6,
    zIndex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.textSecondary,
  },
  bottomBar: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    zIndex: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
