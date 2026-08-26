import { useQuery } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Phone, ShieldAlert } from 'lucide-react-native';
import { useEffect } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/form-controls';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { LoadingState } from '@/components/ui/screen-states';
import {
  fetchEmergencyByShareToken,
  isEmergencyShareAccessError,
  isValidEmergencyShareToken,
  stashPendingEmergencyShareToken,
} from '@/domains/emergency/share';
import { useTranslation } from '@/domains/localization';
import { useAuthStore } from '@/features/auth/store';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { fontFamily, layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

function resolveTokenParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return isValidEmergencyShareToken(raw) ? raw!.toLowerCase() : null;
}

/**
 * Deep-link target: caremate://emergency/share/<token>
 * Requires a signed-in (non-guest) health practitioner to view another user's
 * emergency card. Care Portal provider staff and SoftLyft staff also qualify.
 */
export default function EmergencyShareScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = resolveTokenParam(params.token);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isGuest = useIsGuest();
  const needsAccount = !isAuthenticated || isGuest;

  useEffect(() => {
    if (token && needsAccount && isInitialized) {
      void stashPendingEmergencyShareToken(token);
    }
  }, [token, needsAccount, isInitialized]);

  const query = useQuery({
    queryKey: ['emergency-share', token],
    queryFn: () => fetchEmergencyByShareToken(token!),
    enabled: Boolean(token) && isInitialized && !needsAccount,
    retry: false,
  });

  if (!isInitialized) {
    return <LoadingState title={t('emergency.share.loading')} />;
  }

  if (!token) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <AppText variant="cardTitle">{t('emergency.share.invalidTitle')}</AppText>
        <AppText variant="subtitle" style={styles.muted}>
          {t('emergency.share.invalidMessage')}
        </AppText>
        <Button style={styles.cta} onPress={() => router.replace('/(app)/(tabs)')} variant="plain">
          <AppText variant="button" style={styles.ctaLabel}>
            {t('common.goBack')}
          </AppText>
        </Button>
      </View>
    );
  }

  if (needsAccount) {
    return <Redirect href="/(auth)/login" />;
  }

  if (query.isLoading) {
    return <LoadingState title={t('emergency.share.loading')} />;
  }

  if (query.isError) {
    const practitionerBlocked = isEmergencyShareAccessError(query.error)
      ? query.error.code === 'practitioner_required'
      : /health practitioner/i.test(
          query.error instanceof Error ? query.error.message : '',
        );

    return (
      <View style={[styles.screen, styles.centered]}>
        <AppText variant="cardTitle">
          {practitionerBlocked
            ? t('emergency.share.practitionerRequiredTitle')
            : t('emergency.share.errorTitle')}
        </AppText>
        <AppText variant="subtitle" style={styles.muted}>
          {practitionerBlocked
            ? t('emergency.share.practitionerRequiredMessage')
            : query.error instanceof Error
              ? query.error.message
              : t('emergency.share.errorMessage')}
        </AppText>
        {practitionerBlocked ? (
          <Button
            style={styles.cta}
            onPress={() => router.replace('/(app)/profile/edit')}
            variant="plain"
          >
            <AppText variant="button" style={styles.ctaLabel}>
              {t('emergency.share.openPractitionerSetting')}
            </AppText>
          </Button>
        ) : (
          <Button style={styles.cta} onPress={() => void query.refetch()} variant="plain">
            <AppText variant="button" style={styles.ctaLabel}>
              {t('common.retry')}
            </AppText>
          </Button>
        )}
        <Button
          style={styles.secondaryCta}
          onPress={() => router.replace('/(app)/(tabs)')}
          variant="plain"
        >
          <AppText variant="button" style={styles.secondaryCtaLabel}>
            {t('common.goBack')}
          </AppText>
        </Button>
      </View>
    );
  }

  const payload = query.data;
  if (!payload) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <AppText variant="cardTitle">{t('emergency.share.notFoundTitle')}</AppText>
        <AppText variant="subtitle" style={styles.muted}>
          {t('emergency.share.notFoundMessage')}
        </AppText>
        <Button style={styles.cta} onPress={() => router.replace('/(app)/(tabs)')} variant="plain">
          <AppText variant="button" style={styles.ctaLabel}>
            {t('common.goBack')}
          </AppText>
        </Button>
      </View>
    );
  }

  const contacts = payload.emergencyContacts;
  const list = (items: string[]) =>
    items.length ? items.join(', ') : t('emergency.share.noneListed');

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <ShieldAlert color={palette.primary} size={20} strokeWidth={2.25} />
          </View>
          <View style={styles.headerCopy}>
            <AppText variant="caption" color="brand" style={styles.eyebrow}>
              {t('emergency.share.badge')}
            </AppText>
            <AppText variant="cardTitle">{t('emergency.share.title')}</AppText>
          </View>
        </View>

        <AppText variant="subtitle" style={styles.help}>
          {t('emergency.share.help')}
        </AppText>

        <View style={[styles.atmShell, shadow.card]}>
          <View style={styles.atmClip}>
            <LinearGradientFill
              colors={[
                { offset: '0%', color: '#0D9488' },
                { offset: '45%', color: '#0F766E' },
                { offset: '100%', color: '#115E59' },
              ]}
              angle={135}
              style={styles.atmCard}
            >
              <View style={styles.atmContent}>
                <AppText variant="caption" style={styles.atmBrand}>
                  CareMate
                </AppText>
                <AppText variant="sectionTitle" style={styles.atmName} numberOfLines={2}>
                  {payload.fullName || t('profile.patientId.fallbackName')}
                </AppText>
                {!payload.hasProfile ? (
                  <AppText variant="body" style={styles.atmMuted}>
                    {t('emergency.share.noProfileYet')}
                  </AppText>
                ) : (
                  <>
                    <AppText variant="body" style={styles.atmLine}>
                      {t('emergency.fields.bloodGroup')}: {payload.bloodGroup || '—'}
                    </AppText>
                    <AppText variant="body" style={styles.atmLine}>
                      {t('emergency.fields.genotype')}: {payload.genotype || '—'}
                    </AppText>
                    <AppText variant="body" style={styles.atmLine}>
                      {t('emergency.fields.allergies')}: {list(payload.allergies)}
                    </AppText>
                    <AppText variant="body" style={styles.atmLine}>
                      {t('emergency.fields.medications')}: {list(payload.currentMedications)}
                    </AppText>
                    <AppText variant="body" style={styles.atmLine}>
                      {t('emergency.fields.conditions')}: {list(payload.chronicConditions)}
                    </AppText>
                  </>
                )}
              </View>
            </LinearGradientFill>
          </View>
        </View>

        {payload.hasProfile && contacts.length > 0 ? (
          <View style={styles.contactsBlock}>
            <AppText variant="caption" color="brand" style={styles.eyebrow}>
              {t('emergency.fields.contacts')}
            </AppText>
            {contacts.map((contact, index) => (
              <View
                key={`${contact.phone}-${contact.name}-${index}`}
                style={[styles.contactCard, shadow.soft]}
              >
                <AppText variant="cardTitle">{contact.name}</AppText>
                {contact.relationship ? (
                  <AppText variant="caption" style={styles.contactMeta}>
                    {contact.relationship}
                  </AppText>
                ) : null}
                {contact.phone ? (
                  <Button
                    style={styles.phoneRow}
                    onPress={() => void Linking.openURL(`tel:${contact.phone}`)}
                    variant="plain"
                  >
                    <Phone color={palette.primary} size={16} strokeWidth={2.25} />
                    <AppText variant="button" style={styles.phoneLabel}>
                      {contact.phone}
                    </AppText>
                  </Button>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        <Button
          style={styles.secondaryCta}
          onPress={() => router.replace('/(app)/(tabs)')}
          variant="plain"
        >
          <AppText variant="button" style={styles.secondaryCtaLabel}>
            {t('common.goBack')}
          </AppText>
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layoutSpacing.screenHorizontal,
    gap: spacing.md,
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryLight,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  help: {
    color: palette.textSecondary,
  },
  muted: {
    color: palette.textSecondary,
    textAlign: 'center',
  },
  atmShell: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  atmClip: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  atmCard: {
    minHeight: 220,
    padding: spacing.lg,
  },
  atmContent: {
    gap: spacing.xs,
  },
  atmBrand: {
    color: '#99F6E4',
    fontFamily: fontFamily.semiBold,
    letterSpacing: 1,
  },
  atmName: {
    color: '#FFFFFF',
    marginTop: spacing.sm,
  },
  atmLine: {
    color: '#ECFDF5',
  },
  atmMuted: {
    color: '#99F6E4',
    marginTop: spacing.sm,
  },
  contactsBlock: {
    gap: spacing.sm,
  },
  contactCard: {
    borderRadius: radius.lg,
    backgroundColor: palette.background,
    padding: spacing.md,
    gap: spacing.xs,
  },
  contactMeta: {
    color: palette.textSecondary,
  },
  phoneRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phoneLabel: {
    color: palette.primary,
  },
  cta: {
    borderRadius: radius.lg,
    backgroundColor: palette.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  ctaLabel: {
    color: '#FFFFFF',
  },
  secondaryCta: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: palette.background,
  },
  secondaryCtaLabel: {
    color: palette.text,
  },
});
