import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button, Input } from '@/components/ui/form-controls';
import { useFamilySetupStore } from '@/domains/family';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function FamilyKidsCountScreen() {
  const insets = useSafeAreaInsets();
  const childCount = useFamilySetupStore((s) => s.childCount);
  const setChildCount = useFamilySetupStore((s) => s.setChildCount);
  const [value, setValue] = useState(String(childCount));

  function continueNext() {
    const count = Math.max(0, Math.min(12, Number.parseInt(value, 10) || 0));
    setChildCount(count);
    if (count === 0) {
      router.push('/(app)/family/review');
      return;
    }
    router.push('/(app)/family/child/0');
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <AppText variant="sectionTitle">How many kids?</AppText>
      <AppText variant="subtitle">You can add more children later from your family hub.</AppText>

      <View style={styles.card}>
        <Input
          placeholder="Number of kids"
          keyboardType="number-pad"
          value={value}
          onChangeText={setValue}
        />
        <Button label="Continue" onPress={continueNext} />
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
