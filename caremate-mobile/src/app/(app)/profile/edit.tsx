import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, Input } from '@/components/ui/form-controls';
import { LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import { useTranslation } from '@/domains/localization';
import { isValidNigerianNin, sanitizeNationalIdInput } from '@/domains/profile/national-id';
import { profileRepository } from '@/domains/profile/repository';
import { providerConnectionService } from '@/domains/providers/connection-service';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import type { Profile } from '@/types';
import { palette, radius, spacing } from '@/theme';

const GENDERS: NonNullable<Profile['gender']>[] = ['male', 'female', 'other', 'unknown'];
const MARITAL: NonNullable<Profile['maritalStatus']>[] = [
  'single',
  'married',
  'divorced',
  'widowed',
  'separated',
  'unknown',
];

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : null]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <AppText variant="caption" style={selected ? styles.chipTextSelected : undefined}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: [...QUERY_KEYS.profile, userId],
    queryFn: () => profileRepository.findByUserId(userId),
  });

  const connectionsQuery = useQuery({
    queryKey: [...QUERY_KEYS.providerConnections, 'mine', userId],
    queryFn: () => providerConnectionService.listMine(),
    enabled: Boolean(profileQuery.data?.isHealthPractitioner),
  });

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Profile['gender']>(null);
  const [maritalStatus, setMaritalStatus] = useState<Profile['maritalStatus']>(null);
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [stateValue, setStateValue] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [isPractitioner, setIsPractitioner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile || hydrated) return;
    setFullName(profile.fullName ?? '');
    setPhone(profile.phone ?? '');
    setDateOfBirth(profile.dateOfBirth ?? '');
    setGender(profile.gender);
    setMaritalStatus(profile.maritalStatus);
    setAddressLine(profile.addressLine ?? '');
    setCity(profile.city ?? '');
    setStateValue(profile.state ?? '');
    setPostalCode(profile.postalCode ?? '');
    setNationalId(profile.nationalId ?? '');
    setIsPractitioner(Boolean(profile.isHealthPractitioner));
    setHydrated(true);
  }, [profileQuery.data, hydrated]);

  const countryCode = profileQuery.data?.countryCode ?? null;
  const isNigeria = (countryCode ?? '').toUpperCase() === 'NG';
  const nationalIdLabel = isNigeria ? t('profile.edit.nin') : t('profile.edit.nationalId');

  const connections = connectionsQuery.data ?? [];
  const approved = useMemo(
    () => connections.filter((c) => c.status === 'approved'),
    [connections],
  );
  const pending = useMemo(
    () => connections.filter((c) => c.status === 'pending'),
    [connections],
  );

  async function handleSave() {
    const name = fullName.trim();
    if (!name) {
      Alert.alert(t('profile.edit.nameRequired'));
      return;
    }
    if (isNigeria && nationalId.trim() && !isValidNigerianNin(nationalId)) {
      Alert.alert(t('profile.edit.ninInvalid'));
      return;
    }

    setSaving(true);
    try {
      await profileRepository.save(userId, {
        fullName: name,
        phone: phone.trim() || null,
        dateOfBirth: dateOfBirth.trim() || null,
        gender,
        maritalStatus,
        addressLine: addressLine.trim() || null,
        city: city.trim() || null,
        state: stateValue.trim() || null,
        postalCode: postalCode.trim() || null,
        nationalId: nationalId.trim() || null,
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

  if (profileQuery.isLoading || !hydrated) {
    return <LoadingState title={t('profile.edit.loading')} />;
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <AppText variant="caption">{t('profile.edit.hint')}</AppText>

          <Input
            placeholder={t('profile.edit.fullName')}
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
          />
          <Input
            placeholder={t('profile.edit.phone')}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <Input
            placeholder={t('profile.edit.dateOfBirth')}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
          />

          <View style={styles.fieldGroup}>
            <AppText variant="cardTitle">{t('profile.edit.gender')}</AppText>
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
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="cardTitle">{t('profile.edit.maritalStatus')}</AppText>
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
          </View>

          <Input
            placeholder={t('profile.edit.addressLine')}
            value={addressLine}
            onChangeText={setAddressLine}
          />
          <Input placeholder={t('profile.edit.city')} value={city} onChangeText={setCity} />
          <Input
            placeholder={t('profile.edit.state')}
            value={stateValue}
            onChangeText={setStateValue}
          />
          <Input
            placeholder={t('profile.edit.postalCode')}
            value={postalCode}
            onChangeText={setPostalCode}
          />
          <Input
            placeholder={nationalIdLabel}
            keyboardType={isNigeria ? 'number-pad' : 'default'}
            value={nationalId}
            onChangeText={(value) => setNationalId(sanitizeNationalIdInput(value, countryCode))}
          />

          <View style={styles.fieldGroup}>
            <AppText variant="cardTitle">{t('profile.edit.practitionerTitle')}</AppText>
            <AppText variant="caption">{t('profile.edit.practitionerHint')}</AppText>
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
          </View>

          {isPractitioner ? (
            <View style={[styles.orgCard, { borderColor: palette.divider }]}>
              <AppText variant="cardTitle">{t('profile.edit.connectOrgTitle')}</AppText>
              <AppText variant="caption">{t('profile.edit.connectOrgBody')}</AppText>

              {approved.length > 0 ? (
                <View style={styles.orgList}>
                  {approved.map((c) => (
                    <AppText key={c.id} variant="body">
                      {t('profile.edit.connectedOrg', {
                        name: c.organizationName ?? t('profile.edit.unknownOrg'),
                      })}
                    </AppText>
                  ))}
                  <AppText variant="caption">{t('profile.edit.awaitingStaff')}</AppText>
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

          <Button
            label={saving ? t('common.saving') : t('common.save')}
            onPress={() => void handleSave()}
            disabled={saving}
          />
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
  fieldGroup: {
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.divider,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: palette.background,
  },
  chipSelected: {
    backgroundColor: palette.primaryLight,
    borderColor: palette.primary,
  },
  chipTextSelected: {
    color: palette.primaryDark,
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
