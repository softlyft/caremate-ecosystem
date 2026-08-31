import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Alert, Linking, StyleSheet, Switch, View } from 'react-native';
import {
  Bell,
  CircleCheck,
  Crown,
  FileText,
  HeartHandshake,
  Link2,
  LogOut,
  Pencil,
  Settings,
  Shield,
  ShieldPlus,
  Users,
  UserRound,
} from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/form-controls';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/screen-states';
import { images } from '@/constants/assets';
import { WEBSITE_URLS } from '@/constants/config';
import { premiumLabel } from '@/domains/billing/entitlement';
import { emergencyRepository } from '@/domains/emergency/repository';
import { familyRepository } from '@/domains/family/repository';
import { getFinishSetupItems, setDeviceDefaults, type FinishSetupItem } from '@/domains/onboarding';
import { useTranslation } from '@/domains/localization';
import { clearPushRegistration, syncPushRegistration } from '@/domains/notifications/push';
import { PatientIdCard } from '@/features/profile/PatientIdCard';
import { ProfileCard, ProfileMenuRow } from '@/features/profile/ProfileMenuRow';
import { useAuthStore } from '@/features/auth/store';
import { profileRepository } from '@/domains/profile/repository';
import { useSettingsStore } from '@/domains/profile/store';
import { layoutSpacing, palette, primaryAlpha, radius, shadow, spacing } from '@/theme';
import { useAccountDisplayName } from '@/hooks/use-account-display-name';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { usePremiumState } from '@/hooks/use-premium-state';

