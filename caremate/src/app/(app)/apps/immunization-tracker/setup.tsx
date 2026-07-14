import { router, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

/**
 * Children are managed in Family — this route only redirects users there.
 */
export default function ImmunizationSetupScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'Family children' });
  }, [navigation]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <AppText variant="cardTitle">Children come from Family</AppText>
        <AppText variant="subtitle">
          You can’t add a child here. Set up your family profile and add kids with date of birth,
          then return to Immunization Tracker.
        </AppText>
        <Button label="Go to family setup" onPress={() => router.replace('/(app)/family/setup')} />
        <Button
          label="Open family"
          variant="secondary"
          onPress={() => router.replace('/(app)/family')}
        />
        <Button label="Back to tracker" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
    paddingBottom: spacing.xl,
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
