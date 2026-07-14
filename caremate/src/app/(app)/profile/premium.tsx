import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import {
  formatPriceAmount,
  getPremiumState,
  premiumLabel,
} from '@/domains/billing/entitlement';
import { billingRepository } from '@/domains/billing/repository';
import type {
  BillingCurrency,
  BillingInterval,
  PlanType,
  PremiumState,
  SubscriptionPriceRow,
} from '@/domains/billing/types';
import { familyRepository } from '@/domains/family/repository';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { palette, radius, shadow, spacing } from '@/theme/colors';

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [premium, setPremium] = useState<PremiumState | null>(null);
  const [prices, setPrices] = useState<SubscriptionPriceRow[]>([]);
  const [planType, setPlanType] = useState<PlanType>('personal');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [householdId, setHouseholdId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isGuest) {
        const household = await familyRepository.findHouseholdForUser(userId);
        setHouseholdId(household?.id ?? null);
        const state = await getPremiumState(userId);
        setPremium(state);
      } else {
        setPremium(null);
        setHouseholdId(null);
      }
      const catalog = await billingRepository.listPrices();
      setPrices(catalog);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing');
    } finally {
      setLoading(false);
    }
  }, [isGuest, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedPrices = prices.filter(
    (p) => p.planType === planType && p.billingInterval === billingInterval,
  );

  async function pay(currency: BillingCurrency) {
    if (isGuest) {
      router.push('/(auth)/login');
      return;
    }
    if (planType === 'family' && !householdId) {
      setError('Set up a family household before buying Family Premium.');
      return;
    }

    setPaying(true);
    setError(null);
    try {
      await billingRepository.startCheckout({
        planType,
        billingInterval,
        currency,
        householdId: planType === 'family' ? householdId : null,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setPaying(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
    >
      <AppText variant="sectionTitle">CareMate Premium</AppText>
      <AppText variant="quickActionSubtitle">
        Free forever for core features. Premium Personal and Family unlock upcoming premium tools.
        Feature gates will be configured later.
      </AppText>

      {loading ? (
        <ActivityIndicator color={palette.primary} />
      ) : (
        <>
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="cardTitle">Your plan</AppText>
            <AppText variant="body">
              {isGuest ? 'Sign in to upgrade' : premiumLabel(premium?.tier ?? 'free')}
            </AppText>
            {premium?.currentPeriodEnd ? (
              <AppText variant="quickActionSubtitle">
                Renews / ends {new Date(premium.currentPeriodEnd).toLocaleDateString()}
              </AppText>
            ) : null}
          </View>

          {isGuest ? (
            <Button label="Sign in to upgrade" onPress={() => router.push('/(auth)/login')} />
          ) : (
            <>
              <View style={[styles.card, shadow.soft]}>
                <AppText variant="cardTitle">Choose plan</AppText>
                <View style={styles.row}>
                  <Chip
                    label="Personal"
                    active={planType === 'personal'}
                    onPress={() => setPlanType('personal')}
                  />
                  <Chip
                    label="Family"
                    active={planType === 'family'}
                    onPress={() => setPlanType('family')}
                  />
                </View>
                {planType === 'family' && !householdId ? (
                  <View style={styles.row}>
                    <AppText variant="quickActionSubtitle">No household yet.</AppText>
                    <Pressable onPress={() => router.push('/(app)/family')}>
                      <AppText variant="body" style={styles.link}>
                        Set up family
                      </AppText>
                    </Pressable>
                  </View>
                ) : null}
                <View style={styles.row}>
                  <Chip
                    label="Monthly"
                    active={billingInterval === 'monthly'}
                    onPress={() => setBillingInterval('monthly')}
                  />
                  <Chip
                    label="Yearly"
                    active={billingInterval === 'yearly'}
                    onPress={() => setBillingInterval('yearly')}
                  />
                </View>
              </View>

              <View style={[styles.card, shadow.soft]}>
                <AppText variant="cardTitle">Pay</AppText>
                {selectedPrices.length === 0 ? (
                  <AppText variant="quickActionSubtitle">
                    No active prices for this selection. Ask an admin to configure billing in the
                    portal.
                  </AppText>
                ) : (
                  selectedPrices.map((price) => (
                    <Button
                      key={price.id}
                      label={`${price.provider === 'paystack' ? 'Paystack' : 'Stripe'} · ${formatPriceAmount(price.amountMinor, price.currency)}`}
                      variant="secondary"
                      disabled={paying || (planType === 'family' && !householdId)}
                      onPress={() => void pay(price.currency)}
                    />
                  ))
                )}
              </View>
            </>
          )}

          {error ? (
            <AppText variant="quickActionSubtitle" style={styles.error}>
              {error}
            </AppText>
          ) : null}

          <Button label="Refresh status" variant="secondary" onPress={() => void refresh()} />
        </>
      )}
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null]}
      accessibilityRole="button"
    >
      <AppText variant="body" style={active ? styles.chipTextActive : undefined}>
        {label}
      </AppText>
    </Pressable>
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
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: palette.divider,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    backgroundColor: palette.primaryLight,
    borderColor: palette.primary,
  },
  chipTextActive: {
    color: palette.primary,
    fontWeight: '600',
  },
  link: {
    color: palette.primary,
    textDecorationLine: 'underline',
  },
  error: {
    color: palette.danger,
  },
});
