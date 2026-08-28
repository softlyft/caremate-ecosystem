import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import {
  Button,
  FormActions,
  FormField,
  FormNotice,
  FormStack,
  Input,
} from '@/components/ui/form-controls';
import { Screen } from '@/components/ui/screen-states';
import { maxChildrenForTier } from '@/domains/billing/entitlements';
import { useFamilySetupStore } from '@/domains/family';
import { useTranslation } from '@/domains/localization';
import { usePremiumTier } from '@/hooks/use-premium-state';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function FamilyKidsCountScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tier = usePremiumTier();
  const maxKids = maxChildrenForTier(tier);
  const childCount = useFamilySetupStore((s) => s.childCount);
  const setChildCount = useFamilySetupStore((s) => s.setChildCount);
  const [value, setValue] = useState(String(childCount));

  function continueNext() {
    const parsed = Number.parseInt(value, 10) || 0;
    if (parsed > maxKids) {
      Alert.alert(t('family.childLimitTitle'), t('family.kidsCountLimitHint'));
      return;
    }
    const count = Math.max(0, Math.min(maxKids, parsed));
    setChildCount(count);
    if (count === 0) {
      router.push('/(app)/family/review');
      return;
    }
    router.push('/(app)/family/child/0');
  }

  return (
    <Screen padded={false} tone="background">
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="sectionTitle">{t('family.kidsCount.title')}</AppText>
        <AppText variant="subtitle">{t('family.kidsCount.subtitle')}</AppText>
        <FormNotice>{t('family.kidsCountLimitHint')}</FormNotice>

        <View style={styles.card}>
          <FormStack>
            <FormField label={t('family.kidsCount.title')}>
              <Input
                placeholder={t('family.kidsCount.placeholder')}
                keyboardType="number-pad"
                value={value}
                onChangeText={setValue}
              />
            </FormField>
            <FormActions>
              <Button label={t('common.continue')} onPress={continueNext} />
            </FormActions>
          </FormStack>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: layoutSpacing.screenHorizontal,
    gap: spacing.md,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
  },
});
