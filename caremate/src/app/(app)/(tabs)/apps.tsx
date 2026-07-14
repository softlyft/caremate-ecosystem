import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { MINI_APPS } from '@/mini-apps/_kit/registry';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

export default function AppsTabScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
    >
      <AppText variant="screenTitle">Apps</AppText>
      <AppText variant="subtitle" style={styles.subtitle}>
        Standalone health tools inside CareMate
      </AppText>

      <View style={styles.grid}>
        {MINI_APPS.map((app) => {
          const Icon = app.icon;
          return (
            <Pressable
              key={app.id}
              disabled={!app.available}
              style={[
                styles.card,
                shadow.soft,
                { backgroundColor: app.backgroundColor, opacity: app.available ? 1 : 0.6 },
              ]}
              onPress={() => router.push(app.route)}
            >
              <View style={[styles.iconWrap, { backgroundColor: palette.background }]}>
                <Icon color={app.color} size={28} />
              </View>
              <AppText variant="quickActionTitle" style={styles.centered}>
                {app.name}
              </AppText>
              <AppText variant="quickActionSubtitle" style={styles.centered}>
                {app.description}
              </AppText>
              {!app.available ? <AppText variant="comingSoon">Coming soon</AppText> : null}
            </Pressable>
          );
        })}
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
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  subtitle: {
    marginBottom: spacing.sm,
  },
  grid: {
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.xxl,
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
});
