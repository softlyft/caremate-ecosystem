import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { MapPin, Pill, ShieldPlus, Stethoscope } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

type QuickActionDef = {
  titleKey: string;
  subtitleKey: string;
  backgroundColor: string;
  iconColor: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  onPress?: () => void;
};

const ACTIONS: QuickActionDef[] = [
  {
    titleKey: 'home.quickActions.emergency.title',
    subtitleKey: 'home.quickActions.emergency.subtitle',
    backgroundColor: palette.primaryLight,
    iconColor: palette.primary,
    icon: ShieldPlus,
    onPress: () => router.push('/(app)/emergency/edit'),
  },
  {
    titleKey: 'home.quickActions.nearby.title',
    subtitleKey: 'home.quickActions.nearby.subtitle',
    backgroundColor: palette.blueLight,
    iconColor: palette.blueAccent,
    icon: MapPin,
    onPress: () => router.push('/(app)/(tabs)/providers'),
  },
  {
    titleKey: 'home.quickActions.symptoms.title',
    subtitleKey: 'home.quickActions.symptoms.subtitle',
    backgroundColor: '#F3F4F6',
    iconColor: palette.textSecondary,
    icon: Stethoscope,
    comingSoon: true,
  },
  {
    titleKey: 'home.quickActions.medication.title',
    subtitleKey: 'home.quickActions.medication.subtitle',
    backgroundColor: '#F3F4F6',
    iconColor: palette.textSecondary,
    icon: Pill,
    comingSoon: true,
  },
];

export function QuickActionsGrid() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <AppText variant="sectionTitle">Quick Actions</AppText>
      <View style={styles.grid}>
        {ACTIONS.map((action) => (
          <Pressable
            key={action.titleKey}
            disabled={action.comingSoon}
            onPress={action.onPress}
            style={[
              styles.card,
              shadow.soft,
              { backgroundColor: action.backgroundColor, opacity: action.comingSoon ? 0.75 : 1 },
            ]}
          >
            <action.icon color={action.iconColor} size={28} />
            <AppText variant="quickActionTitle" numberOfLines={2} style={styles.centeredText}>
              {t(action.titleKey)}
            </AppText>
            <AppText variant="quickActionSubtitle" numberOfLines={2} style={styles.centeredText}>
              {t(action.subtitleKey)}
            </AppText>
            {action.comingSoon ? (
              <View style={styles.badge}>
                <AppText variant="comingSoon">{t('common.comingSoon')}</AppText>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: layoutSpacing.betweenSections,
    gap: layoutSpacing.sectionTitleToContent,
    paddingHorizontal: layoutSpacing.screenHorizontal,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '48%',
    minHeight: 140,
    borderRadius: radius.xxl,
    padding: layoutSpacing.cardPadding,
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
});
