import { router } from 'expo-router';
import { LayoutGrid } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { SectionHeader } from '@/components/motion/SectionHeader';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/domains/localization';
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
  const { t } = useTranslation();
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
    <View style={[styles.container, isFilterMode ? styles.containerFlush : null]}>
      {showHeader ? (
        <SectionHeader
          title={t('home.healthCategories.title')}
          subtitle={t('home.healthCategories.subtitle')}
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
              selectedCategoryId === null ? styles.allChipSelected : null,
              shadow.soft,
            ]}
            onPress={handleAllPress}
          >
            <View style={[styles.emojiWrap, { backgroundColor: palette.primaryLight }]}>
              <LayoutGrid color={palette.primary} size={15} strokeWidth={2.25} />
            </View>
            <AppText variant="categoryPill">{t('common.all')}</AppText>
          </PressableScale>
        ) : null}
        {HEALTH_CATEGORIES.map((category) => {
          const selected = isFilterMode && selectedCategoryId === category.id;
          return (
            <PressableScale
              key={category.id}
              style={[
                styles.chip,
                selected
                  ? {
                      borderWidth: 2,
                      borderColor: category.accent,
                      backgroundColor: category.color,
                    }
                  : null,
                shadow.soft,
              ]}
              onPress={() => handleCategoryPress(category.id)}
            >
              <View style={[styles.emojiWrap, { backgroundColor: category.color }]}>
                <Text style={styles.emoji}>{category.emoji}</Text>
              </View>
              <AppText variant="categoryPill" style={selected ? { color: category.accent } : null}>
                {category.name}
              </AppText>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: layoutSpacing.sectionTitleToContent,
  },
  containerFlush: {
    marginBottom: 0,
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
  allChipSelected: {
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
