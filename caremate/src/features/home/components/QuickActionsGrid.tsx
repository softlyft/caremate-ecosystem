import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { MapPin, Pill, ShieldPlus, Stethoscope } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

type QuickAction = {
  title: string;
  subtitle: string;
  backgroundColor: string;
  iconColor: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  onPress?: () => void;
};

const ACTIONS: QuickAction[] = [
  {
    title: 'Emergency Profile',
    subtitle: 'Emergency health card',
    backgroundColor: palette.primaryLight,
    iconColor: palette.primary,
    icon: ShieldPlus,
    onPress: () => router.push('/(app)/emergency/edit'),
  },
  {
    title: 'Nearby Care',
    subtitle: 'Hospitals & pharmacies',
    backgroundColor: palette.blueLight,
    iconColor: palette.blueAccent,
    icon: MapPin,
    onPress: () => router.push('/(app)/(tabs)/providers'),
  },
  {
    title: 'Symptoms',
    subtitle: 'Check your symptoms',
    backgroundColor: '#F3F4F6',
    iconColor: palette.textSecondary,
    icon: Stethoscope,
    comingSoon: true,
  },
  {
    title: 'Medication',
    subtitle: 'Dose reminders',
    backgroundColor: '#F3F4F6',
    iconColor: palette.textSecondary,
    icon: Pill,
    comingSoon: true,
  },
];

export function QuickActionsGrid() {
  return (
    <View style={styles.container}>
      <AppText variant="sectionTitle">Quick Actions</AppText>
      <View style={styles.grid}>
        {ACTIONS.map((action) => (
          <Pressable
            key={action.title}
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
              {action.title}
            </AppText>
            <AppText variant="quickActionSubtitle" numberOfLines={2} style={styles.centeredText}>
              {action.subtitle}
            </AppText>
            {action.comingSoon ? (
              <View style={styles.badge}>
                <AppText variant="comingSoon">Soon</AppText>
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
