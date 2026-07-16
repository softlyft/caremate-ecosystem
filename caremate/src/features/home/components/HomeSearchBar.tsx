import { router } from 'expo-router';
import { Search, Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { useTranslation } from '@/domains/localization';
import { layoutSpacing, palette, radius, shadow } from '@/theme';
import { fontFamily, textColors } from '@/theme/typography';

export function HomeSearchBar() {
  const { t } = useTranslation();

  return (
    <PressableScale
      style={styles.container}
      accessibilityRole="search"
      accessibilityLabel={t('home.searchA11y')}
      onPress={() => router.push('/(app)/search')}
    >
      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <Search color={palette.primary} size={18} strokeWidth={2.5} />
        </View>
        <Text style={styles.placeholder} numberOfLines={1}>
          {t('common.search')}
        </Text>
        <View style={styles.sparkleWrap}>
          <Sparkles color={palette.primary} size={14} />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: layoutSpacing.screenHorizontal,
    marginBottom: layoutSpacing.betweenSections,
    borderRadius: radius.xxl,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.12)',
    ...shadow.card,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    flex: 1,
    flexShrink: 1,
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: textColors.placeholder,
  },
  sparkleWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
