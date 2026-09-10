import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alert } from '@/components/ui/AppDialogHost';

import { AppText } from '@/components/ui/AppText';
import {
  Button,
  ChoiceChip,
  FormActions,
  FormField,
  FormStack,
  Input,
} from '@/components/ui/form-controls';
import { Screen } from '@/components/ui/screen-states';
import { createChildProfileSchema, FAMILY_GENDERS, useFamilySetupStore } from '@/domains/family';
import type { FamilyMemberGender } from '@/domains/family/types';
import { useTranslation } from '@/domains/localization';
import {
  MiniAppKeyboardContext,
  useScheduleFocusedInputScroll,
} from '@/hooks/use-keyboard-aware-scroll';
import { MonthCalendarGrid, MonthCalendarNavigator } from '@/mini-apps/_kit';
import { parseDateKey, toDateKey } from '@/mini-apps/_kit/date-utils';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

const FAMILY_HEADER_HEIGHT = 56;

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

export default function FamilyChildFormScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ index: string }>();
  const index = Number.parseInt(params.index ?? '0', 10) || 0;
  const childCount = useFamilySetupStore((s) => s.childCount);
  const children = useFamilySetupStore((s) => s.children);
  const upsertChild = useFamilySetupStore((s) => s.upsertChild);
  const existing = children[index];
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardTopRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardApi = useScheduleFocusedInputScroll(scrollRef, scrollYRef, keyboardTopRef);

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const currentYear = today.getFullYear();
  const [dobMonthRef, setDobMonthRef] = useState(() => initialDobMonth(existing?.dateOfBirth));

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardTopRef.current = event.endCoordinates.screenY;
      setKeyboardHeight(event.endCoordinates.height);
      keyboardApi.scheduleScrollIntoView();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardTopRef.current = 0;
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardApi]);

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
      fullName: existing?.fullName ?? '',
      dateOfBirth: existing?.dateOfBirth ?? '',
      gender: (existing?.gender as FamilyMemberGender) ?? 'prefer_not_to_say',
      notes: existing?.notes ?? '',
    },
  });

  const gender = useWatch({ control, name: 'gender' });
  const dateOfBirth = useWatch({ control, name: 'dateOfBirth' });

  const bottomPad =
    keyboardHeight > 0
      ? Math.max(keyboardHeight - insets.bottom, 0) + spacing.xl * 2
      : insets.bottom + spacing.xl * 2;
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + FAMILY_HEADER_HEIGHT : 0;

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }

  function onSubmit(values: ChildForm) {
    upsertChild(index, {
      fullName: values.fullName.trim(),
      dateOfBirth: values.dateOfBirth.trim(),
      gender: values.gender,
      notes: values.notes?.trim() || '',
    });

    const next = index + 1;
    if (next < childCount) {
      router.push(`/(app)/family/child/${next}`);
      return;
    }
    router.push('/(app)/family/review');
  }

  if (index < 0 || index >= childCount) {
    void alert(t('family.child.invalidStep'));
    router.replace('/(app)/family/kids-count');
    return null;
  }

  return (
    <MiniAppKeyboardContext.Provider value={keyboardApi}>
      <Screen padded={false} tone="background">
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets={false}
            contentInsetAdjustmentBehavior="never"
            scrollEventThrottle={16}
            onScroll={onScroll}
          >
            <AppText variant="sectionTitle">
              {t('family.child.titleOf', { current: index + 1, total: childCount })}
            </AppText>
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
                    onMonthChange={setDobMonthRef}
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
                          setValue('dateOfBirth', '', {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
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

                <FormField
                  label={t('family.child.gender')}
                  error={formState.errors.gender?.message}
                >
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
                    label={
                      index + 1 < childCount
                        ? t('family.child.nextChild')
                        : t('family.review.heading')
                    }
                    onPress={handleSubmit(onSubmit)}
                  />
                </FormActions>
              </FormStack>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </MiniAppKeyboardContext.Provider>
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
