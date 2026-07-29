import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { ArrowUpRight, Megaphone, Sparkles } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/form-controls';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { trackCatalogClick, trackCatalogImpression, useAdForSlot } from '@/domains/ads';
import type { AdSlotId, ResolvedCatalogAd } from '@/domains/ads/types';
import { AdMobBanner } from '@/features/ads/AdMobBanner';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { fontFamily, layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

type AdSlotProps = {
  slotId: AdSlotId;
};

export function AdSlot({ slotId }: AdSlotProps) {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const query = useAdForSlot(slotId);
  const resolved = query.data ?? null;
  const tracked = useRef<string | null>(null);

  useEffect(() => {
    if (!resolved || resolved.kind !== 'catalog') return;
    const key = `${resolved.campaignId}:${resolved.creativeId}:${resolved.slotId}`;
    if (tracked.current === key) return;
    tracked.current = key;
    void trackCatalogImpression({
      userId: isGuest ? null : userId,
      ad: resolved,
    });
  }, [resolved, isGuest, userId]);

  if (!resolved) {
    return null;
  }

  if (resolved.kind === 'admob') {
    return <AdMobBanner slotId={resolved.slotId} unitId={resolved.unitId} />;
  }

  return <CatalogBanner ad={resolved} userId={isGuest ? null : userId} />;
}

function CatalogBanner({ ad, userId }: { ad: ResolvedCatalogAd; userId: string | null }) {
  const sponsored = ad.source === 'sponsored';
  const badge = ad.badgeLabel?.trim() || (sponsored ? 'Sponsored' : 'From CareMate');
  const ctaLabel = ad.ctaLabel?.trim() || (sponsored ? 'Learn more' : 'Open');
  const hasCta = Boolean(ad.ctaHref?.trim());
  const imageUrl = ad.imageUrl?.trim() || null;

  const theme = sponsored
    ? {
        gradient: [
          { offset: '0%', color: '#EFF6FF' },
          { offset: '55%', color: '#DBEAFE' },
          { offset: '100%', color: '#FFFFFF' },
        ],
        border: 'rgba(37, 99, 235, 0.25)',
        accent: '#2563EB',
        accentSoft: '#DBEAFE',
        badgeBg: '#DBEAFE',
        badgeText: '#1D4ED8',
        ctaBg: '#2563EB',
        blob: 'rgba(96, 165, 250, 0.28)',
        Icon: Megaphone,
      }
    : {
        gradient: [
          { offset: '0%', color: '#F0F9FF' },
          { offset: '50%', color: '#E0F2FE' },
          { offset: '100%', color: '#FFFFFF' },
        ],
        border: 'rgba(2, 132, 199, 0.22)',
        accent: '#0284C7',
        accentSoft: '#E0F2FE',
        badgeBg: '#E0F2FE',
        badgeText: '#0369A1',
        ctaBg: '#0284C7',
        blob: 'rgba(56, 189, 248, 0.25)',
        Icon: Sparkles,
      };

  const onPress = () => {
    void trackCatalogClick({ userId, ad });
    const href = ad.ctaHref?.trim();
    if (href) {
      router.push(href as Href);
    }
  };

  const content = (
    <View style={[styles.shell, shadow.soft, { borderColor: theme.border }]}>
      <LinearGradientFill colors={theme.gradient} angle={128} style={styles.gradient}>
        <View style={[styles.blobLarge, { backgroundColor: theme.blob }]} />
        <View style={[styles.blobSmall, { backgroundColor: theme.accentSoft }]} />
        <View style={[styles.accentBar, { backgroundColor: theme.accent }]} />

        <View style={styles.topRow}>
          <View style={[styles.badgePill, { backgroundColor: theme.badgeBg }]}>
            <AppText variant="caption" style={[styles.badgeText, { color: theme.badgeText }]}>
              Ad · {badge}
            </AppText>
          </View>
          {ad.advertiserName ? (
            <AppText variant="caption" style={styles.advertiser} numberOfLines={1}>
              {ad.advertiserName}
            </AppText>
          ) : null}
        </View>

        <View style={styles.mainRow}>
          <View style={styles.copy}>
            <AppText variant="cardTitle" style={styles.title} numberOfLines={2}>
              {ad.title}
            </AppText>
            <AppText variant="quickActionSubtitle" style={styles.body} numberOfLines={3}>
              {ad.body}
            </AppText>
          </View>

          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.iconBadge, { backgroundColor: theme.accentSoft }]}>
              <theme.Icon color={theme.accent} size={22} strokeWidth={2.2} />
            </View>
          )}
        </View>

        {hasCta ? (
          <View style={[styles.ctaButton, { backgroundColor: theme.ctaBg }]}>
            <AppText variant="caption" style={styles.ctaLabel}>
              {ctaLabel}
            </AppText>
            <ArrowUpRight color="#FFFFFF" size={15} strokeWidth={2.5} />
          </View>
        ) : null}
      </LinearGradientFill>
    </View>
  );

  if (hasCta) {
    return (
      <Button
        accessibilityRole="button"
        accessibilityLabel={`${badge}: ${ad.title}`}
        onPress={onPress}
        variant="plain"
      >
        {content}
      </Button>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: palette.background,
  },
  gradient: {
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  blobLarge: {
    position: 'absolute',
    top: -48,
    right: -36,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  blobSmall: {
    position: 'absolute',
    bottom: -28,
    left: -24,
    width: 88,
    height: 88,
    borderRadius: 44,
    opacity: 0.7,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  badgeText: {
    fontFamily: fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    fontSize: 10,
  },
  advertiser: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: 12,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    zIndex: 1,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: palette.text,
    letterSpacing: -0.2,
  },
  body: {
    color: palette.textSecondary,
    lineHeight: 20,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  ctaButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    zIndex: 1,
  },
  ctaLabel: {
    color: '#FFFFFF',
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
