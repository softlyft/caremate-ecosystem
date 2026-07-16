import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { layoutSpacing, palette } from '@/theme';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
};

export function SectionHeader({
  title,
  subtitle,
  onSeeAll,
  seeAllLabel = 'See all',
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        {subtitle ? (
          <AppText variant="caption" color="brand" style={styles.eyebrow}>
            {subtitle}
          </AppText>
        ) : null}
        <AppText variant="sectionTitle">{title}</AppText>
      </View>
      {onSeeAll ? (
        <Pressable style={styles.seeAll} onPress={onSeeAll} hitSlop={8}>
          <AppText variant="seeAll">{seeAllLabel}</AppText>
          <ChevronRight color={palette.primary} size={16} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: layoutSpacing.screenHorizontal,
    marginBottom: layoutSpacing.sectionTitleToContent,
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingBottom: 2,
  },
});
