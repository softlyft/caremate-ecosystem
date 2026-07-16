import { router } from 'expo-router';
import { ChevronRight, ShieldPlus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import { layoutSpacing, palette, radius, shadow } from '@/theme';

export function EmergencyBanner() {
  const { t } = useTranslation();

  return (
    <PressableScale
      style={[styles.wrapper, shadow.card]}
      onPress={() => router.push('/(app)/emergency/edit')}
    >
      <LinearGradientFill
        colors={[
          { offset: '0%', color: '#7C3AED' },
          { offset: '50%', color: '#6D28D9' },
          { offset: '100%', color: '#5B21B6' },
        ]}
        angle={120}
        style={styles.banner}
      >
        <View style={styles.iconWrap}>
          <ShieldPlus color="#FFFFFF" size={26} strokeWidth={2} />
        </View>
        <View style={styles.copy}>
          <AppText variant="quickActionTitle" style={styles.title}>
            {t('home.emergency.title')}
          </AppText>
          <AppText variant="quickActionSubtitle" style={styles.body}>
            {t('home.emergency.body')}
          </AppText>
        </View>
        <View style={styles.cta}>
          <AppText variant="button" style={{ color: palette.brandPurple }}>
            {t('home.emergency.cta')}
          </AppText>
          <ChevronRight color={palette.brandPurple} size={16} strokeWidth={2.5} />
        </View>
      </LinearGradientFill>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: layoutSpacing.screenHorizontal,
    marginBottom: layoutSpacing.betweenSections,
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  banner: {
    padding: layoutSpacing.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  body: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    lineHeight: 19,
  },
  cta: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
