import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AppText } from '@/components/ui/AppText';
import {
  Button,
  FormField,
  FormStack,
  Input,
  PasswordInput,
  SectionTitle,
  TextLink,
} from '@/components/ui/form-controls';
import { LEGAL_URLS } from '@/constants/config';
import { config } from '@/constants/env';
import { joinFullName } from '@/domains/emergency/constants';
import {
  ICE_PHONE_MAX_CHARS,
  PERSON_NAME_MAX_CHARS,
  isValidIcePhone,
  isValidPersonName,
  sanitizePersonNameInput,
  sanitizePhoneInput,
} from '@/domains/emergency/validation';
import { confirmDeviceAccountForAuth } from '@/domains/auth/confirm-device-account';
import { normalizeAccountEmail } from '@/domains/auth/device-account-binding';
import { passwordSchema } from '@/domains/auth/password';
import { useTranslation } from '@/domains/localization';
import { resolvePostSignupHref } from '@/domains/onboarding';
import { AuthBrandHeader } from '@/features/auth/AuthBrandHeader';
import { useAuthStore } from '@/features/auth/store';
import { toUserFacingErrorMessage } from '@/lib/user-facing-error';
import { palette, radius, useAppTheme } from '@/theme';
import { spacing } from '@/theme/colors';

type RegisterForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  acceptedLegal: boolean;
};

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const signUp = useAuthStore((state) => state.signUp);
  const isLoading = useAuthStore((state) => state.isLoading);

  const registerSchema = useMemo(
    () =>
      z.object({
        firstName: z
          .string()
          .trim()
          .min(1, 'Enter your first name')
          .refine(isValidPersonName, t('emergency.edit.nameInvalid')),
        lastName: z
          .string()
          .trim()
          .min(1, 'Enter your last name')
          .refine(isValidPersonName, t('emergency.edit.nameInvalid')),
        phone: z.string().trim().refine(isValidIcePhone, t('emergency.edit.contactPhoneInvalid')),
        email: z.email('Enter a valid email'),
        password: passwordSchema(t('auth.password.requirements')),
        acceptedLegal: z.boolean().refine((value) => value === true, {
          message: t('auth.register.acceptRequired'),
        }),
      }),
    [t],
  );

  const { control, handleSubmit, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      acceptedLegal: false,
    },
  });

  const watchedValues = useWatch({ control });
  const canSubmit = useMemo(
    () => registerSchema.safeParse(watchedValues).success,
    [registerSchema, watchedValues],
  );

  async function onSubmit(values: RegisterForm) {
    try {
      if (!config.isSupabaseConfigured) {
        Alert.alert(
          'Supabase not configured',
          'Add your Supabase environment variables before registering.',
        );
        return;
      }
      const email = normalizeAccountEmail(values.email);
      const allowed = await confirmDeviceAccountForAuth(email, {
        title: t('auth.deviceAccount.title'),
        message: (maskedEmail) => t('auth.deviceAccount.message', { email: maskedEmail }),
        proceed: t('auth.deviceAccount.proceed'),
        cancel: t('common.cancel'),
      });
      if (!allowed) {
        return;
      }
      const result = await signUp(
        email,
        values.password,
        joinFullName(values.firstName, values.lastName),
        values.phone.trim(),
        { legalAcceptedAt: new Date().toISOString() },
      );
      if (result.needsEmailVerification) {
        router.push({
          pathname: '/(auth)/verify-email',
          params: {
            email: result.email,
            fullName: joinFullName(values.firstName, values.lastName),
            phone: values.phone.trim(),
          },
        } as Href);
        return;
      }
      const href = await resolvePostSignupHref();
      router.replace(href);
    } catch (error) {
      Alert.alert(
        t('auth.register.error'),
        toUserFacingErrorMessage(
          error,
          t('auth.register.error'),
          t('common.networkError'),
          t('common.emailDeliveryError'),
        ),
      );
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AuthBrandHeader>
        <SectionTitle title={t('auth.register.title')} subtitle={t('auth.register.subtitle')} />
      </AuthBrandHeader>
      <FormStack style={styles.form}>
        <View style={styles.nameRow}>
          <FormField compact error={formState.errors.firstName?.message} style={styles.nameField}>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="givenName"
                  maxLength={PERSON_NAME_MAX_CHARS}
                  placeholder={t('auth.register.firstNamePlaceholder')}
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(sanitizePersonNameInput(text))}
                  value={value}
                />
              )}
            />
          </FormField>
          <FormField compact error={formState.errors.lastName?.message} style={styles.nameField}>
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="familyName"
                  maxLength={PERSON_NAME_MAX_CHARS}
                  placeholder={t('auth.register.lastNamePlaceholder')}
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(sanitizePersonNameInput(text))}
                  value={value}
                />
              )}
            />
          </FormField>
        </View>
        <FormField error={formState.errors.phone?.message}>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                autoCapitalize="none"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                maxLength={ICE_PHONE_MAX_CHARS}
                placeholder={t('emergency.edit.contactPhone')}
                onBlur={onBlur}
                onChangeText={(next) => onChange(sanitizePhoneInput(next))}
                value={value}
              />
            )}
          />
        </FormField>
        <FormField error={formState.errors.email?.message}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder={t('auth.register.email')}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </FormField>
        <FormField
          error={formState.errors.password?.message}
          hint={t('auth.password.requirements')}
        >
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <PasswordInput
                placeholder={t('auth.register.password')}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </FormField>
        <FormField error={formState.errors.acceptedLegal?.message}>
          <Controller
            control={control}
            name="acceptedLegal"
            render={({ field: { onChange, value } }) => (
              <View style={styles.acceptRow}>
                <Button
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: value }}
                  accessibilityLabel={t('auth.register.acceptA11y')}
                  onPress={() => onChange(!value)}
                  hitSlop={8}
                  style={[
                    styles.checkbox,
                    value ? styles.checkboxChecked : null,
                    formState.errors.acceptedLegal ? styles.checkboxError : null,
                  ]}
                  variant="plain"
                >
                  {value ? <Check color="#FFFFFF" size={14} strokeWidth={3} /> : null}
                </Button>
                <View style={styles.acceptCopy}>
                  <AppText variant="caption" style={styles.acceptText}>
                    {t('auth.register.acceptLead')}{' '}
                  </AppText>
                  <TextLink external href={LEGAL_URLS.terms} style={styles.acceptLink}>
                    {t('settings.legal.terms')}
                  </TextLink>
                  <AppText variant="caption" style={styles.acceptText}>
                    {' '}
                    {t('auth.register.acceptAnd')}{' '}
                  </AppText>
                  <TextLink external href={LEGAL_URLS.privacy} style={styles.acceptLink}>
                    {t('settings.legal.privacy')}
                  </TextLink>
                </View>
              </View>
            )}
          />
        </FormField>
        <Button
          label={isLoading ? t('common.loading') : t('auth.register.submit')}
          disabled={isLoading || !canSubmit}
          onPress={handleSubmit(onSubmit)}
        />
        <TextLink href="/(auth)/login">
          {t('auth.register.hasAccount')} {t('auth.register.signIn')}
        </TextLink>
      </FormStack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  form: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nameField: {
    flex: 1,
  },
  acceptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: palette.divider,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  checkboxError: {
    borderColor: palette.danger,
  },
  acceptCopy: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  acceptText: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  acceptLink: {
    fontSize: 13,
    lineHeight: 19,
  },
});
