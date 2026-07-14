import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Search } from 'lucide-react-native';

import { layoutSpacing, palette, radius, shadow } from '@/theme';
import { fontFamily, textColors } from '@/theme/typography';

export function HomeSearchBar() {
  return (
    <Pressable
      style={styles.container}
      accessibilityRole="search"
      accessibilityLabel="Search CareMate"
      onPress={() => router.push('/(app)/search')}
    >
      <View style={styles.inner}>
        <Search color={textColors.placeholder} size={20} />
        <Text style={styles.placeholder} numberOfLines={1}>
          Search articles, providers, tools...
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: layoutSpacing.screenHorizontal,
    marginBottom: layoutSpacing.betweenSections,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.divider,
    ...shadow.card,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutSpacing.cardPadding,
    gap: 12,
  },
  placeholder: {
    flex: 1,
    flexShrink: 1,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: textColors.placeholder,
  },
});
