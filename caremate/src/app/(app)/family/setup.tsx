import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { useFamilySetupStore } from '@/domains/family';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function FamilySetupScreen() {
  const insets = useSafeAreaInsets();
  const setIsParent = useFamilySetupStore((s) => s.setIsParent);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <AppText variant="sectionTitle">Are you a parent?</AppText>
      <AppText variant="subtitle">
        If yes, we will help you add your kids and optionally connect your spouse to your household.
        Each parent keeps their own CareMate profile and health data.
      </AppText>

      <View style={styles.card}>
        <Button
          label="Yes, I'm a parent"
          onPress={() => {
            setIsParent(true);
            router.push('/(app)/family/kids-count');
          }}
        />
        <Button
          label="Not right now"
          variant="secondary"
          onPress={() => {
            setIsParent(false);
            router.replace('/(app)/family');
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
});
