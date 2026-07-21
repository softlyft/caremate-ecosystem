import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { QUERY_KEYS } from '@/constants/config';
import { maxChildrenForTier } from '@/domains/billing/entitlements';
import { familyRepository, useFamilySetupStore } from '@/domains/family';
import { useTranslation } from '@/domains/localization';
import { profileRepository } from '@/domains/profile/repository';
import { usePremiumTier } from '@/hooks/use-premium-state';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export default function FamilyReviewScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const tier = usePremiumTier();
  const children = useFamilySetupStore((s) => s.children);
  const childCount = useFamilySetupStore((s) => s.childCount);
  const reset = useFamilySetupStore((s) => s.reset);
  const [saving, setSaving] = useState(false);

  const draftChildren = children.slice(0, childCount);

  async function saveFamily() {
    if (draftChildren.length > maxChildrenForTier(tier)) {
      Alert.alert(t('family.childLimitTitle'), t('family.childLimitMessage'));
      return;
    }
    setSaving(true);
    try {
      const profile = await profileRepository.findByUserId(userId);
      await familyRepository.createHouseholdWithChildren({
        userId,
        selfFullName:
          profile?.fullName || profile?.email?.split('@')[0] || t('family.defaultParentLabel'),
        children: draftChildren,
      });
      reset();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyHousehold });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyMembers });
      router.replace('/(app)/family');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('family.review.setupFailedMessage');
      Alert.alert(t('family.review.setupFailed'), message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <AppText variant="sectionTitle">{t('family.review.heading')}</AppText>
      <AppText variant="subtitle">{t('family.review.subtitle')}</AppText>

      <View style={styles.card}>
        {draftChildren.length === 0 ? (
          <AppText variant="body">{t('family.review.empty')}</AppText>
        ) : (
          draftChildren.map((child, index) => (
            <View key={`${child.fullName}-${index}`} style={styles.row}>
              <AppText variant="body">
                {index + 1}. {child.fullName}
              </AppText>
              <AppText variant="caption" style={styles.muted}>
                {t('family.review.childMeta', { dob: child.dateOfBirth, gender: child.gender })}
              </AppText>
            </View>
          ))
        )}
        <Button
          label={saving ? t('common.saving') : t('family.review.create')}
          disabled={saving}
          onPress={saveFamily}
        />
        <Button
          label={t('family.review.back')}
          variant="secondary"
          disabled={saving}
          onPress={() => router.back()}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
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
    gap: spacing.sm,
  },
  row: {
    gap: 2,
    paddingVertical: spacing.xs,
  },
  muted: {
    color: palette.textSecondary,
  },
});
