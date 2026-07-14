import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { HEALTH_CATEGORIES } from '@/features/home/constants';
import { layoutSpacing, palette, radius } from '@/theme';

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
        <View style={[styles.header, { paddingHorizontal: horizontalPad }]}>
          <AppText variant="sectionTitle">Health Categories</AppText>
          {showSeeAll ? (
            <Pressable onPress={() => router.push('/(app)/(tabs)/articles')}>
              <AppText variant="seeAll">See All</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { paddingHorizontal: horizontalPad }]}
      >
        {showAllOption ? (
          <Pressable
            style={[
              styles.chip,
              styles.allChip,
              selectedCategoryId === null ? styles.chipSelected : null,
            ]}
            onPress={handleAllPress}
          >
            <AppText variant="categoryPill">All</AppText>
          </Pressable>
        ) : null}
        {HEALTH_CATEGORIES.map((category) => {
          const selected = selectedCategoryId === category.id;
          return (
            <Pressable
              key={category.id}
              style={[
                styles.chip,
                { backgroundColor: category.color },
                selected ? styles.chipSelected : null,
              ]}
              onPress={() => handleCategoryPress(category.id)}
            >
              <Text style={styles.emoji}>{category.emoji}</Text>
              <AppText variant="categoryPill">{category.name}</AppText>
            </Pressable>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: layoutSpacing.sectionTitleToContent,
  },
  row: {
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  allChip: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  chipSelected: {
    borderWidth: 2,
    borderColor: palette.primary,
  },
  emoji: {
    fontSize: 16,
  },
});
