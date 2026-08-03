import { router } from 'expo-router';
import { Newspaper } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from '@/components/motion/SectionHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { useTranslation } from '@/domains/localization';
import { HEALTH_CATEGORIES } from '@/features/home/constants';
import { layoutSpacing, palette, radius, shadow } from '@/theme';

export type HealthCategoryId = (typeof HEALTH_CATEGORIES)[number]['id'];

interface HealthCategoriesRowProps {
  showHeader?: boolean;
  showSeeAll?: boolean;
  /** When false, skip horizontal padding (use inside an already-padded screen). */
  padded?: boolean;
  /** Show a News chip for in-place filtering (Learn). Selected when category is null. */
  showNewsOption?: boolean;
  /** Currently selected category id, or null for News. */
  selectedCategoryId?: HealthCategoryId | null;
  /**
   * When provided, chips filter in place instead of navigating.
   * Pass `null` when News is selected.
   */
  onSelectCategory?: (categoryId: HealthCategoryId | null) => void;
}

export function HealthCategoriesRow({
  showHeader = true,
  showSeeAll = true,
  padded = true,
  showNewsOption = false,
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

  const handleNewsPress = () => {
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
        {showNewsOption ? (
          <Button
            style={[
              styles.chip,
              styles.newsChip,
              selectedCategoryId === null ? styles.newsChipSelected : null,
              shadow.soft,
            ]}
            onPress={handleNewsPress}
            variant="plain"
          >
            <View style={[styles.emojiWrap, { backgroundColor: palette.blueLight }]}>
              <Newspaper color={palette.brandBlue} size={15} strokeWidth={2.25} />
            </View>
            <AppText variant="categoryPill">{t('learn.news')}</AppText>
          </Button>
        ) : null}
        {HEALTH_CATEGORIES.map((category) => {
          const selected = isFilterMode && selectedCategoryId === category.id;
          return (
            <Button
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
              variant="plain"
            >
              <View style={[styles.emojiWrap, { backgroundColor: category.color }]}>
                <Text style={styles.emoji}>{category.emoji}</Text>
              </View>
              <AppText variant="categoryPill" style={selected ? { color: category.accent } : null}>
                {category.shortLabel}
              </AppText>
            </Button>
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
  newsChip: {
    backgroundColor: palette.surface,
  },
  newsChipSelected: {
    borderWidth: 2,
    borderColor: palette.brandBlue,
    backgroundColor: palette.blueLight,
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
