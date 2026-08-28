import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card } from '@/components/ui/form-controls';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/screen-states';
import { useFamilySetupStore } from '@/domains/family';
import { useTranslation } from '@/domains/localization';
import { fontFamily, layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

const ACCENT = palette.brandBlue;
const SOFT = palette.brandBlueLight;
const SOFT_END = '#EFF6FF';
const TITLE = palette.brandBlue;

export default function FamilySetupScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const setIsParent = useFamilySetupStore((s) => s.setIsParent);

  return (
    <Screen padded={false}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        <AnimatedSection index={0}>
          <View style={[styles.heroShell, shadow.card]}>
            <LinearGradientFill
              colors={[
                { offset: '0%', color: SOFT },
                { offset: '100%', color: SOFT_END },
              ]}
              angle={130}
              style={styles.hero}
            >
              <View style={styles.heroIconRing}>
                <View style={styles.heroIconInner}>
                  <Users color={ACCENT} size={28} strokeWidth={2.2} />
                </View>
              </View>
              <AppText variant="caption" style={styles.heroEyebrow}>
                {t('family.setup.eyebrow')}
              </AppText>
              <AppText variant="screenTitle" style={styles.heroTitle}>
                {t('family.setup.parentTitle')}
              </AppText>
              <AppText variant="subtitle" style={styles.heroSubtitle}>
                {t('family.setup.parentSubtitle')}
              </AppText>
            </LinearGradientFill>
          </View>
        </AnimatedSection>

        <AnimatedSection index={1}>
          <Card style={styles.card}>
            <Button
              style={[styles.primaryCta, shadow.soft]}
              onPress={() => {
                setIsParent(true);
                router.push('/(app)/family/kids-count');
              }}
              variant="plain"
            >
              <AppText variant="button" style={styles.primaryCtaLabel}>
                {t('family.setup.yesParent')}
              </AppText>
            </Button>
            <Button
              style={styles.secondaryCta}
              onPress={() => {
                setIsParent(false);
                router.replace('/(app)/family');
              }}
              variant="plain"
            >
              <AppText variant="button" style={styles.secondaryCtaLabel}>
                {t('family.setup.notRightNow')}
              </AppText>
            </Button>
          </Card>
        </AnimatedSection>
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  heroShell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  heroIconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: `${ACCENT}33`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  heroIconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${ACCENT}18`,
  },
  heroEyebrow: {
    color: ACCENT,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  heroTitle: {
    color: TITLE,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    color: palette.textSecondary,
  },
  card: {
    borderColor: 'rgba(15, 23, 42, 0.06)',
    gap: spacing.sm,
  },
  primaryCta: {
    backgroundColor: ACCENT,
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryCtaLabel: {
    color: '#FFFFFF',
  },
  secondaryCta: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: ACCENT,
    backgroundColor: SOFT,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryCtaLabel: {
    color: ACCENT,
  },
});
