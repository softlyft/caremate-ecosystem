import { useQuery } from '@tanstack/react-query';
import { Lightbulb } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import { getDailyHealthTip } from '@/features/home/utils/daily-health-tip';
import { layoutSpacing, palette, radius, shadow } from '@/theme';

interface DailyHealthTipProps {
  userKey?: string;
}

export function DailyHealthTip({ userKey = 'guest' }: DailyHealthTipProps) {
  const { t } = useTranslation();
  const { data: tip } = useQuery({
    queryKey: ['daily-health-tip', userKey],
    queryFn: () => getDailyHealthTip(userKey),
  });

  if (!tip) {
    return null;
  }

  return (
    <View style={[styles.wrapper, shadow.soft]}>
      <LinearGradientFill
        colors={[
          { offset: '0%', color: '#F0FDFA' },
          { offset: '55%', color: '#CCFBF1' },
          { offset: '100%', color: '#FFFFFF' },
        ]}
        style={styles.container}
      >
        <View style={styles.accentBar} />
        <View style={styles.iconWrap}>
          <Lightbulb color="#CA8A04" fill="#FDE047" size={20} />
        </View>
        <View style={styles.content}>
          <AppText variant="caption" color="brand" style={styles.label}>
            {tip.emoji} {tip.categoryName} · {t('home.dailyTip.label')}
          </AppText>
          <AppText variant="body" style={styles.tip}>
            {tip.tip}
          </AppText>
        </View>
      </LinearGradientFill>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: layoutSpacing.screenHorizontal,
    marginBottom: layoutSpacing.sectionTitleToContent,
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
    borderColor: 'rgba(13, 148, 136, 0.14)',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: palette.primary,
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
    borderColor: 'rgba(13, 148, 136, 0.1)',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  label: {
    letterSpacing: 0.2,
  },
  tip: {
    lineHeight: 23,
  },
});
