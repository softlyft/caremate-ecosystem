import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Droplets,
  HeartPulse,
  Hospital,
  Phone,
  QrCode,
  ShieldPlus,
  UserRoundPen,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/form-controls';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { emergencyRepository } from '@/domains/emergency/repository';
import { useTranslation } from '@/domains/localization';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { fontFamily, layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

const ACCENT = palette.brandPurple;
const SOFT = palette.purpleLight;
const SOFT_END = '#F5F3FF';
const TITLE = palette.brandPurpleDark;

export default function EmergencyViewScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.emergencyProfile, userId],
    queryFn: () => emergencyRepository.findByUserId(userId),
  });

  if (query.isLoading) {
    return <LoadingState title={t('emergency.loading')} />;
  }

  if (query.isError && query.data === undefined) {
    return (
      <ErrorState
        title={t('emergency.loadFailed.title')}
        message={
          query.error instanceof Error ? query.error.message : t('emergency.loadFailed.message')
        }
        actionLabel={t('common.retry')}
        onAction={() => {
          void query.refetch();
        }}
      />
    );
  }

  const profile = query.data;
  if (!profile) {
    return (
      <Screen padded={false}>
        <EmptyState
          title={t('emergency.empty.title')}
          message={t('emergency.empty.message')}
          actionLabel={t('emergency.empty.cta')}
          onAction={() => router.push('/(app)/emergency/edit')}
        />
      </Screen>
    );
  }

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
                { offset: '55%', color: SOFT },
                { offset: '100%', color: SOFT_END },
              ]}
              angle={130}
              style={styles.hero}
            >
              <View style={styles.heroBlob} />
              <View style={[styles.heroBlobSm, { backgroundColor: ACCENT }]} />

              <View style={styles.heroIconRing}>
                <View style={styles.heroIconInner}>
                  <ShieldPlus color={ACCENT} size={28} strokeWidth={2.2} />
                </View>
              </View>

              <AppText variant="caption" style={styles.heroEyebrow}>
                {t('emergency.profileEyebrow')}
              </AppText>
              <AppText variant="screenTitle" style={styles.heroTitle}>
                {profile.fullName}
              </AppText>

              <View style={styles.heroMeta}>
                {profile.bloodGroup ? (
                  <View style={styles.metaPill}>
                    <Droplets color={ACCENT} size={13} />
                    <AppText variant="caption" style={styles.metaPillText}>
                      {profile.bloodGroup}
                    </AppText>
                  </View>
                ) : null}
                {profile.genotype ? (
                  <View style={styles.metaPill}>
                    <HeartPulse color={ACCENT} size={13} />
                    <AppText variant="caption" style={styles.metaPillText}>
                      {profile.genotype}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </LinearGradientFill>
          </View>
        </AnimatedSection>

        <AnimatedSection index={1}>
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="caption" style={styles.sectionEyebrow}>
              {t('emergency.healthDetails')}
            </AppText>
            <InfoRow label={t('emergency.fields.bloodGroup')} value={profile.bloodGroup} />
            <View style={styles.divider} />
            <InfoRow label={t('emergency.fields.genotype')} value={profile.genotype} />
            <View style={styles.divider} />
            <InfoRow
              label={t('emergency.fields.allergies')}
              value={profile.allergies.join(', ') || t('common.none')}
            />
            <View style={styles.divider} />
            <InfoRow
              label={t('emergency.fields.medications')}
              value={profile.currentMedications.join(', ') || t('common.none')}
            />
            <View style={styles.divider} />
            <InfoRow
              label={t('emergency.fields.conditions')}
              value={profile.chronicConditions.join(', ') || t('common.none')}
            />
            <View style={styles.divider} />
            <InfoRow
              label={t('emergency.fields.hospital')}
              value={profile.preferredHospital}
              icon={Hospital}
            />
            <View style={styles.divider} />
            <InfoRow label={t('emergency.fields.insurance')} value={profile.insuranceProvider} />
            <View style={styles.divider} />
            <InfoRow label={t('emergency.fields.notes')} value={profile.notes} />
          </View>
        </AnimatedSection>

        <AnimatedSection index={2}>
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="caption" style={styles.sectionEyebrow}>
              {t('emergency.fields.contacts')}
            </AppText>
            {profile.emergencyContacts.length === 0 ? (
              <AppText variant="caption" style={styles.muted}>
                {t('emergency.noContacts')}
              </AppText>
            ) : (
              profile.emergencyContacts.map((contact, index) => (
                <View key={`${contact.name}-${contact.phone}`}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.contactRow}>
                    <View style={styles.contactIcon}>
                      <Phone color={ACCENT} size={16} />
                    </View>
                    <View style={styles.contactCopy}>
                      <AppText variant="quickActionTitle">{contact.name}</AppText>
                      <AppText variant="caption" style={styles.muted}>
                        {contact.relationship}
                      </AppText>
                      <AppText variant="body" style={styles.contactPhone}>
                        {contact.phone}
                      </AppText>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </AnimatedSection>

        <AnimatedSection index={3}>
          <View style={styles.actions}>
            <Button
              style={[styles.primaryCta, shadow.soft]}
              onPress={() => router.push('/(app)/emergency/edit')}
              variant="plain"
            >
              <UserRoundPen color="#FFFFFF" size={18} strokeWidth={2.25} />
              <AppText variant="button" style={styles.primaryCtaLabel}>
                {t('emergency.editProfile')}
              </AppText>
            </Button>

            <Button
              style={styles.secondaryCta}
              onPress={() => router.push('/(app)/(tabs)/profile')}
              variant="plain"
            >
              <QrCode color={ACCENT} size={18} strokeWidth={2.25} />
              <AppText variant="button" style={styles.secondaryCtaLabel}>
                {t('emergency.showQr')}
              </AppText>
            </Button>
          </View>
        </AnimatedSection>
      </Animated.ScrollView>
    </Screen>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: typeof Hospital;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.infoRow}>
      {Icon ? (
        <View style={styles.contactIcon}>
          <Icon color={ACCENT} size={16} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText variant="caption" style={styles.infoLabel}>
          {label}
        </AppText>
        <AppText variant="body" style={styles.infoValue}>
          {value || t('common.notSet')}
        </AppText>
      </View>
    </View>
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
    minHeight: 168,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  heroBlob: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#DDD6FE',
    opacity: 0.7,
    top: -48,
    right: -36,
  },
  heroBlobSm: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    opacity: 0.12,
    bottom: 16,
    left: -12,
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
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: `${ACCENT}22`,
  },
  metaPillText: {
    color: ACCENT,
    fontFamily: fontFamily.semiBold,
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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
    marginVertical: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  infoLabel: {
    color: palette.textSecondary,
  },
  infoValue: {
    color: palette.text,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactCopy: {
    flex: 1,
    gap: 2,
  },
  contactPhone: {
    color: ACCENT,
    fontFamily: fontFamily.semiBold,
  },
  muted: {
    color: palette.textSecondary,
  },
  actions: {
    gap: spacing.sm,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: radius.xl,
    paddingVertical: 16,
  },
  primaryCtaLabel: {
    color: '#FFFFFF',
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: ACCENT,
    backgroundColor: SOFT,
    paddingVertical: 14,
  },
  secondaryCtaLabel: {
    color: ACCENT,
  },
});
