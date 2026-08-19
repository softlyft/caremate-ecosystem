import { router } from 'expo-router';
import { CalendarClock, ChevronRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { useTranslation } from '@/domains/localization';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, radius, shadow } from '@/theme';

export function HealthTimelineCard() {
  const { t } = useTranslation();
  const isGuest = useIsGuest();

  return (
    <View style={[styles.wrapper, shadow.soft]}>
      <LinearGradientFill
        colors={[
          { offset: '0%', color: '#EEF2FF' },
          { offset: '48%', color: '#E0E7FF' },
          { offset: '100%', color: '#F8FAFC' },
        ]}
        angle={128}
        style={styles.container}
      >
        <View style={styles.accentBar} />
        <View style={styles.iconWrap}>
          <CalendarClock color="#4338CA" size={20} strokeWidth={2.2} />
        </View>
        <View style={styles.copy}>
          <AppText variant="body" style={styles.title}>
            {t('home.timeline.title')}
          </AppText>
          <AppText variant="caption" style={styles.subtitle}>
            {isGuest ? t('home.timeline.guestBody') : t('home.timeline.screenSubtitle')}
          </AppText>
          <Button
            onPress={() =>
              router.push(isGuest ? '/(auth)/login' : '/(app)/timeline')
            }
            style={styles.cta}
            variant="plain"
            accessibilityRole="button"
            accessibilityLabel={isGuest ? t('common.signIn') : t('home.timeline.cta')}
          >
            <AppText variant="caption" style={styles.ctaText}>
              {isGuest ? t('common.signIn') : t('home.timeline.cta')}
            </AppText>
            <ChevronRight size={16} color="#4338CA" strokeWidth={2.4} />
          </Button>
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
    borderColor: 'rgba(67, 56, 202, 0.14)',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: '#4338CA',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    color: '#4338CA',
    opacity: 0.72,
  },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ctaText: {
    fontWeight: '700',
    color: '#4338CA',
  },
});
