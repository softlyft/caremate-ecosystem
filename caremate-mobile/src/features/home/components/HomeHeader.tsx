import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bell, MessageCircle } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { images } from '@/constants/assets';
import { useTranslation } from '@/domains/localization';
import { useUnreadMessageCount } from '@/domains/messaging/hooks';
import { useUnreadNotificationCount } from '@/domains/notifications/hooks';
import { getGreeting } from '@/features/home/constants';
import { useIsGuest } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

const LOGO_ASPECT = 1774 / 887;
const LOGO_HEIGHT = 44;

type HomeHeaderProps = {
  firstName?: string | null;
};

export function HomeHeader({ firstName }: HomeHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isGuest = useIsGuest();
  const unreadQuery = useUnreadNotificationCount();
  const unreadMessagesQuery = useUnreadMessageCount();
  const hasUnread = (unreadQuery.data ?? 0) > 0;
  const hasUnreadMessages = !isGuest && (unreadMessagesQuery.data ?? 0) > 0;
  const name = firstName?.trim();
  const greetingBase = getGreeting({
    morning: t('home.greeting.morning'),
    afternoon: t('home.greeting.afternoon'),
    evening: t('home.greeting.evening'),
  });
  const greeting = name ? t('home.greetingNamed', { greeting: greetingBase, name }) : greetingBase;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.meshTop} />
      <View style={styles.meshAccent} />

      <Animated.View entering={FadeIn.duration(400)} style={styles.topRow}>
        <Image
          source={images.logoHeader}
          style={styles.logo}
          contentFit="contain"
          contentPosition="left center"
        />
        <View style={styles.actions}>
          {!isGuest ? (
            <PressableScale
              style={styles.iconButton}
              accessibilityLabel={t('common.messages')}
              accessibilityHint={t('messages.openHint')}
              onPress={() => router.push('/(app)/messages')}
            >
              <MessageCircle color={palette.text} size={22} strokeWidth={2} />
              {hasUnreadMessages ? <View style={styles.unreadDot} /> : null}
            </PressableScale>
          ) : null}
          <PressableScale
            style={styles.iconButton}
            accessibilityLabel={t('common.notifications')}
            accessibilityHint={t('home.notifications.openHint')}
            onPress={() => router.push('/(app)/notifications')}
          >
            <Bell color={palette.text} size={22} strokeWidth={2} />
            {hasUnread ? <View style={styles.unreadDot} /> : null}
          </PressableScale>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(500).springify()} style={styles.copy}>
        <AppText variant="heroGreeting" style={styles.greeting}>
          {`${greeting} 👋`}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: layoutSpacing.screenHorizontal,
    paddingRight: layoutSpacing.screenHorizontal,
    marginBottom: layoutSpacing.sectionTitleToContent,
    gap: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  meshTop: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: palette.primaryLight,
    opacity: 0.7,
  },
  meshAccent: {
    position: 'absolute',
    top: 20,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: palette.blueLight,
    opacity: 0.55,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    zIndex: 1,
  },
  logo: {
    flex: 1,
    height: LOGO_HEIGHT,
    maxWidth: LOGO_HEIGHT * LOGO_ASPECT,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
  },
  copy: {
    zIndex: 1,
  },
  greeting: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: radius.full,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.divider,
    ...shadow.soft,
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.danger,
    borderWidth: 1.5,
    borderColor: palette.background,
  },
});
