import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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

import { AppText } from '@/components/ui/AppText';
import {
  Button,
  ChoiceChip,
  FormActions,
  FormField,
  FormNotice,
  FormStack,
  Input,
} from '@/components/ui/form-controls';
import { LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import {
  isNigeriaCountry,
  parseNationalId,
  sanitizeNationalIdInput,
} from '@/domains/profile/national-id';
import { isValidPhone, sanitizePhoneInput } from '@/domains/profile/phone';
import { profileRepository } from '@/domains/profile/repository';
import { providerConnectionService } from '@/domains/providers/connection-service';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { useScheduleFocusedInputScroll } from '@/hooks/use-keyboard-aware-scroll';
import { MonthCalendarGrid, MonthCalendarNavigator } from '@/mini-apps/_kit';
import { parseDateKey, toDateKey } from '@/mini-apps/_kit/date-utils';
import type { Profile } from '@/types';
import { palette, spacing } from '@/theme';

const GENDERS: NonNullable<Profile['gender']>[] = ['male', 'female', 'other', 'unknown'];
const MARITAL: NonNullable<Profile['maritalStatus']>[] = [
  'single',
  'married',
  'divorced',
  'widowed',
  'separated',
  'unknown',
];
const PROFILE_HEADER_HEIGHT = 56;

function initialMonthRef(dateOfBirth: string | null | undefined): Date {
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
  return new Date(today.getFullYear() - 30, today.getMonth(), 1);
}

function formatDobLabel(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function Chip({ label, selected, onPress }: ChipProps) {
  return <ChoiceChip label={label} selected={selected} onPress={onPress} />;
}

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: [...QUERY_KEYS.profile, userId],
    queryFn: () => profileRepository.findByUserId(userId),
  });

  if (profileQuery.isLoading) {
    return <LoadingState title={t('profile.edit.loading')} />;
  }

  const profile = profileQuery.data;
  if (!profile) {
    return <LoadingState title={t('profile.edit.loading')} />;
  }

  return (
    <EditProfileForm key={profile.id} profile={profile} userId={userId} queryClient={queryClient} />
  );
}

