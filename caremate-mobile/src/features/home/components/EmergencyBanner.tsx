import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, ShieldPlus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { QUERY_KEYS } from '@/constants/config';
import { emergencyRepository } from '@/domains/emergency/repository';
import { useTranslation } from '@/domains/localization';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import type { EmergencyProfile } from '@/types';
import { layoutSpacing, palette, radius, shadow } from '@/theme';

function hasAnyEmergencyInput(profile: EmergencyProfile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.fullName.trim() ||
      profile.bloodGroup?.trim() ||
      profile.genotype?.trim() ||
      profile.allergies.length ||
      profile.currentMedications.length ||
      profile.chronicConditions.length ||
      profile.emergencyContacts.length ||
      profile.preferredHospital?.trim() ||
      profile.insuranceProvider?.trim() ||
      profile.notes?.trim(),
  );
}

export function EmergencyBanner() {
  const { t } = useTranslation();
  const userId = useCurrentUserId();
  const emergencyQuery = useQuery({
    queryKey: [...QUERY_KEYS.emergencyProfile, userId],
    queryFn: () => emergencyRepository.findByUserId(userId),
  });
  const hasInput = hasAnyEmergencyInput(emergencyQuery.data);
  const ctaLabel = hasInput ? t('home.emergency.ctaUpdate') : t('home.emergency.cta');

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
        <View style={styles.topRow}>
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
        </View>
        <View style={styles.cta}>
          <AppText variant="button" style={{ color: palette.brandPurple }}>
            {ctaLabel}
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
    marginBottom: layoutSpacing.sectionTitleToContent,
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  banner: {
    padding: layoutSpacing.cardPadding,
    gap: 14,
  },
  topRow: {
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
});
