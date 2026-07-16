import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { SectionHeader } from '@/components/motion/SectionHeader';
import { AppText } from '@/components/ui/AppText';
import { HEALTH_CATEGORIES } from '@/features/home/constants';
import { layoutSpacing, palette, radius, shadow } from '@/theme';

export type HealthCategoryId = (typeof HEALTH_CATEGORIES)[number]['id'];

interface HealthCategoriesRowProps {
  showHeader?: boolean;
  showSeeAll?: boolean;
  /** When false, skip horizontal padding (use inside an already-padded screen). */
  padded?: boolean;
  /** Show an All chip for in-place filtering (Learn). */
  showAllOption?: boolean;
  /** Currently selected category id, or null for All. */
  selectedCategoryId?: HealthCategoryId | null;
  /**
   * When provided, chips filter in place instead of navigating.
   * Pass `null` when All is selected.
   */
  onSelectCategory?: (categoryId: HealthCategoryId | null) => void;
}

export function HealthCategoriesRow({
  showHeader = true,
  showSeeAll = true,
  padded = true,
  showAllOption = false,
  selectedCategoryId = null,
  onSelectCategory,
}: HealthCategoriesRowProps) {
  const horizontalPad = padded ? layoutSpacing.screenHorizontal : 0;
  const isFilterMode = typeof onSelectCategory === 'function';

  const handleCategoryPress = (categoryId: HealthCategoryId) => {
    if (isFilterMode) {
      onSelectCategory(categoryId);
      return;
    }
    router.push(`/(app)/(tabs)/articles?category=${categoryId}`);
  };

  const handleAllPress = () => {
    onSelectCategory?.(null);
  };

  return (
    <View style={styles.container}>
      {showHeader ? (
        <SectionHeader
          title="Explore topics"
          subtitle="Health categories"
          onSeeAll={showSeeAll ? () => router.push('/(app)/(tabs)/articles') : undefined}
        />
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { paddingHorizontal: horizontalPad }]}
        decelerationRate="fast"
      >
        {showAllOption ? (
          <PressableScale
            style={[
              styles.chip,
              styles.allChip,
              selectedCategoryId === null ? styles.chipSelected : null,
            ]}
            onPress={handleAllPress}
          >
            <AppText variant="categoryPill">All</AppText>
          </PressableScale>
        ) : null}
        {HEALTH_CATEGORIES.map((category) => {
          const selected = selectedCategoryId === category.id;
          return (
            <PressableScale
              key={category.id}
              style={[styles.chip, selected ? styles.chipSelected : null, shadow.soft]}
              onPress={() => handleCategoryPress(category.id)}
            >
              <View style={[styles.emojiWrap, { backgroundColor: category.color }]}>
                <Text style={styles.emoji}>{category.emoji}</Text>
              </View>
              <AppText variant="categoryPill">{category.name}</AppText>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: layoutSpacing.betweenSections,
  },
  row: {
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  allChip: {
    backgroundColor: palette.surface,
  },
  chipSelected: {
    borderWidth: 2,
    borderColor: palette.primary,
    backgroundColor: palette.primaryLight,
  },
  emojiWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 16,
  },
});
