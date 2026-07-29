import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AppText } from '@/components/ui/AppText';
import { Button, ChoiceChip, Input } from '@/components/ui/form-controls';
import { LoadingState, Screen } from '@/components/ui/screen-states';
import { QUERY_KEYS } from '@/constants/config';
import {
  BLOOD_GROUPS,
  GENOTYPES,
  joinFullName,
  splitFullName,
} from '@/domains/emergency/constants';
import { syncEmergencyLockSurface } from '@/domains/emergency/lock-surface';
import {
  hasRequiredIceContact,
  isCompleteIceContact,
  isValidIcePhone,
  isValidPersonName,
  sanitizePersonNameInput,
  sanitizePhoneInput,
  ICE_PHONE_MAX_CHARS,
  PERSON_NAME_MAX_CHARS,
} from '@/domains/emergency/validation';
import type { EmergencyContact } from '@/types';
import { useCurrentUserId } from '@/hooks/use-current-user-id';
import { emergencyRepository } from '@/domains/emergency/repository';
import { profileRepository } from '@/domains/profile/repository';
import { useTranslation } from '@/domains/localization';
import { palette, spacing, useAppTheme } from '@/theme';

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
  const insets = useSafeAreaInsets();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactsSource, setContactsSource] = useState<EmergencyContact[] | undefined>(undefined);
  const [draftContact, setDraftContact] = useState(EMPTY_CONTACT);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function scrollContactsIntoView() {
    // Let the keyboard finish opening, then bring ICE fields / actions above it.
    requestAnimationFrame(() => {
      setTimeout(
        () => {
          scrollRef.current?.scrollToEnd({ animated: true });
        },
        Platform.OS === 'ios' ? 80 : 120,
      );
    });
  }

  const schema = useMemo(
    () =>
      z.object({
        firstName: z
          .string()
          .trim()
          .min(1, t('emergency.edit.firstNameRequired'))
          .refine(isValidPersonName, t('emergency.edit.nameInvalid')),
        lastName: z
          .string()
          .trim()
          .min(1, t('emergency.edit.lastNameRequired'))
          .refine(isValidPersonName, t('emergency.edit.nameInvalid')),
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

  function clearContactDraft() {
    setDraftContact(EMPTY_CONTACT);
    setEditingContactIndex(null);
    setContactError(null);
  }

  function beginEditContact(index: number) {
    const contact = contacts[index];
    if (!contact) {
      return;
    }
    setEditingContactIndex(index);
    setDraftContact({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
    });
    setContactError(null);
    scrollContactsIntoView();
  }

  function validateDraftContact(): EmergencyContact | null {
    const name = draftContact.name.trim();
    const phone = draftContact.phone.trim();
    const relationship = draftContact.relationship.trim();

    if (!name || !phone || !relationship) {
      setContactError(t('emergency.edit.contactRequired'));
      return null;
    }

    if (!isValidPersonName(name)) {
      setContactError(t('emergency.edit.nameInvalid'));
      return null;
    }

    if (!isValidIcePhone(phone)) {
      setContactError(t('emergency.edit.contactPhoneInvalid'));
      return null;
    }

    const duplicate = contacts.some(
      (contact, index) =>
        index !== editingContactIndex &&
        contact.phone === phone &&
        contact.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      setContactError(t('emergency.edit.contactDuplicate'));
      return null;
    }

    return { name, phone, relationship };
  }

  function addContact() {
    const next = validateDraftContact();
    if (!next) {
      return;
    }

    setContacts((current) => [...current, next]);
    clearContactDraft();
  }

  function saveContactEdit() {
    if (editingContactIndex === null) {
      return;
    }
    const next = validateDraftContact();
    if (!next) {
      return;
    }

    setContacts((current) =>
      current.map((contact, index) => (index === editingContactIndex ? next : contact)),
    );
    clearContactDraft();
  }

  function removeContact(index: number) {
    if (contacts.length <= 1) {
      setContactError(t('emergency.edit.contactAtLeastOne'));
      return;
    }
    setContacts((current) => current.filter((_, itemIndex) => itemIndex !== index));
    if (editingContactIndex === index) {
      clearContactDraft();
    } else if (editingContactIndex !== null && editingContactIndex > index) {
      setEditingContactIndex(editingContactIndex - 1);
    }
    setContactError(null);
  }

  function resolveContactsForSave(): EmergencyContact[] | null {
    const draft = {
      name: draftContact.name.trim(),
      phone: draftContact.phone.trim(),
      relationship: draftContact.relationship.trim(),
    };
    const draftFilled = Boolean(draft.name || draft.phone || draft.relationship);
    const draftComplete = isCompleteIceContact(draft);

    let next = contacts;

    if (editingContactIndex !== null) {
      if (!draftComplete) {
        if (draft.phone && !isValidIcePhone(draft.phone)) {
          setContactError(t('emergency.edit.contactPhoneInvalid'));
          return null;
        }
        setContactError(t('emergency.edit.contactRequired'));
        return null;
      }
      const duplicate = contacts.some(
        (contact, index) =>
          index !== editingContactIndex &&
          contact.phone === draft.phone &&
          contact.name.toLowerCase() === draft.name.toLowerCase(),
      );
      if (duplicate) {
        setContactError(t('emergency.edit.contactDuplicate'));
        return null;
      }
      next = contacts.map((contact, index) => (index === editingContactIndex ? draft : contact));
    } else if (draftComplete) {
      const duplicate = contacts.some(
        (contact) =>
          contact.phone === draft.phone && contact.name.toLowerCase() === draft.name.toLowerCase(),
      );
      if (!duplicate) {
        next = [...contacts, draft];
      }
    } else if (draftFilled) {
      // Draft partially filled — surface phone length/shape errors instead of silently dropping it.
      if (draft.phone && !isValidIcePhone(draft.phone)) {
        setContactError(t('emergency.edit.contactPhoneInvalid'));
        return null;
      }
      if (!draft.name || !draft.phone || !draft.relationship) {
        setContactError(t('emergency.edit.contactRequired'));
        return null;
      }
    }

    if (next.some((contact) => !isCompleteIceContact(contact))) {
      setContactError(t('emergency.edit.contactPhoneInvalid'));
      return null;
    }

    if (!hasRequiredIceContact(next)) {
      setContactError(t('emergency.edit.contactAtLeastOne'));
      return null;
    }

    setContactError(null);
    return next;
  }

  async function onSubmit(values: EmergencyForm) {
    if (savingRef.current) {
      return;
    }

    const emergencyContacts = resolveContactsForSave();
    if (!emergencyContacts) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
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
      // Keep account profile identity aligned with the registered emergency name.
      await profileRepository.save(userId, {
        fullName: saved.fullName,
      });
      await syncEmergencyLockSurface(null);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyProfile });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile });
      router.back();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('emergency.edit.saveFailedMessage');
      Alert.alert(t('emergency.edit.saveFailed'), message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const keyboardBottomInset =
    keyboardHeight > 0 ? Math.max(keyboardHeight - insets.bottom, 0) + spacing.lg : spacing.xl * 2;
  // Modal stack header ≈ 56pt + safe area on iOS; Android uses windowSoftInputMode=adjustResize.
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + 56 : 0;

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
          contentContainerStyle={[styles.content, { paddingBottom: keyboardBottomInset }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          <AppText variant="caption">{t('emergency.edit.hint')}</AppText>

          <Controller
            control={control}
            name="firstName"
            render={({ field }) => (
              <Input
                placeholder={t('emergency.fields.firstName')}
                autoCapitalize="words"
                autoCorrect={false}
                textContentType="givenName"
                maxLength={PERSON_NAME_MAX_CHARS}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={(value) => field.onChange(sanitizePersonNameInput(value))}
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
                autoCorrect={false}
                textContentType="familyName"
                maxLength={PERSON_NAME_MAX_CHARS}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={(value) => field.onChange(sanitizePersonNameInput(value))}
              />
            )}
          />

          <View style={styles.fieldGroup}>
            <AppText variant="cardTitle">{t('emergency.fields.bloodGroup')}</AppText>
            <View style={styles.chipRow}>
              {BLOOD_GROUPS.map((group) => (
                <ChoiceChip
                  key={group}
                  label={group}
                  selected={selectedBloodGroup === group}
                  onPress={() => setValue('bloodGroup', group, { shouldValidate: true })}
                  accent={EMERGENCY_ACCENT}
                  soft={EMERGENCY_SOFT}
                  disabled={saving}
                />
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="cardTitle">{t('emergency.fields.genotype')}</AppText>
            <View style={styles.chipRow}>
              {GENOTYPES.map((genotype) => (
                <ChoiceChip
                  key={genotype}
                  label={genotype}
                  selected={selectedGenotype === genotype}
                  onPress={() => setValue('genotype', genotype, { shouldValidate: true })}
                  accent={EMERGENCY_ACCENT}
                  soft={EMERGENCY_SOFT}
                  disabled={saving}
                />
              ))}
            </View>
          </View>

          <Controller
            control={control}
            name="allergies"
            render={({ field }) => (
              <Input
                placeholder={t('emergency.fields.allergiesPlaceholder')}
                value={field.value}
                onBlur={field.onBlur}
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
                value={field.value}
                onBlur={field.onBlur}
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
                value={field.value}
                onBlur={field.onBlur}
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
                value={field.value}
                onBlur={field.onBlur}
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
                value={field.value}
                onBlur={field.onBlur}
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
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
              />
            )}
          />

          <View style={styles.fieldGroup}>
            <AppText variant="cardTitle">{t('emergency.fields.contacts')}</AppText>
            {contacts.length === 0 ? (
              <AppText variant="caption">{t('emergency.edit.noContactsYet')}</AppText>
            ) : (
              contacts.map((contact, index) => {
                const isEditing = editingContactIndex === index;
                return (
                  <View
                    key={`${contact.name}-${contact.phone}-${index}`}
                    style={[
                      styles.contactCard,
                      {
                        borderColor: isEditing ? EMERGENCY_ACCENT : colors.border,
                        backgroundColor: isEditing ? EMERGENCY_SOFT : colors.surface,
                      },
                    ]}
                  >
                    <View style={styles.contactInfo}>
                      <AppText variant="quickActionTitle">{contact.name}</AppText>
                      <AppText variant="caption">{contact.relationship}</AppText>
                      <AppText variant="caption">{contact.phone}</AppText>
                    </View>
                    <View style={styles.contactActions}>
                      <Button
                        onPress={() => beginEditContact(index)}
                        hitSlop={8}
                        disabled={isEditing}
                        variant="plain"
                      >
                        <AppText
                          variant="seeAll"
                          color={isEditing ? colors.textMuted : EMERGENCY_ACCENT}
                        >
                          {t('emergency.edit.editContact')}
                        </AppText>
                      </Button>
                      <Button onPress={() => removeContact(index)} hitSlop={8} variant="plain">
                        <AppText variant="seeAll" color={colors.danger}>
                          {t('emergency.edit.remove')}
                        </AppText>
                      </Button>
                    </View>
                  </View>
                );
              })
            )}

            <Input
              placeholder={t('emergency.edit.contactName')}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={PERSON_NAME_MAX_CHARS}
              value={draftContact.name}
              onFocus={scrollContactsIntoView}
              onChangeText={(name) => {
                setDraftContact((current) => ({ ...current, name: sanitizePersonNameInput(name) }));
                setContactError(null);
              }}
            />
            <Input
              placeholder={t('emergency.edit.relationshipPlaceholder')}
              autoCapitalize="words"
              value={draftContact.relationship}
              onFocus={scrollContactsIntoView}
              onChangeText={(relationship) => {
                setDraftContact((current) => ({ ...current, relationship }));
                setContactError(null);
              }}
            />
            <Input
              placeholder={t('emergency.edit.phoneNumber')}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={ICE_PHONE_MAX_CHARS}
              value={draftContact.phone}
              onFocus={scrollContactsIntoView}
              onChangeText={(phone) => {
                setDraftContact((current) => ({ ...current, phone: sanitizePhoneInput(phone) }));
                setContactError(null);
              }}
            />
            {contactError ? (
              <AppText variant="formError" color={colors.danger}>
                {contactError}
              </AppText>
            ) : null}
            {editingContactIndex === null ? (
              <Button
                label={t('emergency.edit.addContact')}
                variant="secondary"
                onPress={addContact}
              />
            ) : (
              <View style={styles.contactEditActions}>
                <Button
                  label={t('emergency.edit.saveContact')}
                  variant="secondary"
                  onPress={saveContactEdit}
                />
                <Button
                  label={t('emergency.edit.cancelEdit')}
                  variant="ghost"
                  onPress={clearContactDraft}
                />
              </View>
            )}
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

          <Button
            label={saving ? t('common.loading') : t('emergency.edit.save')}
            disabled={saving}
            onPress={() => {
              void handleSubmit(onSubmit)();
            }}
          />
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
    flexGrow: 1,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  contactActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  contactEditActions: {
    gap: spacing.sm,
  },
});
