import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { images } from '@/constants/assets';
import { getPremiumState, premiumLabel } from '@/domains/billing/entitlement';
import type { PremiumState } from '@/domains/billing/types';
import { useAuthStore } from '@/features/auth/store';
import { useSettingsStore } from '@/domains/profile/store';
import { profileRepository } from '@/domains/profile/repository';
import { authService } from '@/services/auth-service';
import { palette, radius, shadow, spacing } from '@/theme/colors';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';

export default function ProfileTabScreen() {
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const biometricEnabled = useAuthStore((state) => state.biometricEnabled);
  const setBiometricEnabled = useAuthStore((state) => state.setBiometricEnabled);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const [premium, setPremium] = useState<PremiumState | null>(null);

  useEffect(() => {
    if (isGuest) {
      setPremium(null);
      return;
    }
    void getPremiumState(userId)
      .then(setPremium)
      .catch(() => setPremium(null));
  }, [isGuest, userId]);

  async function handleBiometricToggle(value: boolean) {
    const available = await authService.isBiometricAvailable();
    if (value && !available) {
      return;
    }
    await setBiometricEnabled(value);
  }

  async function handleNotificationsToggle(value: boolean) {
    setNotificationsEnabled(value);
    await profileRepository.saveSettings(userId, { notificationsEnabled: value });
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
    >
      <Image source={images.logo} style={styles.logo} contentFit="contain" />

      <View style={[styles.card, shadow.soft]}>
        <View style={styles.avatar}>
          <UserRound color={palette.textSecondary} size={28} />
        </View>
        <AppText variant="sectionTitle" style={styles.centered}>
          {isGuest ? 'Guest User' : (user?.email?.split('@')[0] ?? 'CareMate User')}
        </AppText>
        <AppText variant="quickActionSubtitle" style={styles.centered}>
          {isGuest
            ? 'Browse freely. Sign in anytime to sync your data.'
            : (user?.email ?? 'Signed in')}
        </AppText>
        {!isGuest ? (
          <AppText variant="quickActionSubtitle" style={styles.centered}>
            Plan: {premiumLabel(premium?.tier ?? 'free')}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.card, shadow.soft]}>
        <AppText variant="cardTitle">Premium</AppText>
        <AppText variant="quickActionSubtitle">
          {isGuest
            ? 'Sign in to upgrade to Premium Personal or Family.'
            : 'Manage Free vs Premium Personal or Family (Paystack / Stripe).'}
        </AppText>
        <Button
          label={isGuest ? 'Sign in for Premium' : 'View Premium'}
          variant="secondary"
          onPress={() =>
            isGuest ? router.push('/(auth)/login') : router.push('/(app)/profile/premium' as Href)
          }
        />
      </View>

      {isGuest ? (
        <View style={[styles.card, shadow.soft]}>
          <AppText variant="cardTitle">Get more from CareMate</AppText>
          <AppText variant="quickActionSubtitle">
            Create an account to sync your emergency profile, bookmarks, and preferences across
            devices.
          </AppText>
          <View style={styles.actions}>
            <Button label="Sign In" onPress={() => router.push('/(auth)/login')} />
            <Button
              label="Create Account"
              variant="secondary"
              onPress={() => router.push('/(auth)/register')}
            />
          </View>
        </View>
      ) : null}

      <View style={[styles.card, shadow.soft]}>
        <AppText variant="cardTitle">Emergency Profile</AppText>
        <AppText variant="quickActionSubtitle">
          Create or update your offline emergency health card.
        </AppText>
        <Button
          label="Manage Emergency Profile"
          variant="secondary"
          onPress={() => router.push('/(app)/emergency')}
        />
      </View>

      <View style={[styles.card, shadow.soft]}>
        <AppText variant="cardTitle">Family</AppText>
        <AppText variant="quickActionSubtitle">
          {isGuest
            ? 'Sign in to set up kids and connect your spouse.'
            : 'Add kids, connect your spouse, and manage your household.'}
        </AppText>
        {isGuest ? (
          <Button
            label="Sign In"
            variant="secondary"
            onPress={() => router.push('/(auth)/login')}
          />
        ) : (
          <Button
            label="Manage family"
            variant="secondary"
            onPress={() => router.push('/(app)/family')}
          />
        )}
      </View>

      <View style={[styles.card, shadow.soft]}>
        <AppText variant="cardTitle">Preferences</AppText>
        <View style={styles.row}>
          <AppText variant="body">Notifications</AppText>
          <Switch value={notificationsEnabled} onValueChange={handleNotificationsToggle} />
        </View>
        {!isGuest ? (
          <View style={styles.row}>
            <AppText variant="body">Biometric unlock</AppText>
            <Switch value={biometricEnabled} onValueChange={handleBiometricToggle} />
          </View>
        ) : null}
        <Button
          label="Settings"
          variant="secondary"
          onPress={() => router.push('/(app)/profile/settings')}
        />
      </View>

      {!isGuest ? <Button label="Sign Out" variant="secondary" onPress={() => signOut()} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  logo: {
    width: 140,
    height: 42,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: spacing.md,
    gap: spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
