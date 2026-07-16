import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import {
  BadgeCheck,
  Heart,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Star,
} from 'lucide-react-native';
import { useLayoutEffect } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { glossyStackHeaderOptions } from '@/components/navigation/glossyStackHeader';
import { AppText } from '@/components/ui/AppText';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { getProviderTypeTheme } from '@/domains/providers/components/NearbyProviderCard';
import { providerRepository } from '@/domains/providers/repository';
import { formatProviderType, type ProviderType } from '@/domains/providers/types';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';
import type { Provider } from '@/types';

function readRating(provider: Provider): number | null {
  const raw = provider.attributes.rating ?? provider.attributes.average_rating;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isVerified(provider: Provider): boolean {
  const raw = provider.attributes.verified ?? provider.attributes.is_verified;
  return raw === true || raw === 'true' || raw === 1;
}

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.providers, id],
    queryFn: () => providerRepository.findById(id),
    enabled: Boolean(id),
  });

  const favoriteMutation = useMutation({
    mutationFn: () => providerRepository.toggleFavorite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providers });
      query.refetch();
    },
  });

  const provider = query.data ?? null;
  const theme = getProviderTypeTheme(provider?.type ?? 'hospital');
  const Icon = theme.icon;

  useLayoutEffect(() => {
    const shortTitle = provider?.name
      ? provider.name.length > 26
        ? `${provider.name.slice(0, 26).trim()}…`
        : provider.name
      : 'Provider';

    navigation.setOptions(
      glossyStackHeaderOptions({
        title: shortTitle,
        accent: theme.accent,
        soft: theme.soft,
        softEnd: theme.softEnd,
        titleColor: theme.accent,
        icon: Icon,
        backAccessibilityLabel: 'Back to Nearby',
      }),
    );
  }, [Icon, navigation, provider?.name, theme.accent, theme.soft, theme.softEnd]);

  if (query.isLoading) {
    return <LoadingState title="Loading provider..." />;
  }

  if (!provider) {
    return <ErrorState title="Provider not found" />;
  }

  const detail = provider;
  const rating = readRating(detail);
  const verified = isVerified(detail);
  const typeLabel = formatProviderType(detail.type as ProviderType);
  const hasCoords = detail.latitude != null && detail.longitude != null;
  const distanceLabel =
    detail.distanceKm != null ? `${detail.distanceKm.toFixed(1)} km away` : null;

  function openDirections() {
    if (!detail.latitude || !detail.longitude) {
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${detail.latitude},${detail.longitude}`;
    void Linking.openURL(url);
  }

  function callProvider() {
    if (!detail.phone) {
      return;
    }
    void Linking.openURL(`tel:${detail.phone}`);
  }

  function emailProvider() {
    if (!detail.email) {
      return;
    }
    void Linking.openURL(`mailto:${detail.email}`);
  }

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <AnimatedSection index={0}>
          <View style={[styles.heroShell, shadow.card]}>
            <LinearGradientFill
              colors={[
                { offset: '0%', color: theme.soft },
                { offset: '50%', color: theme.soft },
                { offset: '100%', color: theme.softEnd },
              ]}
              angle={130}
              style={styles.hero}
            >
              <View style={styles.heroBlob} />
              <View style={[styles.heroBlobSm, { backgroundColor: theme.accent, opacity: 0.12 }]} />

              <View style={[styles.heroIconRing, { borderColor: `${theme.accent}33` }]}>
                <View style={[styles.heroIconInner, { backgroundColor: `${theme.accent}18` }]}>
                  <Icon color={theme.accent} size={28} strokeWidth={2.2} />
                </View>
              </View>

              <AppText variant="caption" style={[styles.heroEyebrow, { color: theme.accent }]}>
                {typeLabel}
              </AppText>
              <AppText variant="screenTitle" style={[styles.heroTitle, { color: theme.accent }]}>
                {detail.name}
              </AppText>

              <View style={styles.heroMeta}>
                {distanceLabel ? (
                  <View style={styles.metaPill}>
                    <MapPin color={theme.accent} size={13} />
                    <AppText variant="caption" style={{ color: theme.accent, fontWeight: '600' }}>
                      {distanceLabel}
                    </AppText>
                  </View>
                ) : null}
                {rating != null ? (
                  <View style={styles.metaPill}>
                    <Star color={palette.warning} size={13} fill={palette.warning} />
                    <AppText variant="caption" style={{ fontWeight: '600' }}>
                      {rating.toFixed(1)}
                    </AppText>
                  </View>
                ) : null}
                {verified ? (
                  <View style={[styles.metaPill, { backgroundColor: palette.primaryLight }]}>
                    <BadgeCheck color={palette.primary} size={13} />
                    <AppText variant="caption" style={{ color: palette.primary, fontWeight: '600' }}>
                      Verified
                    </AppText>
                  </View>
                ) : null}
              </View>
            </LinearGradientFill>
          </View>
        </AnimatedSection>

        <AnimatedSection index={1}>
          <View style={[styles.card, shadow.soft]}>
            <AppText variant="caption" color="brand" style={styles.sectionEyebrow}>
              Contact
            </AppText>

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: theme.soft }]}>
                <MapPin color={theme.accent} size={18} />
              </View>
              <View style={styles.infoCopy}>
                <AppText variant="caption" style={styles.infoLabel}>
                  Address
                </AppText>
                <AppText variant="body" style={styles.infoValue}>
                  {detail.address ?? 'Address unavailable'}
                </AppText>
              </View>
            </View>

            <View style={styles.divider} />

            <PressableScale
              disabled={!detail.phone}
              onPress={callProvider}
              style={styles.infoRow}
            >
              <View style={[styles.infoIcon, { backgroundColor: theme.soft }]}>
                <Phone color={theme.accent} size={18} />
              </View>
              <View style={styles.infoCopy}>
                <AppText variant="caption" style={styles.infoLabel}>
                  Phone
                </AppText>
                <AppText
                  variant="body"
                  style={[styles.infoValue, detail.phone ? { color: theme.accent } : null]}
                >
                  {detail.phone ?? 'Phone unavailable'}
                </AppText>
              </View>
            </PressableScale>

            <View style={styles.divider} />

            <PressableScale
              disabled={!detail.email}
              onPress={emailProvider}
              style={styles.infoRow}
            >
              <View style={[styles.infoIcon, { backgroundColor: theme.soft }]}>
                <Mail color={theme.accent} size={18} />
              </View>
              <View style={styles.infoCopy}>
                <AppText variant="caption" style={styles.infoLabel}>
                  Email
                </AppText>
                <AppText
                  variant="body"
                  style={[styles.infoValue, detail.email ? { color: theme.accent } : null]}
                >
                  {detail.email ?? 'Email unavailable'}
                </AppText>
              </View>
            </PressableScale>
          </View>
        </AnimatedSection>

        <AnimatedSection index={2}>
          <View style={styles.actions}>
            <PressableScale
              style={[
                styles.primaryCta,
                { backgroundColor: theme.accent },
                !hasCoords ? styles.ctaDisabled : null,
                shadow.soft,
              ]}
              disabled={!hasCoords}
              onPress={openDirections}
            >
              <Navigation color="#FFFFFF" size={18} strokeWidth={2.25} />
              <AppText variant="button" style={styles.primaryCtaLabel}>
                Get directions
              </AppText>
            </PressableScale>

            <PressableScale
              style={[
                styles.secondaryCta,
                {
                  backgroundColor: theme.soft,
                  borderColor: theme.accent,
                },
              ]}
              onPress={() => favoriteMutation.mutate()}
              disabled={favoriteMutation.isPending}
            >
              <Heart
                color={theme.accent}
                size={18}
                strokeWidth={2.25}
                fill={detail.isFavorite ? theme.accent : 'transparent'}
              />
              <AppText variant="button" style={{ color: theme.accent }}>
                {detail.isFavorite ? 'Remove favorite' : 'Save favorite'}
              </AppText>
            </PressableScale>
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
    paddingBottom: 40,
    gap: spacing.md,
  },
  heroShell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  hero: {
    padding: layoutSpacing.cardPadding + 4,
    gap: 8,
    minHeight: 188,
  },
  heroBlob: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  heroBlobSm: {
    position: 'absolute',
    bottom: 24,
    left: -36,
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  heroIconRing: {
    width: 60,
    height: 60,
    borderRadius: radius.xl,
    padding: 3,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.72)',
    marginBottom: 4,
  },
  heroIconInner: {
    flex: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: 4,
  },
  sectionEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    color: palette.textSecondary,
    fontSize: 11,
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 21,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
    marginLeft: 54,
  },
  actions: {
    gap: 12,
  },
  primaryCta: {
    minHeight: 54,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryCtaLabel: {
    color: '#FFFFFF',
  },
  secondaryCta: {
    minHeight: 54,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
});
