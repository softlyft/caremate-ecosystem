import { useQuery } from '@tanstack/react-query';
import { QrCode } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { EmptyState, LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { emergencyRepository } from '@/domains/emergency/repository';
import { useTranslation } from '@/domains/localization';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { fontFamily, layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

const ACCENT = palette.brandPurple;
const SOFT = palette.purpleLight;
const SOFT_END = '#F5F3FF';
const TITLE = palette.brandPurpleDark;

export default function EmergencyQrScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.emergencyProfile, userId],
    queryFn: () => emergencyRepository.findByUserId(userId),
  });

  if (query.isLoading) {
    return <LoadingState title={t('emergency.qr.loading')} />;
  }

  const profile = query.data;
  if (!profile) {
    return (
      <View style={styles.screen}>
        <EmptyState
          title={t('emergency.qr.emptyTitle')}
          message={t('emergency.qr.emptyMessage')}
        />
      </View>
    );
  }

  const payload = JSON.stringify({
    name: profile.fullName,
    bloodGroup: profile.bloodGroup,
    allergies: profile.allergies,
    medications: profile.currentMedications,
    contacts: profile.emergencyContacts,
  });

  return (
    <View style={styles.screen}>
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
                  <QrCode color={ACCENT} size={28} strokeWidth={2.2} />
                </View>
              </View>
              <AppText variant="caption" style={styles.heroEyebrow}>
                {t('emergency.qr.shareOffline')}
              </AppText>
              <AppText variant="screenTitle" style={styles.heroTitle}>
                {t('emergency.qr.title')}
              </AppText>
              <AppText variant="subtitle" style={styles.heroSubtitle}>
                {t('emergency.qr.subtitle')}
              </AppText>
            </LinearGradientFill>
          </View>
        </AnimatedSection>

        <AnimatedSection index={1}>
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="caption" style={styles.sectionEyebrow}>
              {t('emergency.qr.preview')}
            </AppText>
            <View style={styles.qrPlaceholder}>
              <QrCode color={ACCENT} size={64} strokeWidth={1.5} />
              <AppText variant="caption" style={styles.previewHint}>
                {t('emergency.qr.previewHint')}
              </AppText>
            </View>
          </View>
        </AnimatedSection>

        <AnimatedSection index={2}>
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="caption" style={styles.sectionEyebrow}>
              {t('emergency.qr.payload')}
            </AppText>
            <AppText variant="navLabel" selectable style={styles.payload}>
              {payload}
            </AppText>
          </View>
        </AnimatedSection>
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
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionEyebrow: {
    color: ACCENT,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  qrPlaceholder: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: `${ACCENT}33`,
    borderRadius: radius.xl,
    backgroundColor: SOFT_END,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  previewHint: {
    textAlign: 'center',
    color: palette.textSecondary,
  },
  payload: {
    color: palette.textSecondary,
    lineHeight: 20,
  },
});
