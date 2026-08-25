import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Globe, Mail, MapPin, Phone, Shield } from 'lucide-react-native';
import { useLayoutEffect } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { glossyStackHeaderOptions } from '@/components/navigation/glossyStackHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { payerRepository } from '@/domains/payers/repository';
import { layoutSpacing, palette, radius, shadow, spacing, textColors } from '@/theme';

const THEME = {
  accent: '#4F46E5',
  soft: '#E0E7FF',
  softEnd: '#EEF2FF',
} as const;

export default function InsuranceOrgDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.payers, id],
    queryFn: () => payerRepository.findById(id),
    enabled: Boolean(id),
  });

  useLayoutEffect(() => {
    navigation.setOptions(
      glossyStackHeaderOptions({
        title: query.data?.name ?? t('insurance.detail.title'),
        accent: THEME.accent,
        soft: THEME.soft,
        softEnd: THEME.softEnd,
        titleColor: THEME.accent,
        icon: Shield,
        backAccessibilityLabel: t('insurance.detail.backA11y'),
      }),
    );
  }, [navigation, query.data?.name, t]);

  if (query.isLoading) {
    return (
      <View style={styles.screen}>
        <LoadingState title={t('insurance.detail.loading')} />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.screen}>
        <ErrorState
          title={t('insurance.detail.notFoundTitle')}
          message={
            query.error instanceof Error
              ? query.error.message
              : t('insurance.detail.notFoundMessage')
          }
          actionLabel={t('common.retry')}
          onAction={() => {
            void query.refetch();
          }}
        />
      </View>
    );
  }

  const payer = query.data;
  const websiteUrl = payer.website?.trim()
    ? payer.website.startsWith('http')
      ? payer.website
      : `https://${payer.website}`
    : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AnimatedSection index={0}>
        <View style={[styles.hero, shadow.soft]}>
          <LinearGradientFill
            colors={[
              { offset: '0%', color: THEME.soft },
              { offset: '100%', color: THEME.softEnd },
            ]}
            angle={140}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroIconWrap}>
            <Shield color={THEME.accent} size={28} strokeWidth={2.25} />
          </View>
          <AppText variant="screenTitle" style={styles.heroTitle}>
            {payer.name}
          </AppText>
          <View style={styles.typePill}>
            <AppText variant="caption" style={styles.typePillLabel}>
              {t('insurance.orgType')}
            </AppText>
          </View>
        </View>
      </AnimatedSection>

      <AnimatedSection index={1}>
        <View style={styles.card}>
          <AppText variant="caption" color="brand" style={styles.sectionEyebrow}>
            {t('insurance.detail.contact')}
          </AppText>

          {payer.address ? (
            <View style={styles.row}>
              <MapPin color={palette.textSecondary} size={18} />
              <AppText variant="body" style={styles.rowText}>
                {payer.address}
              </AppText>
            </View>
          ) : null}

          {payer.phone ? (
            <Button
              variant="plain"
              style={styles.row}
              onPress={() => void Linking.openURL(`tel:${payer.phone}`)}
              accessibilityRole="link"
              accessibilityLabel={t('insurance.detail.callA11y', { phone: payer.phone })}
            >
              <Phone color={THEME.accent} size={18} />
              <AppText variant="body" style={[styles.rowText, styles.linkText]}>
                {payer.phone}
              </AppText>
            </Button>
          ) : null}

          {payer.email ? (
            <Button
              variant="plain"
              style={styles.row}
              onPress={() => void Linking.openURL(`mailto:${payer.email}`)}
              accessibilityRole="link"
              accessibilityLabel={t('insurance.detail.emailA11y', { email: payer.email })}
            >
              <Mail color={THEME.accent} size={18} />
              <AppText variant="body" style={[styles.rowText, styles.linkText]}>
                {payer.email}
              </AppText>
            </Button>
          ) : null}

          {websiteUrl ? (
            <Button
              variant="plain"
              style={styles.row}
              onPress={() => void Linking.openURL(websiteUrl)}
              accessibilityRole="link"
              accessibilityLabel={t('insurance.detail.websiteA11y')}
            >
              <Globe color={THEME.accent} size={18} />
              <AppText variant="body" style={[styles.rowText, styles.linkText]} numberOfLines={2}>
                {payer.website}
              </AppText>
            </Button>
          ) : null}

          {!payer.address && !payer.phone && !payer.email && !websiteUrl ? (
            <AppText variant="body" style={styles.emptyContact}>
              {t('insurance.detail.noContact')}
            </AppText>
          ) : null}
        </View>
      </AnimatedSection>

      <AnimatedSection index={2}>
        <AppText variant="caption" style={styles.footnote}>
          {t('insurance.detail.footnote')}
        </AppText>
      </AnimatedSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    gap: spacing.sm,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: THEME.accent,
  },
  typePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typePillLabel: {
    color: THEME.accent,
    fontWeight: '600',
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    gap: spacing.md,
    ...shadow.soft,
  },
  sectionEyebrow: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowText: {
    flex: 1,
    color: textColors.primary,
  },
  linkText: {
    color: THEME.accent,
    fontWeight: '500',
  },
  emptyContact: {
    color: textColors.secondary,
  },
  footnote: {
    color: textColors.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
