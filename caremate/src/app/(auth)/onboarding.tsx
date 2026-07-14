import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { images } from '@/constants/assets';
import { palette, radius, spacing } from '@/theme/colors';

const STEPS = [
  {
    title: 'Your health, always with you',
    description: 'CareMate keeps your emergency profile available even without internet.',
  },
  {
    title: 'Find care nearby',
    description: 'Discover hospitals, clinics, pharmacies, and more around you.',
  },
  {
    title: 'Stay informed',
    description: 'Read trusted health articles and bookmark what matters to you.',
  },
];

export default function OnboardingScreen() {
  function handleGetStarted() {
    router.replace('/(app)/(tabs)');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={images.logo} style={styles.logo} contentFit="contain" />
        {STEPS.map((step) => (
          <View key={step.title} style={styles.card}>
            <AppText variant="cardTitle">{step.title}</AppText>
            <AppText variant="quickActionSubtitle">{step.description}</AppText>
          </View>
        ))}
      </View>
      <Button label="Get Started" onPress={handleGetStarted} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
    backgroundColor: palette.background,
  },
  content: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  logo: {
    width: 180,
    height: 54,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: palette.divider,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: palette.surface,
  },
});
