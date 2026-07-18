import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Crown, RefreshCw, Sparkles, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { LoadingState } from '@/components/ui/screen-states';
import { formatPriceAmount, getPremiumState, premiumLabel } from '@/domains/billing/entitlement';
import { billingCurrencyForCountry } from '@/domains/billing/currency-by-country';
import { billingRepository } from '@/domains/billing/repository';
import type { BillingCurrency, BillingInterval, PlanType } from '@/domains/billing/types';
import { familyRepository } from '@/domains/family/repository';
import { useTranslation } from '@/domains/localization';
import { profileRepository } from '@/domains/profile/repository';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { useLocalizationPreferences } from '@/hooks/use-localization-preferences';
import { QUERY_KEYS } from '@/constants/config';
import { fontFamily, layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

const ACCENT = '#B45309';
const SOFT = '#FEF3C7';
const SOFT_END = '#FFFBEB';
const TITLE = '#92400E';

export default function PremiumScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const { countryCode } = useLocalizationPreferences();
  const queryClient = useQueryClient();
  const billingCurrency = billingCurrencyForCountry(countryCode);

  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planType, setPlanType] = useState<PlanType>('personal');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');

  const premiumQuery = useQuery({
    queryKey: ['billing', 'premium', userId, isGuest],
    queryFn: async () => {
      if (isGuest) {
        return {
          premium: null,
          householdId: null as string | null,
          patientId: null as string | null,
        };
      }
      const [household, premium, profile] = await Promise.all([
        familyRepository.findHouseholdForUser(userId),
        getPremiumState(userId),
        profileRepository.findByUserId(userId),
      ]);
      return {
        premium,
        householdId: household?.id ?? null,
        patientId: profile?.patientId ?? null,
      };
    },
  });

  const pricesQuery = useQuery({
    queryKey: ['billing', 'prices'],
    queryFn: () => billingRepository.listPrices(),
  });

  const loading = premiumQuery.isLoading || pricesQuery.isLoading;
  const premium = premiumQuery.data?.premium ?? null;
  const householdId = premiumQuery.data?.householdId ?? null;
  const patientId = premiumQuery.data?.patientId ?? null;
  const prices = pricesQuery.data ?? [];
  const isPersonalActive = premium?.tier === 'personal';
  const isFamilyActive = premium?.tier === 'family';
  const showUpgrade = isPersonalActive && planType === 'family';

  const selectedPrices = prices.filter(
    (p) =>
      p.planType === planType &&
      p.billingInterval === billingInterval &&
      p.currency === billingCurrency,
  );

  const upgradeCurrency = billingCurrency;

  const upgradeQuoteQuery = useQuery({
    queryKey: [
      'billing',
      'upgrade-quote',
      userId,
      billingInterval,
      upgradeCurrency,
      householdId,
      isPersonalActive,
    ],
    enabled: !isGuest && showUpgrade && Boolean(householdId),
    queryFn: () =>
      billingRepository.quoteFamilyUpgrade({
        billingInterval,
        currency: upgradeCurrency,
        householdId,
      }),
  });

  useEffect(() => {
    if (isPersonalActive && planType === 'personal') {
      setPlanType('family');
    }
  }, [isPersonalActive, planType]);

  async function refresh() {
    setError(null);
    if (!isGuest) {
      try {
        await billingRepository.syncAfterCheckout();
      } catch {
        try {
          await billingRepository.pullFromRemote();
        } catch {
          // Query invalidation still refreshes from cache.
        }
      }
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['billing', 'premium'] }),
      queryClient.invalidateQueries({ queryKey: ['billing', 'prices'] }),
      queryClient.invalidateQueries({ queryKey: ['billing', 'upgrade-quote'] }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ads }),
    ]);
  }

  async function pay(currency: BillingCurrency) {
    if (isGuest) {
      router.push('/(auth)/login');
      return;
    }
    if (isFamilyActive) {
      setError(t('profile.premium.checkoutFailed'));
      return;
    }
    if (isPersonalActive && planType === 'personal') {
      setError(t('profile.premium.alreadyPersonal'));
      return;
    }
    if (planType === 'family' && !householdId) {
      setError(t('profile.premium.familyRequired'));
      return;
    }

    setPaying(true);
    setError(null);
    try {
      if (isPersonalActive && planType === 'family') {
        await billingRepository.startFamilyUpgrade({
          billingInterval,
          currency,
          householdId,
        });
      } else {
        await billingRepository.startCheckout({
          planType,
          billingInterval,
          currency,
          householdId: planType === 'family' ? householdId : null,
          patientId,
        });
      }
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : showUpgrade
            ? t('profile.premium.upgradeFailed')
            : t('profile.premium.checkoutFailed'),
      );
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return <LoadingState title={t('profile.premium.loading')} />;
  }

  const planLabel = isGuest
    ? t('profile.premium.signInToUpgrade')
    : premiumLabel(premium?.tier ?? 'free');

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
                  <Crown color={ACCENT} size={28} strokeWidth={2.2} />
                </View>
              </View>

              <AppText variant="caption" style={styles.heroEyebrow}>
                {t('profile.premium.eyebrow')}
              </AppText>
              <AppText variant="screenTitle" style={styles.heroTitle}>
                {t('profile.premium.heroTitle')}
              </AppText>
              <AppText variant="subtitle" style={styles.heroSubtitle}>
                {t('profile.premium.heroSubtitle')}
              </AppText>
            </LinearGradientFill>
          </View>
        </AnimatedSection>

        <AnimatedSection index={1}>
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="caption" style={styles.sectionEyebrow}>
              {t('profile.premium.yourPlan')}
            </AppText>
            <View style={styles.planRow}>
              <View style={styles.planBadge}>
                <Sparkles color={ACCENT} size={16} strokeWidth={2.2} />
                <AppText variant="cardTitle" style={styles.planLabel}>
                  {planLabel}
                </AppText>
              </View>
            </View>
            {premium?.currentPeriodEnd ? (
              <AppText variant="caption" style={styles.muted}>
                {t('profile.premium.renews', {
                  date: new Date(premium.currentPeriodEnd).toLocaleDateString(),
                })}
              </AppText>
            ) : null}
          </View>
        </AnimatedSection>

        {isGuest ? (
          <AnimatedSection index={2}>
            <PressableScale
              style={[styles.primaryCta, shadow.soft]}
              onPress={() => router.push('/(auth)/login')}
            >
              <AppText variant="button" style={styles.primaryCtaLabel}>
                {t('profile.premium.signInToUpgrade')}
              </AppText>
            </PressableScale>
          </AnimatedSection>
        ) : (
          <>
            <AnimatedSection index={2}>
              <View style={[styles.card, shadow.soft]}>
                <AppText variant="caption" style={styles.sectionEyebrow}>
                  {t('profile.premium.choosePlan')}
                </AppText>
                {isFamilyActive ? (
                  <AppText variant="caption" style={styles.muted}>
                    {t('profile.premium.yourPlan')}: {t('profile.premium.family')}
                  </AppText>
                ) : (
                  <>
                    <View style={styles.chipRow}>
                      <Chip
                        label={t('profile.premium.personal')}
                        icon={Crown}
                        active={planType === 'personal'}
                        onPress={() => setPlanType('personal')}
                      />
                      <Chip
                        label={
                          isPersonalActive
                            ? t('profile.premium.upgradeToFamily')
                            : t('profile.premium.family')
                        }
                        icon={Users}
                        active={planType === 'family'}
                        onPress={() => setPlanType('family')}
                      />
                    </View>

                    {planType === 'family' && !householdId ? (
                      <View style={styles.familyHint}>
                        <AppText variant="caption" style={styles.muted}>
                          {isPersonalActive
                            ? t('profile.premium.upgradeNeedsHousehold')
                            : t('profile.premium.noHousehold')}
                        </AppText>
                        <PressableScale onPress={() => router.push('/(app)/family')}>
                          <AppText variant="body" style={styles.link}>
                            {t('profile.premium.setUpFamily')}
                          </AppText>
                        </PressableScale>
                      </View>
                    ) : null}

                    <View style={styles.chipRow}>
                      <Chip
                        label={t('profile.premium.monthly')}
                        active={billingInterval === 'monthly'}
                        onPress={() => setBillingInterval('monthly')}
                      />
                      <Chip
                        label={t('profile.premium.yearly')}
                        active={billingInterval === 'yearly'}
                        onPress={() => setBillingInterval('yearly')}
                      />
                    </View>
                  </>
                )}
              </View>
            </AnimatedSection>

            {!isFamilyActive ? (
              <AnimatedSection index={3}>
                <View style={[styles.card, shadow.soft]}>
                  <AppText variant="caption" style={styles.sectionEyebrow}>
                    {showUpgrade
                      ? t('profile.premium.upgradeTitle')
                      : t('profile.premium.pay')}
                  </AppText>
                  <AppText variant="caption" style={styles.muted}>
                    {t('profile.premium.payInCurrency', { currency: billingCurrency })}
                  </AppText>

                  {showUpgrade ? (
                    <UpgradeQuoteBlock
                      quote={upgradeQuoteQuery.data ?? null}
                      loading={upgradeQuoteQuery.isLoading}
                      error={
                        upgradeQuoteQuery.error instanceof Error
                          ? upgradeQuoteQuery.error.message
                          : upgradeQuoteQuery.isError
                            ? t('profile.premium.upgradeQuoteFailed')
                            : null
                      }
                      householdId={householdId}
                      paying={paying}
                      onPay={(currency) => void pay(currency)}
                    />
                  ) : selectedPrices.length === 0 ? (
                    <AppText variant="caption" style={styles.muted}>
                      {t('profile.premium.noPrices')}
                    </AppText>
                  ) : (
                    <View style={styles.payStack}>
                      {selectedPrices.map((price) => {
                        const disabled =
                          paying ||
                          (planType === 'family' && !householdId) ||
                          (isPersonalActive && planType === 'personal');
                        return (
                          <PressableScale
                            key={price.id}
                            disabled={disabled}
                            style={[styles.secondaryCta, disabled ? styles.ctaDisabled : null]}
                            onPress={() => void pay(price.currency)}
                          >
                            <AppText variant="button" style={styles.secondaryCtaLabel}>
                              {price.provider === 'paystack' ? 'Paystack' : 'Stripe'} ·{' '}
                              {formatPriceAmount(price.amountMinor, price.currency)}
                            </AppText>
                          </PressableScale>
                        );
                      })}
                    </View>
                  )}
                </View>
              </AnimatedSection>
            ) : null}
          </>
        )}

        {error || premiumQuery.error || pricesQuery.error ? (
          <AnimatedSection index={4}>
            <AppText variant="caption" style={styles.error}>
              {error ??
                (premiumQuery.error instanceof Error
                  ? premiumQuery.error.message
                  : pricesQuery.error instanceof Error
                    ? pricesQuery.error.message
                    : t('profile.premium.loadFailed'))}
            </AppText>
          </AnimatedSection>
        ) : null}

        <AnimatedSection index={5}>
          <PressableScale style={styles.refreshCta} onPress={() => void refresh()}>
            <RefreshCw color={ACCENT} size={16} strokeWidth={2.25} />
            <AppText variant="button" style={styles.refreshLabel}>
              {t('profile.premium.refresh')}
            </AppText>
          </PressableScale>
        </AnimatedSection>
      </Animated.ScrollView>
    </View>
  );
}

