import { Image } from 'expo-image';
import { Bell } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { images } from '@/constants/assets';
import { getGreeting } from '@/features/home/constants';
import { layoutSpacing, palette, spacing } from '@/theme';

const LOGO_ASPECT = 1774 / 887;
const LOGO_HEIGHT = 48;

type HomeHeaderProps = {
  firstName?: string | null;
};

export function HomeHeader({ firstName }: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const name = firstName?.trim();
  const greeting = name ? `${getGreeting()}, ${name}! 👋` : `${getGreeting()}! 👋`;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topRow}>
        <Image
          source={images.logoHeader}
          style={styles.logo}
          contentFit="contain"
          contentPosition="left center"
        />
        <Pressable style={styles.notificationButton} accessibilityLabel="Notifications">
          <Bell color={palette.textSecondary} size={24} strokeWidth={2} />
          <View style={styles.unreadDot} />
        </Pressable>
      </View>

      <View style={styles.copy}>
        <AppText variant="heroGreeting">{greeting}</AppText>
        <AppText variant="subtitle" style={styles.subtitle} color="#9CA3AF">
          Your health. Our priority
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: layoutSpacing.screenHorizontal,
    paddingRight: layoutSpacing.screenHorizontal,
    marginBottom: layoutSpacing.sectionTitleToContent,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  logo: {
    flex: 1,
    height: LOGO_HEIGHT,
    maxWidth: LOGO_HEIGHT * LOGO_ASPECT,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
  },
  copy: {
    gap: 0,
  },
  subtitle: {
    marginTop: layoutSpacing.greetingToWelcome,
  },
  notificationButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  unreadDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: palette.danger,
    borderWidth: 1.5,
    borderColor: palette.background,
  },
});