export default function ProfileTabScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const { fullName, profileQuery } = useAccountDisplayName();
  const displayName = fullName?.trim() || t('profile.patientId.fallbackName');

  // Canonical ['billing','premium'] cache — flat PremiumState only (see usePremiumState).
  const premiumQuery = usePremiumState();
  const premiumReady = isGuest || Boolean(premiumQuery.data) || !premiumQuery.isPending;

  const finishSetupQuery = useQuery({
    queryKey: ['finish-setup', userId, isGuest, profileQuery.dataUpdatedAt],
    queryFn: async (): Promise<FinishSetupItem[]> => {
      const [emergency, household] = await Promise.all([
        isGuest ? null : emergencyRepository.findByUserId(userId),
        isGuest ? null : familyRepository.findHouseholdForUser(userId),
      ]);
      const hasEmergencyEssentials = Boolean(
        emergency?.bloodGroup &&
        emergency.genotype &&
        (emergency.emergencyContacts?.length ?? 0) > 0,
      );
      return getFinishSetupItems({
        isGuest,
        hasCountry: Boolean(profileQuery.data?.countryCode) && !isGuest,
        hasEmergencyEssentials,
        hasHousehold: Boolean(household),
      });
    },
  });
  const finishItems = finishSetupQuery.data ?? [];

  async function handleNotificationsToggle(value: boolean) {
    setNotificationsEnabled(value);
    await Promise.all([
      profileRepository.saveSettings(userId, { notificationsEnabled: value }),
      setDeviceDefaults({ notificationsEnabled: value }),
    ]);
    if (value) {
      void syncPushRegistration({ requestPermission: true });
    } else {
      void clearPushRegistration();
    }
  }

  async function openCommunityNetwork() {
    try {
      const url = WEBSITE_URLS.communityNetwork;
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(t('settings.legal.openFailed'));
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('settings.legal.openFailed'));
    }
  }

  return (
    <Screen padded={false}>
      <Animated.ScrollView
        entering={FadeIn.duration(300)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
      >
        <AnimatedSection index={0}>
          <View style={styles.hero}>
            <View style={styles.meshTop} />
            <View style={styles.meshAccent} />
            <Image source={images.logoHeader} style={styles.logo} contentFit="contain" />

            <View style={[styles.identityCard, shadow.soft]}>
              <LinearGradientFill
                colors={[
                  { offset: '0%', color: '#F0FDFA' },
                  { offset: '100%', color: '#FFFFFF' },
                ]}
                style={styles.identityInner}
              >
                {!isGuest ? (
                  <Button
                    style={styles.editButton}
                    accessibilityLabel={t('profile.edit.openA11y')}
                    onPress={() => router.push('/(app)/profile/edit')}
                    variant="plain"
                  >
                    <Pencil color={palette.primary} size={18} strokeWidth={2.25} />
                  </Button>
                ) : null}
                <View style={styles.avatarRing}>
                  <View style={styles.avatar}>
                    <UserRound color={palette.primary} size={32} strokeWidth={2} />
                  </View>
                </View>
                <AppText variant="heroGreeting" style={styles.name}>
                  {isGuest ? t('profile.guest.title') : displayName}
                </AppText>
                <AppText variant="subtitle" style={styles.subtitle}>
                  {isGuest
                    ? t('profile.guest.subtitle')
                    : (user?.email ?? t('profile.guest.signIn'))}
                </AppText>
                {!isGuest && premiumReady ? (
                  <View style={styles.planPill}>
                    <Crown color={palette.primary} size={13} />
                    <AppText variant="caption" color="brand">
                      {premiumLabel(premiumQuery.tier)}
                    </AppText>
                  </View>
                ) : !isGuest ? (
                  <View style={styles.planPill}>
                    <Crown color={palette.primary} size={13} />
                    <AppText variant="caption" color="secondary">
                      …
                    </AppText>
                  </View>
                ) : (
                  <View style={styles.guestActions}>
                    <Button
                      style={styles.primaryCta}
                      onPress={() => router.push('/(auth)/login')}
                      variant="plain"
                    >
                      <AppText variant="button" style={styles.primaryCtaLabel}>
                        {t('profile.guest.signIn')}
                      </AppText>
                    </Button>
                    <Button
                      style={styles.secondaryCta}
                      onPress={() => router.push('/(auth)/register')}
                      variant="plain"
                    >
                      <AppText variant="button" style={styles.secondaryCtaLabel}>
                        {t('profile.guest.createAccount')}
                      </AppText>
                    </Button>
                  </View>
                )}
              </LinearGradientFill>
            </View>
          </View>
        </AnimatedSection>

        {!isGuest ? (
          <AnimatedSection index={1}>
            <PatientIdCard userId={userId} displayName={displayName} />
          </AnimatedSection>
        ) : null}

        {finishItems.length > 0 ? (
          <AnimatedSection index={isGuest ? 1 : 2}>
            <ProfileCard>
              <AppText variant="caption" color="brand" style={styles.sectionEyebrow}>
                {t('profile.finishSetup')}
              </AppText>
              {finishItems.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <ProfileMenuRow
                    icon={CircleCheck}
                    iconColor={palette.primary}
                    iconBackground={palette.primaryLight}
                    title={t(item.titleKey)}
                    subtitle={t(item.subtitleKey)}
                    onPress={() => router.push(item.href)}
                  />
                </View>
              ))}
            </ProfileCard>
          </AnimatedSection>
        ) : null}

        <AnimatedSection index={finishItems.length > 0 ? (isGuest ? 2 : 3) : 2}>
          <ProfileCard>
            <AppText variant="caption" color="brand" style={styles.sectionEyebrow}>
              {t('profile.account')}
            </AppText>
            <ProfileMenuRow
              icon={Crown}
              iconColor="#B45309"
              iconBackground="#FEF3C7"
              title={t('profile.menu.premium')}
              subtitle={isGuest ? t('profile.premium.guestCta') : t('profile.premium.title')}
              onPress={() =>
                isGuest
                  ? router.push('/(auth)/login')
                  : router.push('/(app)/profile/premium' as Href)
              }
            />
            <View style={styles.divider} />
            <ProfileMenuRow
              icon={ShieldPlus}
              iconColor={palette.brandPurple}
              iconBackground={palette.purpleLight}
              title={t('profile.menu.emergency')}
              subtitle={t('setup.finishItems.emergency.subtitle')}
              onPress={() => router.push('/(app)/emergency')}
            />
            <View style={styles.divider} />
            <ProfileMenuRow
              icon={Users}
              iconColor={palette.brandBlue}
              iconBackground={palette.brandBlueLight}
              title={t('profile.menu.family')}
              subtitle={
                isGuest
                  ? t('setup.finishItems.accountFamily.subtitle')
                  : t('setup.finishItems.family.subtitle')
              }
              onPress={() =>
                isGuest ? router.push('/(auth)/login') : router.push('/(app)/family')
              }
            />
            <View style={styles.divider} />
            <ProfileMenuRow
              icon={Link2}
              iconColor={palette.primary}
              iconBackground={palette.primaryLight}
              title={t('profile.menu.connections')}
              subtitle={
                isGuest ? t('profile.connections.guestSubtitle') : t('profile.connections.subtitle')
              }
              onPress={() =>
                isGuest
                  ? router.push('/(auth)/login')
                  : router.push('/(app)/providers/connections' as Href)
              }
            />
            <View style={styles.divider} />
            <ProfileMenuRow
              icon={FileText}
              iconColor="#0F766E"
              iconBackground="#CCFBF1"
              title={t('profile.menu.documents')}
              subtitle={
                isGuest ? t('profile.documents.guestSubtitle') : t('profile.documents.menuSubtitle')
              }
              onPress={() =>
                isGuest
                  ? router.push('/(auth)/login')
                  : router.push('/(app)/profile/documents' as Href)
              }
            />
            <View style={styles.divider} />
            <ProfileMenuRow
              icon={Shield}
              iconColor="#4F46E5"
              iconBackground="#E0E7FF"
              title={t('profile.menu.insuranceDirectory')}
              subtitle={
                isGuest
                  ? t('profile.insuranceDirectory.guestSubtitle')
                  : t('profile.insuranceDirectory.menuSubtitle')
              }
              onPress={() => router.push('/(app)/profile/insurance' as Href)}
            />
            <View style={styles.divider} />
            <ProfileMenuRow
              icon={HeartHandshake}
              iconColor={palette.brandPurple}
              iconBackground={palette.purpleLight}
              title={t('profile.menu.community')}
              subtitle={t('profile.menu.communitySubtitle')}
              onPress={() => void openCommunityNetwork()}
            />
          </ProfileCard>
        </AnimatedSection>

        <AnimatedSection index={finishItems.length > 0 ? (isGuest ? 3 : 4) : 3}>
          <ProfileCard>
            <AppText variant="caption" color="brand" style={styles.sectionEyebrow}>
              {t('profile.preferences')}
            </AppText>
            <View style={styles.toggleRow}>
              <View style={[styles.toggleIcon, { backgroundColor: palette.blueLight }]}>
                <Bell color={palette.blueAccent} size={20} strokeWidth={2.25} />
              </View>
              <View style={styles.toggleCopy}>
                <AppText variant="body" style={styles.toggleTitle}>
                  {t('common.notifications')}
                </AppText>
                <AppText variant="caption" style={styles.toggleSubtitle}>
                  {t('onboarding.notifications.healthRemindersHint')}
                </AppText>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: palette.divider, true: palette.primaryLight }}
                thumbColor={notificationsEnabled ? palette.primary : '#F3F4F6'}
              />
            </View>
            <View style={styles.divider} />
            <ProfileMenuRow
              icon={Settings}
              iconColor={palette.textSecondary}
              iconBackground={palette.surface}
              title={t('profile.menu.settings')}
              subtitle={t('settings.hero.subtitle')}
              onPress={() => router.push('/(app)/profile/settings')}
            />
          </ProfileCard>
        </AnimatedSection>

        {!isGuest ? (
          <AnimatedSection index={finishItems.length > 0 ? 5 : 4}>
            <Button style={styles.signOut} onPress={() => signOut()} variant="plain">
              <LogOut color={palette.danger} size={18} strokeWidth={2.25} />
              <AppText variant="button" style={styles.signOutLabel}>
                {t('profile.signOut')}
              </AppText>
            </Button>
          </AnimatedSection>
        ) : null}
      </Animated.ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    gap: spacing.sm,
    paddingBottom: 40,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    gap: spacing.sm,
  },
  meshTop: {
    position: 'absolute',
    top: -60,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: palette.primaryLight,
    opacity: 0.65,
  },
  meshAccent: {
    position: 'absolute',
    top: 40,
    left: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: palette.blueLight,
    opacity: 0.5,
  },
  logo: {
    width: 150,
    height: 40,
    alignSelf: 'center',
    zIndex: 1,
  },
  identityCard: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: primaryAlpha(0.12),
    zIndex: 1,
  },
  identityInner: {
    position: 'relative',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: layoutSpacing.welcomeToSubtitle,
  },
  editButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: primaryAlpha(0.18),
    zIndex: 2,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 4,
    borderWidth: 2,
    borderColor: primaryAlpha(0.25),
  },
  avatar: {
    flex: 1,
    borderRadius: 40,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    color: palette.textSecondary,
    maxWidth: '90%',
  },
  planPill: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  guestActions: {
    marginTop: spacing.sm,
    width: '100%',
    gap: spacing.sm,
  },
  primaryCta: {
    backgroundColor: palette.primary,
    borderRadius: radius.full,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaLabel: {
    color: '#FFFFFF',
  },
  secondaryCta: {
    backgroundColor: palette.background,
    borderRadius: radius.full,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.divider,
  },
  secondaryCtaLabel: {
    color: palette.text,
  },
  sectionEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
    marginLeft: 58,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  toggleIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCopy: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  toggleSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: palette.textSecondary,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: radius.xxl,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutLabel: {
    color: palette.danger,
  },
});
