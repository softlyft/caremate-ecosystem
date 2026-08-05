import { usePathname, type Href } from 'expo-router';
import { BookOpen, ChevronLeft, X, type LucideIcon } from 'lucide-react-native';
import { Platform, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/form-controls';

import { AppText } from '@/components/ui/AppText';
import { resolveBackFallbackHref, routerBackOrFallback } from '@/domains/navigation';
import { translateText } from '@/domains/localization';
import { fontFamily, palette, radius, shadow } from '@/theme';

type GlossyHeaderConfig = {
  title: string;
  accent?: string;
  soft?: string;
  softEnd?: string;
  titleColor?: string;
  icon?: LucideIcon;
  backAccessibilityLabel?: string;
  /** Used when cold-start restore left no history for `router.back()`. */
  backFallbackHref?: Href;
  modal?: boolean;
};

function GlossyBackButton({
  accent,
  soft,
  accessibilityLabel,
  modal,
  backFallbackHref,
}: {
  accent: string;
  soft: string;
  accessibilityLabel: string;
  modal?: boolean;
  backFallbackHref?: Href;
}) {
  const pathname = usePathname();
  const Icon = modal ? X : ChevronLeft;
  const fallback = backFallbackHref ?? resolveBackFallbackHref(pathname);

  return (
    <Button
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => routerBackOrFallback(fallback)}
      style={[
        styles.backButton,
        { backgroundColor: soft, borderColor: `${accent}33` },
        shadow.soft,
      ]}
      scale={0.94}
      hitSlop={8}
      variant="plain"
    >
      <Icon color={accent} size={modal ? 18 : 22} strokeWidth={2.4} />
    </Button>
  );
}

function GlossyHeaderTitle({
  title,
  accent,
  soft,
  titleColor,
  icon: Icon = BookOpen,
}: {
  title: string;
  accent: string;
  soft: string;
  titleColor: string;
  icon?: LucideIcon;
}) {
  return (
    <View style={styles.titleWrap}>
      <View style={[styles.titleIcon, { backgroundColor: soft, borderColor: `${accent}28` }]}>
        <Icon color={accent} size={14} strokeWidth={2.4} />
      </View>
      <AppText
        variant="cardTitle"
        numberOfLines={1}
        style={[styles.titleText, { color: titleColor }]}
      >
        {title}
      </AppText>
    </View>
  );
}

/** Shared glossy header used by Learn article screens (and reusable elsewhere). */
export function glossyStackHeaderOptions({
  title,
  accent = palette.primary,
  soft = palette.primaryLight,
  softEnd = '#F0FDFA',
  titleColor = palette.primaryDark,
  icon = BookOpen,
  backAccessibilityLabel = translateText('en', 'learn.goBack'),
  backFallbackHref,
  modal = false,
}: GlossyHeaderConfig) {
  return {
    headerShown: true as const,
    title,
    headerShadowVisible: false,
    headerBackVisible: false,
    headerTitleAlign: 'left' as const,
    ...(modal ? { presentation: 'modal' as const } : {}),
    headerStyle: {
      backgroundColor: modal ? soft : softEnd,
    },
    headerTintColor: accent,
    headerLeftContainerStyle: styles.headerLeftContainer,
    headerTitleContainerStyle: styles.headerTitleContainer,
    headerLeft: () => (
      <GlossyBackButton
        accent={accent}
        soft={soft}
        accessibilityLabel={backAccessibilityLabel}
        modal={modal}
        backFallbackHref={backFallbackHref}
      />
    ),
    headerTitle: () => (
      <GlossyHeaderTitle
        title={title}
        accent={accent}
        soft={soft}
        titleColor={titleColor}
        icon={icon}
      />
    ),
  };
}

export function learnArticleHeaderOptions(title = translateText('en', 'learn.article')) {
  return glossyStackHeaderOptions({
    title,
    accent: palette.primary,
    soft: palette.primaryLight,
    softEnd: '#F0FDFA',
    titleColor: palette.primaryDark,
    icon: BookOpen,
    backAccessibilityLabel: translateText('en', 'learn.backToLearn'),
    backFallbackHref: '/(app)/(tabs)/articles',
  });
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
