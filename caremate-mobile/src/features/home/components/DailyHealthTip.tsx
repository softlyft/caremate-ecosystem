import { useQuery } from '@tanstack/react-query';
import { Lightbulb, Share2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { alert } from '@/components/ui/AppDialogHost';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { useTranslation } from '@/domains/localization';
import { DailyInsightShareCard } from '@/features/home/components/DailyInsightShareCard';
import { getDailyHealthTip } from '@/features/home/utils/daily-health-tip';
import { shareDailyInsightImage } from '@/features/home/utils/share-daily-insight';
import { layoutSpacing, palette, radius, shadow } from '@/theme';

interface DailyHealthTipProps {
  userKey?: string;
}

export function DailyHealthTip({ userKey = 'guest' }: DailyHealthTipProps) {
  const { t } = useTranslation();
  const shareRef = useRef<ViewShotRef>(null);
  const sharingRef = useRef(false);
  const [sharing, setSharing] = useState(false);
  const { data: tip } = useQuery({
    queryKey: ['daily-health-tip', userKey],
    queryFn: () => getDailyHealthTip(userKey),
  });

  if (!tip) {
    return null;
  }

  async function onShare() {
    if (sharingRef.current) {
      return;
    }
    sharingRef.current = true;
    setSharing(true);
    try {
      // Let the off-screen card paint before capture.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const result = await shareDailyInsightImage(shareRef);
      if (!result.ok) {
        void alert(t('home.dailyTip.shareFailedTitle'), t('home.dailyTip.shareFailedMessage'));
      }
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  }

  return (
    <>
      <View style={[styles.wrapper, shadow.soft]}>
        <LinearGradientFill
          colors={[
            { offset: '0%', color: palette.blueLight },
            { offset: '55%', color: palette.brandBlueLight },
            { offset: '100%', color: palette.background },
          ]}
          style={styles.container}
        >
          <View style={styles.accentBar} />
          <View style={styles.iconWrap}>
            <Lightbulb color="#CA8A04" fill="#FDE047" size={20} />
          </View>
          <View style={styles.content}>
            <View style={styles.labelRow}>
              <AppText variant="caption" style={styles.label}>
                {tip.emoji} {tip.categoryName} · {t('home.dailyTip.label')}
              </AppText>
              <Button
                accessibilityLabel={t('home.dailyTip.shareA11y')}
                accessibilityState={{ busy: sharing }}
                disabled={sharing}
                hitSlop={10}
                onPress={() => {
                  void onShare();
                }}
                style={styles.shareBtn}
                variant="plain"
              >
                <Share2
                  color={palette.brandBlue}
                  size={16}
                  strokeWidth={2.25}
                  pointerEvents="none"
                />
              </Button>
            </View>
            <AppText variant="body" style={styles.tip}>
              {tip.tip}
            </AppText>
          </View>
        </LinearGradientFill>
      </View>

      {/* Off-screen branded canvas for capture — sibling so overflow:hidden won't clip it. */}
      <ViewShot
        ref={shareRef}
        style={styles.captureHost}
        options={{ format: 'png', quality: 1 }}
      >
        <DailyInsightShareCard
          tip={tip.tip}
          categoryName={tip.categoryName}
          emoji={tip.emoji}
          label={t('home.dailyTip.label')}
          footer={t('home.dailyTip.shareFooter')}
        />
      </ViewShot>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: layoutSpacing.screenHorizontal,
    marginBottom: layoutSpacing.homeHeroStack,
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  container: {
    borderRadius: radius.xxl,
    padding: layoutSpacing.cardPadding,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.16)',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: palette.brandBlue,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.12)',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    flex: 1,
    letterSpacing: 0.2,
    color: palette.brandBlue,
  },
  shareBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.12)',
  },
  tip: {
    lineHeight: 23,
  },
  captureHost: {
    position: 'absolute',
    left: -4000,
    top: 0,
    // Keep visible to the capture pipeline (opacity:0 can yield blank bitmaps on Android).
  },
});
