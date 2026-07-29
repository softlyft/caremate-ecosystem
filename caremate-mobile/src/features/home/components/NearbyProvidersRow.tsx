import { router } from 'expo-router';
import { BadgeCheck, Building2, ChevronRight, MapPin, Navigation, Star } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { SectionHeader } from '@/components/motion/SectionHeader';
import { AppText } from '@/components/ui/AppText';
import { Button, Card } from '@/components/ui/form-controls';
import { useTranslation } from '@/domains/localization';
import type { Provider } from '@/types';
import { layoutSpacing, palette, radius, shadow } from '@/theme';

interface NearbyProvidersRowProps {
  providers: Provider[];
  /** True when we have no usable location and no cached providers to show. */
  locationNeeded?: boolean;
  /** OS will not re-prompt; CTA should open Settings. */
  permissionBlocked?: boolean;
  onEnableLocation?: () => void;
  enablePending?: boolean;
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

export function NearbyProvidersRow({
  providers,
  locationNeeded = false,
  permissionBlocked = false,
  onEnableLocation,
  enablePending = false,
}: NearbyProvidersRowProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <SectionHeader
        title={t('home.nearby.title')}
        subtitle={t('home.nearby.subtitle')}
        onSeeAll={() => router.push('/(app)/(tabs)/providers')}
      />
      {providers.length === 0 && locationNeeded ? (
        <Button
          style={[styles.locationCardWrapper, shadow.card]}
          onPress={() => onEnableLocation?.()}
          variant="plain"
        >
          <LinearGradientFill
            colors={[
              { offset: '0%', color: '#0D9488' },
              { offset: '55%', color: '#0F766E' },
              { offset: '100%', color: '#115E59' },
            ]}
            angle={120}
            style={styles.locationCard}
          >
            <View style={styles.locationMeshTop} />
            <View style={styles.locationMeshBottom} />
            <View style={styles.locationTopRow}>
              <View style={styles.locationIconWrap}>
                <Navigation color="#FFFFFF" size={24} strokeWidth={2} />
              </View>
              <View style={styles.locationCopy}>
                <AppText variant="quickActionTitle" style={styles.locationTitle}>
                  {t('home.nearby.locationNeeded.title')}
                </AppText>
                <AppText variant="quickActionSubtitle" style={styles.locationBody}>
                  {permissionBlocked
                    ? t('home.nearby.locationNeeded.blockedBody')
                    : t('home.nearby.locationNeeded.body')}
                </AppText>
              </View>
            </View>
            <View style={styles.locationCta}>
              <AppText variant="button" style={{ color: palette.primary }}>
                {enablePending
                  ? t('nearby.locationNeeded.enabling')
                  : permissionBlocked
                    ? t('home.nearby.locationNeeded.openSettings')
                    : t('home.nearby.locationNeeded.cta')}
              </AppText>
              <ChevronRight color={palette.primary} size={16} strokeWidth={2.5} />
            </View>
          </LinearGradientFill>
        </Button>
      ) : providers.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <MapPin color={palette.primary} size={22} />
          </View>
          <AppText variant="cardTitle" style={styles.emptyTitle}>
            {t('nearby.empty.title')}
          </AppText>
          <AppText variant="body" style={styles.emptyBody}>
            {t('nearby.empty.message')}
          </AppText>
        </Card>
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
              <Button
                key={provider.id}
                style={[styles.card, shadow.soft]}
                onPress={() => router.push(`/(app)/providers/${provider.id}`)}
                variant="plain"
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
                        {provider.distanceKm != null ? `${provider.distanceKm.toFixed(1)} km` : '—'}
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
              </Button>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: layoutSpacing.sectionTitleToContent,
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
  locationCardWrapper: {
    marginHorizontal: layoutSpacing.screenHorizontal,
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  locationCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: layoutSpacing.cardPadding,
    gap: 14,
  },
  locationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  locationMeshTop: {
    position: 'absolute',
    top: -46,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  locationMeshBottom: {
    position: 'absolute',
    bottom: -56,
    left: 90,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  locationIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  locationCopy: {
    flex: 1,
    gap: 4,
  },
  locationTitle: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  locationBody: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    lineHeight: 19,
  },
  locationCta: {
    alignSelf: 'flex-start',
    // Indent past the 48px icon + 14px gap so the pill lines up with the text column
    marginLeft: 62,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  emptyCard: {
    marginHorizontal: layoutSpacing.screenHorizontal,
    backgroundColor: palette.surface,
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
