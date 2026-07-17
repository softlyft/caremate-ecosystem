import { router } from 'expo-router';
import { LayoutGrid } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import { MiniAppCard } from '@/mini-apps/_kit/MiniAppCard';
import { MINI_APPS } from '@/mini-apps/_kit/registry';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function AppsTabScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = useIsGuest();
  const availableCount = MINI_APPS.filter((app) => app.available).length;

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        entering={FadeIn.duration(300)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
      >
        <AnimatedSection index={0}>
          <View style={styles.hero}>
            <View style={styles.meshTop} />
            <View style={styles.meshAccent} />

            <View style={styles.heroBadge}>
              <LayoutGrid color={palette.primary} size={16} strokeWidth={2.25} />
              <AppText variant="caption" color="brand" style={styles.heroBadgeLabel}>
                {t('apps.readyCount', { count: availableCount })}
              </AppText>
            </View>

            <AppText variant="screenTitle" style={styles.title}>
              {t('apps.title')}
            </AppText>
            <AppText variant="subtitle" style={styles.subtitle}>
              {t('apps.subtitle')}
            </AppText>
          </View>
        </AnimatedSection>

        {isGuest ? (
          <AnimatedSection index={1}>
            <View style={styles.guestBanner}>
              <AppText variant="cardTitle">{t('apps.signInRequiredTitle')}</AppText>
              <AppText variant="quickActionSubtitle" style={styles.guestBannerText}>
                {t('profile.premium.appsGuestBanner')}
              </AppText>
              <PressableScale style={styles.guestCta} onPress={() => router.push('/(auth)/login')}>
                <AppText variant="caption" style={styles.guestCtaLabel}>
                  {t('common.signIn')}
                </AppText>
              </PressableScale>
            </View>
          </AnimatedSection>
        ) : null}

        <View style={styles.grid}>
          {MINI_APPS.map((app, index) => (
            <MiniAppCard key={app.id} app={app} index={index} />
          ))}
        </View>
      </Animated.ScrollView>
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
    paddingBottom: 40,
    gap: layoutSpacing.sectionTitleToContent,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    gap: layoutSpacing.welcomeToSubtitle,
  },
  meshTop: {
    position: 'absolute',
    top: -70,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: palette.primaryLight,
    opacity: 0.55,
  },
  meshAccent: {
    position: 'absolute',
    top: 30,
    left: -60,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#E0F2FE',
    opacity: 0.5,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.background,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.14)',
    zIndex: 1,
  },
  heroBadgeLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontSize: 11,
  },
  title: {
    zIndex: 1,
    letterSpacing: -0.6,
  },
  subtitle: {
    zIndex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: palette.textSecondary,
    maxWidth: '95%',
  },
  grid: {
    gap: spacing.sm,
  },
  guestBanner: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.18)',
    backgroundColor: palette.primaryLight,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  guestBannerText: {
    color: palette.textSecondary,
  },
  guestCta: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primary,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  guestCtaLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
