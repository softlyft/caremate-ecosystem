import { router } from 'expo-router';
import { BadgeCheck, Building2, MapPin, Star } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { SectionHeader } from '@/components/motion/SectionHeader';
import { AppText } from '@/components/ui/AppText';
import type { Provider } from '@/types';
import { layoutSpacing, palette, radius, shadow } from '@/theme';

interface NearbyProvidersRowProps {
  providers: Provider[];
}

const CARD_GRADIENTS = [
  [
    { offset: '0%', color: '#DBEAFE' },
    { offset: '100%', color: '#EFF6FF' },
  ],
  [
    { offset: '0%', color: '#CCFBF1' },
    { offset: '100%', color: '#F0FDFA' },
  ],
  [
    { offset: '0%', color: '#EDE9FE' },
    { offset: '100%', color: '#F5F3FF' },
  ],
  [
    { offset: '0%', color: '#FFEDD5' },
    { offset: '100%', color: '#FFF7ED' },
  ],
] as const;

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

export function NearbyProvidersRow({ providers }: NearbyProvidersRowProps) {
  return (
    <View style={styles.container}>
      <SectionHeader
        title="Healthcare near you"
        subtitle="Nearby"
        onSeeAll={() => router.push('/(app)/(tabs)/providers')}
      />
      {providers.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <MapPin color={palette.primary} size={22} />
          </View>
          <AppText variant="cardTitle" style={styles.emptyTitle}>
            Discover care nearby
          </AppText>
          <AppText variant="body" style={styles.emptyBody}>
            Connect to find hospitals, clinics, and pharmacies around you.
          </AppText>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          decelerationRate="fast"
        >
          {providers.map((provider, index) => {
            const rating = readRating(provider);
            const verified = isVerified(provider);
            const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
            const iconColor = index % 2 === 0 ? palette.blueAccent : palette.primary;

            return (
              <PressableScale
                key={provider.id}
                style={[styles.card, shadow.soft]}
                onPress={() => router.push(`/(app)/providers/${provider.id}`)}
              >
                <LinearGradientFill colors={[...gradient]} style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <Building2 color={iconColor} size={22} strokeWidth={2} />
                  </View>
                </LinearGradientFill>
                <View style={styles.cardBody}>
                  <AppText variant="providerName" numberOfLines={2} style={styles.name}>
                    {provider.name}
                  </AppText>
                  <View style={styles.metaRow}>
                    {rating != null ? (
                      <View style={styles.ratingPill}>
                        <Star color={palette.warning} size={12} fill={palette.warning} />
                        <AppText variant="providerMeta">{rating.toFixed(1)}</AppText>
                      </View>
                    ) : null}
                    <View style={styles.distancePill}>
                      <MapPin color={palette.textSecondary} size={12} />
                      <AppText variant="providerMeta">
                        {provider.distanceKm != null
                          ? `${provider.distanceKm.toFixed(1)} km`
                          : '—'}
                      </AppText>
                    </View>
                  </View>
                  {verified ? (
                    <View style={styles.verified}>
                      <BadgeCheck color={palette.primary} size={14} />
                      <AppText variant="providerMeta" color="brand">
                        Verified
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </PressableScale>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: layoutSpacing.betweenSections,
  },
  row: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    gap: 14,
  },
  card: {
    width: 196,
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.divider,
    overflow: 'hidden',
  },
  cardHeader: {
    height: 72,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    padding: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  cardBody: {
    padding: 14,
    gap: 10,
  },
  name: {
    fontSize: 15,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyCard: {
    marginHorizontal: layoutSpacing.screenHorizontal,
    padding: layoutSpacing.cardPadding + 4,
    borderRadius: radius.xxl,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.divider,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
