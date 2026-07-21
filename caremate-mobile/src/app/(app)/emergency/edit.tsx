import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { z } from 'zod';

import { AppText } from '@/components/ui/AppText';
import { Button, Input } from '@/components/ui/form-controls';
import { LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import {
  BLOOD_GROUPS,
  GENOTYPES,
  joinFullName,
  splitFullName,
} from '@/domains/emergency/constants';
import {
  isEmergencyLockSurfaceEnabled,
  setEmergencyLockSurfaceEnabled,
  syncEmergencyLockSurface,
} from '@/domains/emergency/lock-surface';
import { hasRequiredIceContact, isCompleteIceContact } from '@/domains/emergency/validation';
import type { EmergencyContact } from '@/types';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { emergencyRepository } from '@/domains/emergency/repository';
import { useTranslation } from '@/domains/localization';
import { Switch } from '@/components/ui/switch';
import { palette, radius, spacing, useAppTheme } from '@/theme';

const EMERGENCY_ACCENT = palette.brandPurple;
const EMERGENCY_SOFT = palette.purpleLight;

type EmergencyForm = {
  firstName: string;
  lastName: string;
  bloodGroup: string;
  genotype: string;
  allergies?: string;
  currentMedications?: string;
  chronicConditions?: string;
  preferredHospital?: string;
  insuranceProvider?: string;
  notes?: string;
};

function splitList(value?: string) {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

const EMPTY_CONTACT = {
  name: '',
  phone: '',
  relationship: '',
};

export default function EmergencyEditScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactsSource, setContactsSource] = useState<EmergencyContact[] | undefined>(undefined);
  const [draftContact, setDraftContact] = useState(EMPTY_CONTACT);
  const [contactError, setContactError] = useState<string | null>(null);
  const [lockSurfaceEnabled, setLockSurfaceEnabled] = useState(true);

  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(1, t('emergency.edit.firstNameRequired')),
        lastName: z.string().min(1, t('emergency.edit.lastNameRequired')),
        bloodGroup: z.string().min(1, t('emergency.edit.bloodGroupRequired')),
        genotype: z.string().min(1, t('emergency.edit.genotypeRequired')),
        allergies: z.string().optional(),
        currentMedications: z.string().optional(),
        chronicConditions: z.string().optional(),
        preferredHospital: z.string().optional(),
        insuranceProvider: z.string().optional(),
        notes: z.string().optional(),
      }),
    [t],
  );

  const query = useQuery({
    queryKey: [...QUERY_KEYS.emergencyProfile, userId],
    queryFn: () => emergencyRepository.findByUserId(userId),
  });

  if (query.data && query.data.emergencyContacts !== contactsSource) {
    setContactsSource(query.data.emergencyContacts);
    setContacts(query.data.emergencyContacts);
  }

  useEffect(() => {
    void isEmergencyLockSurfaceEnabled().then(setLockSurfaceEnabled);
  }, []);

  const existingName = splitFullName(query.data?.fullName ?? '');

  const { control, handleSubmit, formState, setValue } = useForm<EmergencyForm>({
    resolver: zodResolver(schema),
    values: {
      firstName: existingName.firstName,
      lastName: existingName.lastName,
      bloodGroup: query.data?.bloodGroup ?? '',
      genotype: query.data?.genotype ?? '',
      allergies: query.data?.allergies.join(', ') ?? '',
      currentMedications: query.data?.currentMedications.join(', ') ?? '',
      chronicConditions: query.data?.chronicConditions.join(', ') ?? '',
      preferredHospital: query.data?.preferredHospital ?? '',
      insuranceProvider: query.data?.insuranceProvider ?? '',
      notes: query.data?.notes ?? '',
    },
  });

  const selectedBloodGroup = useWatch({ control, name: 'bloodGroup' });
  const selectedGenotype = useWatch({ control, name: 'genotype' });

  if (query.isLoading) {
    return <LoadingState title={t('emergency.edit.loading')} />;
  }

  function addContact() {
    const name = draftContact.name.trim();
    const phone = draftContact.phone.trim();
    const relationship = draftContact.relationship.trim();

    if (!isCompleteIceContact({ name, phone, relationship })) {
      setContactError(t('emergency.edit.contactRequired'));
      return;
    }

    const duplicate = contacts.some(
      (contact) => contact.phone === phone && contact.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      setContactError(t('emergency.edit.contactDuplicate'));
      return;
    }

    setContacts((current) => [...current, { name, phone, relationship }]);
    setDraftContact(EMPTY_CONTACT);
    setContactError(null);
  }

  function removeContact(index: number) {
    if (contacts.length <= 1) {
      setContactError(t('emergency.edit.contactAtLeastOne'));
      return;
    }
    setContacts((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setContactError(null);
  }

  function resolveContactsForSave(): EmergencyContact[] | null {
    const draft = {
      name: draftContact.name.trim(),
      phone: draftContact.phone.trim(),
      relationship: draftContact.relationship.trim(),
    };

    let next = contacts;
    if (isCompleteIceContact(draft)) {
      const duplicate = contacts.some(
        (contact) =>
          contact.phone === draft.phone && contact.name.toLowerCase() === draft.name.toLowerCase(),
      );
      if (!duplicate) {
        next = [...contacts, draft];
      }
    }

    if (!hasRequiredIceContact(next)) {
      setContactError(t('emergency.edit.contactAtLeastOne'));
      return null;
    }

    setContactError(null);
    return next;
  }

  async function onSubmit(values: EmergencyForm) {
    const emergencyContacts = resolveContactsForSave();
    if (!emergencyContacts) {
      return;
    }

    try {
      const saved = await emergencyRepository.save(userId, {
        fullName: joinFullName(values.firstName, values.lastName),
        bloodGroup: values.bloodGroup,
        genotype: values.genotype,
        allergies: splitList(values.allergies),
        currentMedications: splitList(values.currentMedications),
        chronicConditions: splitList(values.chronicConditions),
        preferredHospital: values.preferredHospital || null,
        insuranceProvider: values.insuranceProvider || null,
        notes: values.notes || null,
        emergencyContacts,
      });
      await setEmergencyLockSurfaceEnabled(lockSurfaceEnabled);
      await syncEmergencyLockSurface(lockSurfaceEnabled ? saved : null);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyProfile });
      router.back();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('emergency.edit.saveFailedMessage');
      Alert.alert(t('emergency.edit.saveFailed'), message);
    }
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
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
        >
          <AppText variant="caption">{t('emergency.edit.hint')}</AppText>

          <Controller
            control={control}
            name="firstName"
            render={({ field }) => (
              <Input
                placeholder={t('emergency.fields.firstName')}
                autoCapitalize="words"
                {...field}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field }) => (
              <Input
                placeholder={t('emergency.fields.lastName')}
                autoCapitalize="words"
                {...field}
                onChangeText={field.onChange}
              />
            )}
          />

          <View style={styles.fieldGroup}>
            <AppText variant="cardTitle">{t('emergency.fields.bloodGroup')}</AppText>
            <View style={styles.chipRow}>
              {BLOOD_GROUPS.map((group) => {
                const selected = selectedBloodGroup === group;
                return (
                  <Pressable
                    key={group}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setValue('bloodGroup', group, { shouldValidate: true })}
                  >
                    <AppText
                      variant="caption"
                      style={selected ? styles.chipTextSelected : undefined}
                    >
                      {group}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="cardTitle">{t('emergency.fields.genotype')}</AppText>
            <View style={styles.chipRow}>
              {GENOTYPES.map((genotype) => {
                const selected = selectedGenotype === genotype;
                return (
                  <Pressable
                    key={genotype}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setValue('genotype', genotype, { shouldValidate: true })}
                  >
                    <AppText
                      variant="caption"
                      style={selected ? styles.chipTextSelected : undefined}
                    >
                      {genotype}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Controller
            control={control}
            name="allergies"
            render={({ field }) => (
              <Input
                placeholder={t('emergency.fields.allergiesPlaceholder')}
                {...field}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="currentMedications"
            render={({ field }) => (
              <Input
                placeholder={t('emergency.fields.medicationsPlaceholder')}
                {...field}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="chronicConditions"
            render={({ field }) => (
              <Input
                placeholder={t('emergency.fields.conditionsPlaceholder')}
                {...field}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="preferredHospital"
            render={({ field }) => (
              <Input
                placeholder={t('emergency.fields.hospital')}
                {...field}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="insuranceProvider"
            render={({ field }) => (
              <Input
                placeholder={t('emergency.fields.insurance')}
                {...field}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <Input
                placeholder={t('emergency.fields.notes')}
                multiline
                {...field}
                onChangeText={field.onChange}
              />
            )}
          />

          <View style={styles.fieldGroup}>
            <AppText variant="cardTitle">{t('emergency.fields.contacts')}</AppText>
            {contacts.length === 0 ? (
              <AppText variant="caption">{t('emergency.edit.noContactsYet')}</AppText>
            ) : (
              contacts.map((contact, index) => (
                <View
                  key={`${contact.name}-${contact.phone}-${index}`}
                  style={[
                    styles.contactCard,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                >
                  <View style={styles.contactInfo}>
                    <AppText variant="quickActionTitle">{contact.name}</AppText>
                    <AppText variant="caption">{contact.relationship}</AppText>
                    <AppText variant="caption">{contact.phone}</AppText>
                  </View>
                  <Pressable onPress={() => removeContact(index)} hitSlop={8}>
                    <AppText variant="seeAll" color={colors.danger}>
                      {t('emergency.edit.remove')}
                    </AppText>
                  </Pressable>
                </View>
              ))
            )}

            <Input
              placeholder={t('emergency.edit.contactName')}
              autoCapitalize="words"
              value={draftContact.name}
              onChangeText={(name) => {
                setDraftContact((current) => ({ ...current, name }));
                setContactError(null);
              }}
            />
            <Input
              placeholder={t('emergency.edit.relationshipPlaceholder')}
              autoCapitalize="words"
              value={draftContact.relationship}
              onChangeText={(relationship) => {
                setDraftContact((current) => ({ ...current, relationship }));
                setContactError(null);
              }}
            />
            <Input
              placeholder={t('emergency.edit.phoneNumber')}
              keyboardType="phone-pad"
              value={draftContact.phone}
              onChangeText={(phone) => {
                setDraftContact((current) => ({ ...current, phone }));
                setContactError(null);
              }}
            />
            {contactError ? (
              <AppText variant="formError" color={colors.danger}>
                {contactError}
              </AppText>
            ) : null}
            <Button
              label={t('emergency.edit.addContact')}
              variant="secondary"
              onPress={addContact}
            />
          </View>

          <View style={styles.lockRow}>
            <View style={styles.lockCopy}>
              <AppText variant="cardTitle">{t('emergency.edit.lockScreenTitle')}</AppText>
              <AppText variant="caption">{t('emergency.edit.lockScreenHint')}</AppText>
            </View>
            <Switch value={lockSurfaceEnabled} onValueChange={setLockSurfaceEnabled} />
          </View>

          {formState.errors.firstName ||
          formState.errors.lastName ||
          formState.errors.bloodGroup ||
          formState.errors.genotype ? (
            <AppText variant="formError" color={colors.danger}>
              {formState.errors.firstName?.message ??
                formState.errors.lastName?.message ??
                formState.errors.bloodGroup?.message ??
                formState.errors.genotype?.message}
            </AppText>
          ) : null}

          <Button label={t('emergency.edit.save')} onPress={handleSubmit(onSubmit)} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
    minWidth: 52,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: EMERGENCY_SOFT,
    borderColor: EMERGENCY_ACCENT,
  },
  chipTextSelected: {
    color: EMERGENCY_ACCENT,
  },
  contactCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  lockCopy: {
    flex: 1,
    gap: 4,
  },
});