function UpgradeQuoteBlock({
  quote,
  loading,
  error,
  householdId,
  paying,
  onPay,
}: {
  quote: Awaited<ReturnType<typeof billingRepository.quoteFamilyUpgrade>> | null;
  loading: boolean;
  error: string | null;
  householdId: string | null;
  paying: boolean;
  onPay: (currency: BillingCurrency) => void;
}) {
  const { t } = useTranslation();

  if (!householdId) {
    return (
      <AppText variant="caption" style={styles.muted}>
        {t('profile.premium.upgradeNeedsHousehold')}
      </AppText>
    );
  }

  if (loading) {
    return (
      <AppText variant="caption" style={styles.muted}>
        {t('profile.premium.loading')}
      </AppText>
    );
  }

  if (error || !quote) {
    return (
      <AppText variant="caption" style={styles.error}>
        {error ?? t('profile.premium.upgradeQuoteFailed')}
      </AppText>
    );
  }

  const intervalLabel =
    quote.billingInterval === 'yearly'
      ? t('profile.premium.yearly')
      : t('profile.premium.monthly');
  const disabled = paying;

  return (
    <View style={styles.payStack}>
      <AppText variant="caption" style={styles.muted}>
        {t('profile.premium.upgradeSubtitle')}
      </AppText>
      <QuoteRow
        label={t('profile.premium.upgradeFamilyPrice', { interval: intervalLabel })}
        value={formatPriceAmount(quote.familyListPriceMinor, quote.currency)}
      />
      <QuoteRow
        label={t('profile.premium.upgradeCredit', { days: quote.daysRemaining })}
        value={`− ${formatPriceAmount(quote.creditMinor, quote.currency)}`}
      />
      <QuoteRow
        label={t('profile.premium.upgradeDue')}
        value={formatPriceAmount(quote.chargeMinor, quote.currency)}
        emphasize
      />
      <AppText variant="caption" style={styles.muted}>
        {t('profile.premium.upgradeNewEnd', {
          date: new Date(quote.newPeriodEnd).toLocaleDateString(),
        })}
      </AppText>
      <PressableScale
        disabled={disabled}
        style={[styles.secondaryCta, disabled ? styles.ctaDisabled : null]}
        onPress={() => onPay(quote.currency)}
      >
        <AppText variant="button" style={styles.secondaryCtaLabel}>
          {quote.chargeMinor === 0
            ? t('profile.premium.upgradeZeroCharge')
            : `${quote.provider === 'paystack' ? 'Paystack' : 'Stripe'} · ${formatPriceAmount(quote.chargeMinor, quote.currency)}`}
        </AppText>
      </PressableScale>
    </View>
  );
}

function QuoteRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View style={styles.quoteRow}>
      <AppText
        variant="caption"
        style={emphasize ? styles.quoteLabelEmphasize : styles.muted}
      >
        {label}
      </AppText>
      <AppText
        variant={emphasize ? 'cardTitle' : 'body'}
        style={emphasize ? styles.quoteValueEmphasize : styles.quoteValue}
      >
        {value}
      </AppText>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: typeof Crown;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null]}
      accessibilityRole="button"
      scale={0.96}
    >
      {Icon ? (
        <Icon color={active ? ACCENT : palette.textSecondary} size={14} strokeWidth={2.2} />
      ) : null}
      <AppText variant="body" style={active ? styles.chipTextActive : styles.chipText}>
        {label}
      </AppText>
    </PressableScale>
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
    minHeight: 168,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  heroBlob: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FDE68A',
    opacity: 0.55,
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
    borderColor: 'rgba(180, 83, 9, 0.2)',
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
    backgroundColor: 'rgba(180, 83, 9, 0.1)',
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
    marginTop: 2,
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
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planLabel: {
    color: TITLE,
    fontFamily: fontFamily.semiBold,
  },
  muted: {
    color: palette.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: palette.divider,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: palette.surface,
  },
  chipActive: {
    backgroundColor: SOFT,
    borderColor: ACCENT,
  },
  chipText: {
    color: palette.textSecondary,
  },
  chipTextActive: {
    color: ACCENT,
    fontFamily: fontFamily.semiBold,
  },
  familyHint: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  link: {
    color: ACCENT,
    textDecorationLine: 'underline',
    fontFamily: fontFamily.semiBold,
  },
  payStack: {
    gap: spacing.sm,
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  quoteValue: {
    color: palette.text,
    fontFamily: fontFamily.semiBold,
  },
  quoteLabelEmphasize: {
    color: TITLE,
    fontFamily: fontFamily.semiBold,
  },
  quoteValueEmphasize: {
    color: ACCENT,
  },
  primaryCta: {
    backgroundColor: ACCENT,
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'center',
  },
  secondaryCtaLabel: {
    color: ACCENT,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  refreshCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  refreshLabel: {
    color: ACCENT,
  },
  error: {
    color: palette.danger,
  },
});