function EditProfileForm({
  profile,
  userId,
  queryClient,
}: {
  profile: Profile;
  userId: string;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardTopRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardApi = useScheduleFocusedInputScroll(scrollRef, scrollYRef, keyboardTopRef);

  const [fullName, setFullName] = useState(profile.fullName ?? '');
  const [phone, setPhone] = useState(() => sanitizePhoneInput(profile.phone ?? ''));
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ?? '');
  const [dobMonthRef, setDobMonthRef] = useState(() => initialMonthRef(profile.dateOfBirth));
  const [gender, setGender] = useState<Profile['gender']>(profile.gender);
  const [maritalStatus, setMaritalStatus] = useState<Profile['maritalStatus']>(
    profile.maritalStatus,
  );
  const [addressLine, setAddressLine] = useState(profile.addressLine ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [stateValue, setStateValue] = useState(profile.state ?? '');
  const [postalCode, setPostalCode] = useState(profile.postalCode ?? '');
  const [nationalId, setNationalId] = useState(profile.nationalId ?? '');
  const [nationalIdError, setNationalIdError] = useState<string | null>(null);
  const [isPractitioner, setIsPractitioner] = useState(Boolean(profile.isHealthPractitioner));
  const [saving, setSaving] = useState(false);

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

  const connectionsQuery = useQuery({
    queryKey: [...QUERY_KEYS.providerConnections, 'mine', userId],
    queryFn: () => providerConnectionService.listMine(),
    enabled: isPractitioner,
  });

  const countryCode = profile.countryCode ?? null;
  const isNigeria = isNigeriaCountry(countryCode);
  const nationalIdLabel = isNigeria ? t('profile.edit.nin') : t('profile.edit.nationalId');
  const nationalIdMessages = useMemo(
    () => ({
      ninInvalid: t('profile.edit.ninInvalid'),
      nationalIdInvalid: t('profile.edit.nationalIdInvalid'),
    }),
    [t],
  );
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const approved = useMemo(
    () => (connectionsQuery.data ?? []).filter((c) => c.status === 'approved'),
    [connectionsQuery.data],
  );
  const pending = useMemo(
    () => (connectionsQuery.data ?? []).filter((c) => c.status === 'pending'),
    [connectionsQuery.data],
  );
  const awaitingStaff = useMemo(() => approved.some((c) => !c.isOrgStaff), [approved]);

  // Extra scroll room so lower fields (address / NIN) can rise above the keyboard.
  // Applied on both platforms: Android adjustResize alone is not enough for bottom fields.
  const bottomPad =
    keyboardHeight > 0
      ? Math.max(keyboardHeight - insets.bottom, 0) + spacing.xl * 2
      : spacing.xl * 2;
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + PROFILE_HEADER_HEIGHT : 0;

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }

  async function handleSave() {
    const name = fullName.trim();
    if (!name) {
      Alert.alert(t('profile.edit.nameRequired'));
      return;
    }

    const nationalIdResult = parseNationalId(nationalId, countryCode, nationalIdMessages);
    if (!nationalIdResult.ok) {
      setNationalIdError(nationalIdResult.message);
      Alert.alert(nationalIdResult.message);
      return;
    }
    setNationalIdError(null);

    if (phone.trim() && !isValidPhone(phone)) {
      Alert.alert(t('profile.edit.phoneInvalid'));
      return;
    }

    setSaving(true);
    try {
      await profileRepository.save(userId, {
        fullName: name,
        phone: sanitizePhoneInput(phone.trim()) || null,
        dateOfBirth: dateOfBirth.trim() || null,
        gender,
        maritalStatus,
        addressLine: addressLine.trim() || null,
        city: city.trim() || null,
        state: stateValue.trim() || null,
        postalCode: postalCode.trim() || null,
        nationalId: nationalIdResult.value,
        isHealthPractitioner: isPractitioner,
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile });
      router.back();
    } catch (error) {
      Alert.alert(
        t('profile.edit.saveFailed'),
        error instanceof Error ? error.message : t('common.loadFailedMessage'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
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
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentInsetAdjustmentBehavior="automatic"
          scrollEventThrottle={16}
          onScroll={onScroll}
        >
          <FormStack>
            <FormNotice>{t('profile.edit.hint')}</FormNotice>

            <FormField label={t('profile.edit.fullName')}>
              <Input
                placeholder={t('profile.edit.fullName')}
                autoCapitalize="words"
                value={fullName}
                onChangeText={setFullName}
              />
            </FormField>

            <FormField label={t('profile.edit.phone')}>
              <Input
                placeholder={t('profile.edit.phone')}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={16}
                value={phone}
                onChangeText={(value) => setPhone(sanitizePhoneInput(value))}
              />
            </FormField>

            <FormField label={t('profile.edit.dateOfBirth')} hint={t('profile.edit.dateOfBirthHint')}>
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
                  setDateOfBirth(dayKey);
                }}
                getDayState={(dayKey) => ({
                  selected: dayKey === dateOfBirth,
                  today: dayKey === todayKey,
                })}
              />
              {dateOfBirth ? (
                <View style={styles.dobSelectedRow}>
                  <AppText variant="body">
                    {t('profile.edit.dateOfBirthSelected', { date: formatDobLabel(dateOfBirth) })}
                  </AppText>
                  <Button
                    accessibilityRole="button"
                    onPress={() => setDateOfBirth('')}
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

            <FormField label={t('profile.edit.gender')}>
              <View style={styles.chipRow}>
                {GENDERS.map((value) => (
                  <Chip
                    key={value}
                    label={t(`profile.edit.genders.${value}`)}
                    selected={gender === value}
                    onPress={() => setGender(value)}
                  />
                ))}
              </View>
            </FormField>

            <FormField label={t('profile.edit.maritalStatus')}>
              <View style={styles.chipRow}>
                {MARITAL.map((value) => (
                  <Chip
                    key={value}
                    label={t(`profile.edit.marital.${value}`)}
                    selected={maritalStatus === value}
                    onPress={() => setMaritalStatus(value)}
                  />
                ))}
              </View>
            </FormField>

            <FormField label={t('profile.edit.addressLine')}>
              <Input
                placeholder={t('profile.edit.addressLine')}
                value={addressLine}
                onChangeText={setAddressLine}
                onFocus={keyboardApi.scheduleScrollIntoView}
              />
            </FormField>

            <FormField label={t('profile.edit.city')}>
              <Input
                placeholder={t('profile.edit.city')}
                value={city}
                onChangeText={setCity}
                onFocus={keyboardApi.scheduleScrollIntoView}
              />
            </FormField>

            <FormField label={t('profile.edit.state')}>
              <Input
                placeholder={t('profile.edit.state')}
                value={stateValue}
                onChangeText={setStateValue}
                onFocus={keyboardApi.scheduleScrollIntoView}
              />
            </FormField>

            <FormField label={t('profile.edit.postalCode')}>
              <Input
                placeholder={t('profile.edit.postalCode')}
                value={postalCode}
                onChangeText={setPostalCode}
                onFocus={keyboardApi.scheduleScrollIntoView}
              />
            </FormField>

            <FormField
              label={nationalIdLabel}
              hint={isNigeria ? t('profile.edit.ninHint') : t('profile.edit.nationalIdHint')}
              error={nationalIdError ?? undefined}
            >
              <Input
                placeholder={nationalIdLabel}
                keyboardType={isNigeria ? 'number-pad' : 'default'}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={isNigeria ? 11 : 32}
                value={nationalId}
                onChangeText={(value) => {
                  setNationalId(sanitizeNationalIdInput(value, countryCode));
                  if (nationalIdError) {
                    setNationalIdError(null);
                  }
                }}
                onFocus={keyboardApi.scheduleScrollIntoView}
                onBlur={() => {
                  const result = parseNationalId(nationalId, countryCode, nationalIdMessages);
                  setNationalIdError(result.ok ? null : result.message);
                }}
              />
            </FormField>

            <FormField
              label={t('profile.edit.practitionerTitle')}
              hint={t('profile.edit.practitionerHint')}
            >
              <View style={styles.chipRow}>
                <Chip
                  label={t('common.yes')}
                  selected={isPractitioner}
                  onPress={() => setIsPractitioner(true)}
                />
                <Chip
                  label={t('common.no')}
                  selected={!isPractitioner}
                  onPress={() => setIsPractitioner(false)}
                />
              </View>
            </FormField>

            {isPractitioner ? (
              <View style={[styles.orgCard, { borderColor: palette.divider }]}>
                <AppText variant="cardTitle">{t('profile.edit.connectOrgTitle')}</AppText>
                <AppText variant="caption">{t('profile.edit.connectOrgBody')}</AppText>

                {approved.length > 0 ? (
                  <View style={styles.orgList}>
                    {approved.map((c) => (
                      <AppText key={c.id} variant="body">
                        {t(c.isOrgStaff ? 'profile.edit.staffOrg' : 'profile.edit.connectedOrg', {
                          name: c.organizationName ?? t('profile.edit.unknownOrg'),
                        })}
                      </AppText>
                    ))}
                    {awaitingStaff ? (
                      <AppText variant="caption">{t('profile.edit.awaitingStaff')}</AppText>
                    ) : null}
                  </View>
                ) : null}

                {pending.length > 0 ? (
                  <View style={styles.orgList}>
                    {pending.map((c) => (
                      <AppText key={c.id} variant="caption">
                        {t('profile.edit.pendingOrg', {
                          name: c.organizationName ?? t('profile.edit.unknownOrg'),
                        })}
                      </AppText>
                    ))}
                  </View>
                ) : null}

                <Button
                  label={t('profile.edit.findOrg')}
                  variant="secondary"
                  onPress={() => router.push('/(app)/(tabs)/providers')}
                />
                <Button
                  label={t('profile.edit.openConnections')}
                  variant="ghost"
                  onPress={() => router.push('/providers/connections')}
                />
              </View>
            ) : null}

            <FormActions>
              <Button
                label={saving ? t('common.saving') : t('common.save')}
                onPress={() => void handleSave()}
                disabled={saving}
              />
            </FormActions>
          </FormStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
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
  orgCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: palette.background,
  },
  orgList: {
    gap: 4,
  },
});
