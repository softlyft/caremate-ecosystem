import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { getAdMobRequestOptions, shouldReloadBannerOnForeground } from '@/domains/ads/consent';
import {
  trackAdMobClick,
  trackAdMobImpression,
  trackAdMobLoadError,
  trackAdMobRequest,
} from '@/domains/ads/resolver';
import type { AdSlotId } from '@/domains/ads/types';
import { useCurrentUserId, useIsGuest } from '@/hooks/use-current-user-id';

type AdMobBannerProps = {
  slotId: AdSlotId;
  unitId: string;
};

type BannerModule = typeof import('react-native-google-mobile-ads');

export function AdMobBanner({ slotId, unitId }: AdMobBannerProps) {
  const userId = useCurrentUserId();
  const isGuest = useIsGuest();
  const eventUserId = isGuest ? null : userId;
  const tracked = useRef(false);
  const requestedKey = useRef<string | null>(null);
  const [adsModule, setAdsModule] = useState<BannerModule | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [bannerWidth, setBannerWidth] = useState(0);

  useEffect(() => {
    let active = true;
    void import('react-native-google-mobile-ads')
      .then((mod) => {
        if (active) setAdsModule(mod);
      })
      .catch((error) => {
        if (active) {
          setFailed(true);
          void trackAdMobLoadError({
            userId: eventUserId,
            slotId,
            unitId,
            error,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [eventUserId, slotId, unitId]);

  useEffect(() => {
    if (!adsModule || !shouldReloadBannerOnForeground()) {
      return;
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        tracked.current = false;
        requestedKey.current = null;
        setFailed(false);
        setLoaded(false);
        setReloadKey((key) => key + 1);
      }
    });
    return () => sub.remove();
  }, [adsModule]);

  useEffect(() => {
    if (failed || !adsModule || bannerWidth <= 0) {
      return;
    }
    const key = `${reloadKey}:${unitId}:${bannerWidth}`;
    if (requestedKey.current === key) {
      return;
    }
    requestedKey.current = key;
    void trackAdMobRequest({
      userId: eventUserId,
      slotId,
      unitId,
    });
  }, [adsModule, bannerWidth, eventUserId, failed, reloadKey, slotId, unitId]);

  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== bannerWidth) {
      setBannerWidth(nextWidth);
    }
  };

  if (failed || !adsModule) {
    return null;
  }

  const { BannerAd, BannerAdSize } = adsModule;

  const onAdLoaded = () => {
    setLoaded(true);
    if (tracked.current) return;
    tracked.current = true;
    void trackAdMobImpression({
      userId: eventUserId,
      slotId,
      unitId,
    });
  };

  const onAdOpened = () => {
    void trackAdMobClick({
      userId: eventUserId,
      slotId,
      unitId,
    });
  };

  const onAdFailedToLoad = (error: unknown) => {
    setFailed(true);
    void trackAdMobLoadError({
      userId: eventUserId,
      slotId,
      unitId,
      error,
    });
  };

  return (
    <View
      onLayout={onLayout}
      style={[styles.container, loaded ? null : styles.collapsed]}
      accessibilityRole="image"
      accessibilityLabel="Advertisement"
    >
      {bannerWidth > 0 ? (
        <BannerAd
          key={`${reloadKey}-${bannerWidth}`}
          unitId={unitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          width={bannerWidth}
          requestOptions={getAdMobRequestOptions()}
          onAdLoaded={onAdLoaded}
          onAdFailedToLoad={onAdFailedToLoad}
          onAdOpened={onAdOpened}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Stretch to the same inset width as catalog ad cards (parent already applies screen padding).
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
});
