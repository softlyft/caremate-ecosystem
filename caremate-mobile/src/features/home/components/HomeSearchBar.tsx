import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { SearchField } from '@/components/ui/search-field';
import { useTranslation } from '@/domains/localization';
import { palette, radius } from '@/theme';

export function HomeSearchBar() {
  const { t } = useTranslation();

  return (
    <SearchField
      variant="pressable"
      placeholder={t('common.search')}
      accessibilityLabel={t('home.searchA11y')}
      onPress={() => router.push('/(app)/search')}
      trailing={
        <View style={styles.sparkleWrap}>
          <Sparkles color={palette.primary} size={14} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  sparkleWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
