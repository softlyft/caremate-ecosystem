import { router } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import { Platform, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText } from '@/components/ui/AppText';
import type { MiniAppId } from '@/mini-apps/_kit/registry';
import { getMiniAppTheme } from '@/mini-apps/_kit/theme';
import { fontFamily, radius, shadow } from '@/theme';

type MiniAppHeaderConfig = {
  appId: MiniAppId;
  title: string;
  /** Shown only as accessibility hint; visual back is icon pill */
  backAccessibilityLabel?: string;
  modal?: boolean;
};

function MiniAppBackButton({
  accent,
  soft,
  modal,
  accessibilityLabel,
}: {
  accent: string;
  soft: string;
  modal?: boolean;
  accessibilityLabel: string;
}) {
  const Icon = modal ? X : ChevronLeft;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => router.back()}
      style={[styles.backButton, { backgroundColor: soft, borderColor: `${accent}33` }, shadow.soft]}
      scale={0.94}
      hitSlop={8}
    >
      <Icon color={accent} size={modal ? 18 : 22} strokeWidth={2.4} />
    </PressableScale>
  );
}

function MiniAppHeaderTitle({
  appId,
  title,
  accent,
  soft,
}: {
  appId: MiniAppId;
  title: string;
  accent: string;
  soft: string;
}) {
  const theme = getMiniAppTheme(appId);
  const Icon = theme.icon;

  return (
    <View style={styles.titleWrap}>
      <View style={[styles.titleIcon, { backgroundColor: soft, borderColor: `${accent}28` }]}>
        <Icon color={accent} size={14} strokeWidth={2.4} />
      </View>
      <AppText
        variant="cardTitle"
        numberOfLines={1}
        style={[styles.titleText, { color: theme.titleColor }]}
      >
        {title}
      </AppText>
    </View>
  );
}

/**
 * Glossy stack header options for mini-app screens.
 * Soft tinted bar, pill back control, icon + title.
 */
export function miniAppHeaderOptions({
  appId,
  title,
  backAccessibilityLabel = 'Go back',
  modal = false,
}: MiniAppHeaderConfig) {
  const theme = getMiniAppTheme(appId);

  return {
    headerShown: true as const,
    title,
    headerShadowVisible: false,
    headerBackVisible: false,
    headerTitleAlign: 'left' as const,
    ...(modal ? { presentation: 'modal' as const } : {}),
    headerStyle: {
      backgroundColor: modal ? theme.backgroundColor : theme.softEnd,
    },
    headerTintColor: theme.color,
    headerLeftContainerStyle: styles.headerLeftContainer,
    headerTitleContainerStyle: styles.headerTitleContainer,
    headerLeft: () => (
      <MiniAppBackButton
        accent={theme.color}
        soft={theme.backgroundColor}
        modal={modal}
        accessibilityLabel={backAccessibilityLabel}
      />
    ),
    headerTitle: () => (
      <MiniAppHeaderTitle
        appId={appId}
        title={title}
        accent={theme.color}
        soft={theme.backgroundColor}
      />
    ),
  };
}

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginLeft: Platform.OS === 'ios' ? 4 : 0,
    marginRight: 8,
  },
  headerLeftContainer: {
    paddingRight: 4,
  },
  headerTitleContainer: {
    marginLeft: 4,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '88%',
  },
  titleIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  titleText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 17,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
});
