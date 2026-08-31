import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import {
  Button,
  ChoiceChip,
  FormActions,
  FormField,
  FormStack,
  Input,
} from '@/components/ui/form-controls';
import { ErrorState, LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { createChildProfileSchema, FAMILY_GENDERS, familyRepository } from '@/domains/family';
import type { FamilyMemberGender } from '@/domains/family/types';
import { useTranslation } from '@/domains/localization';
import { MonthCalendarGrid, MonthCalendarNavigator } from '@/mini-apps/_kit';
import { parseDateKey, toDateKey } from '@/mini-apps/_kit/date-utils';
import { syncEngine } from '@/sync/engine';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

type ChildForm = {
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  notes?: string;
};

function initialDobMonth(dateOfBirth: string | null | undefined): Date {
  const today = new Date();
  if (dateOfBirth) {
    try {
      const parsed = parseDateKey(dateOfBirth);
      if (!Number.isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      }
    } catch {
      // fall through
    }
  }
  return new Date(today.getFullYear() - 3, today.getMonth(), 1);
}

function formatDobLabel(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function EditChildScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const memberId = typeof params.id === 'string' ? params.id : params.id?.[0];

  const memberQuery = useQuery({
    queryKey: [...QUERY_KEYS.familyMembers, 'child', memberId],
    queryFn: () => familyRepository.findMemberById(memberId!),
    enabled: Boolean(memberId),
  });

  const child = memberQuery.data;
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const currentYear = today.getFullYear();
  const [dobMonthOverride, setDobMonthOverride] = useState<{
    memberId: string;
    month: Date;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const childFormValues = useMemo((): ChildForm | undefined => {
    if (!child || child.kind !== 'child') return undefined;
    return {
      fullName: child.fullName,
      dateOfBirth: child.dateOfBirth ?? '',
      gender: (child.gender as FamilyMemberGender) ?? 'prefer_not_to_say',
      notes: child.notes ?? '',
    };
  }, [child]);

  const childSchema = useMemo(
    () =>
      createChildProfileSchema({
        nameRequired: t('family.child.nameRequired'),
        dobFormat: t('family.child.dobFormat'),
        dobInvalid: t('family.child.dobInvalid'),
      }),
    [t],
  );

  const { control, handleSubmit, setValue, formState } = useForm<ChildForm>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      fullName: '',
      dateOfBirth: '',
      gender: 'prefer_not_to_say',
      notes: '',
    },
    values: childFormValues,
  });

  const gender = useWatch({ control, name: 'gender' });
  const dateOfBirth = useWatch({ control, name: 'dateOfBirth' });
  const dobMonthRef =
    dobMonthOverride?.memberId === memberId
      ? dobMonthOverride.month
      : initialDobMonth(child?.dateOfBirth);

  async function onSubmit(values: ChildForm) {
    if (!memberId || saving) return;
    setSaving(true);
    try {
      await familyRepository.updateChild(memberId, {
        fullName: values.fullName.trim(),
        dateOfBirth: values.dateOfBirth.trim(),
        gender: values.gender,
        notes: values.notes?.trim() || '',
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.familyMembers });
      syncEngine.requestSync({ reason: 'write', immediate: true });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('family.editChildFailedMessage');
      Alert.alert(t('family.editChildFailed'), message);
    } finally {
      setSaving(false);
    }
  }

  if (!memberId) {
    return (
      <ErrorState
        title={t('family.editChildNotFoundTitle')}
        message={t('family.editChildNotFoundMessage')}
        actionLabel={t('common.goBack')}
        onAction={() => router.back()}
      />
    );
  }

  if (memberQuery.isLoading) {
    return <LoadingState title={t('family.editChildLoading')} />;
  }

  if (memberQuery.isError || !child || child.kind !== 'child') {
    return (
      <ErrorState
        title={t('family.editChildNotFoundTitle')}
        message={
          memberQuery.error instanceof Error
            ? memberQuery.error.message
            : t('family.editChildNotFoundMessage')
        }
        actionLabel={t('common.goBack')}
        onAction={() => router.back()}
      />
    );
  }

  return (
    <Screen padded={false} tone="background">
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="sectionTitle">{t('family.editChildTitle')}</AppText>
        <AppText variant="subtitle">{t('family.child.subtitle')}</AppText>

        <View style={styles.card}>
          <FormStack>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label={t('family.child.name')}
                  error={formState.errors.fullName?.message}
                >
                  <Input
                    placeholder={t('family.child.name')}
                    autoCapitalize="words"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                </FormField>
              )}
            />

            <FormField
              label={t('family.child.dob')}
              hint={t('family.child.dobHint')}
              error={formState.errors.dateOfBirth?.message}
            >
              <MonthCalendarNavigator
                accentColor={palette.primary}
                monthRef={dobMonthRef}
                onMonthChange={(month) => {
                  if (memberId) {
                    setDobMonthOverride({ memberId, month });
                  }
                }}
                maximumYear={currentYear}
              />
              <MonthCalendarGrid
                monthRef={dobMonthRef}
                interactive
                accentColor={palette.primary}
                onDayPress={(dayKey) => {
                  if (dayKey > todayKey) return;
                  setValue('dateOfBirth', dayKey, { shouldValidate: true, shouldDirty: true });
                }}
                getDayState={(dayKey) => ({
                  selected: dayKey === dateOfBirth,
                  today: dayKey === todayKey,
                  disabled: dayKey > todayKey,
                })}
              />
              {dateOfBirth ? (
                <View style={styles.dobSelectedRow}>
                  <AppText variant="body">
                    {t('family.child.dobSelected', { date: formatDobLabel(dateOfBirth) })}
                  </AppText>
                  <Button
                    accessibilityRole="button"
                    onPress={() =>
                      setValue('dateOfBirth', '', { shouldValidate: true, shouldDirty: true })
                    }
                    hitSlop={8}
                    variant="plain"
                  >
                    <AppText variant="caption" color="brand">
                      {t('common.clear')}
                    </AppText>
                  </Button>
                </View>
              ) : null}
            </FormField>

            <FormField label={t('family.child.gender')} error={formState.errors.gender?.message}>
              <View style={styles.chipRow}>
                {FAMILY_GENDERS.map((g) => (
                  <ChoiceChip
                    key={g.value}
                    label={g.label}
                    selected={gender === g.value}
                    onPress={() => setValue('gender', g.value, { shouldValidate: true })}
                  />
                ))}
              </View>
            </FormField>

            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField>
                  <Input
                    placeholder={t('family.child.notesPlaceholder')}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                </FormField>
              )}
            />

            <FormActions>
              <Button
                label={saving ? t('common.saving') : t('family.saveChild')}
                disabled={saving}
                onPress={handleSubmit(onSubmit)}
              />
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
  dobSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
