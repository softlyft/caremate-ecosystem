import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { getAdMobRequestOptions, shouldReloadBannerOnForeground } from '@/domains/ads/consent';
import { trackAdMobClick, trackAdMobImpression } from '@/domains/ads/resolver';
import type { AdSlotId } from '@/domains/ads/types';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';
import { palette, radius, spacing } from '@/theme';

type AdMobBannerProps = {
  slotId: AdSlotId;
  unitId: string;
};

type BannerModule = typeof import('react-native-google-mobile-ads');

export function AdMobBanner({ slotId, unitId }: AdMobBannerProps) {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const tracked = useRef(false);
  const [adsModule, setAdsModule] = useState<BannerModule | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    void import('react-native-google-mobile-ads')
      .then((mod) => {
        if (active) setAdsModule(mod);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!adsModule || !shouldReloadBannerOnForeground()) {
      return;
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setReloadKey((key) => key + 1);
      }
    });
    return () => sub.remove();
  }, [adsModule]);

  if (failed || !adsModule) {
    return null;
  }

  const { BannerAd, BannerAdSize } = adsModule;

  const onImpression = () => {
    if (tracked.current) return;
    tracked.current = true;
    void trackAdMobImpression({
      userId: isGuest ? null : userId,
      slotId,
      unitId,
    });
  };

  const onAdOpened = () => {
    void trackAdMobClick({
      userId: isGuest ? null : userId,
      slotId,
      unitId,
    });
  };

  return (
    <View style={styles.shell} accessibilityRole="image" accessibilityLabel="Advertisement">
      <BannerAd
        key={reloadKey}
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={getAdMobRequestOptions()}
        onAdLoaded={onImpression}
        onAdFailedToLoad={() => setFailed(true)}
        onAdOpened={onAdOpened}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingVertical: spacing.xs,
    minHeight: Platform.OS === 'android' ? 50 : 0,
  },
});
