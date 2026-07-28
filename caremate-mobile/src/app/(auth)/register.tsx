import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import type { Href } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AppText } from '@/components/ui/AppText';
import { Button, Input, PasswordInput, SectionTitle } from '@/components/ui/form-controls';
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

  async function openLegalUrl(url: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(t('settings.legal.openFailed'));
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('settings.legal.openFailed'));
    }
  }

  async function onSubmit(values: RegisterForm) {
    try {
      if (!config.isSupabaseConfigured) {
        Alert.alert(
          'Supabase not configured',
          'Add your Supabase environment variables before registering.',
        );
        return;
      }
      const result = await signUp(
        values.email.trim().toLowerCase(),
        values.password,
        joinFullName(values.firstName, values.lastName),
        values.phone.trim(),
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
        toUserFacingErrorMessage(error, t('auth.register.error'), t('common.networkError')),
      );
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AuthBrandHeader>
        <SectionTitle title={t('auth.register.title')} subtitle={t('auth.register.subtitle')} />
      </AuthBrandHeader>
      <View style={styles.form}>
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
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
          </View>
          <View style={styles.nameField}>
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
          </View>
        </View>
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
              onChangeText={(value) => onChange(sanitizePhoneInput(value))}
              value={value}
            />
          )}
        />
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
        <AppText variant="caption" style={[styles.hint, { color: colors.textMuted }]}>
          {t('auth.password.requirements')}
        </AppText>
        <Controller
          control={control}
          name="acceptedLegal"
          render={({ field: { onChange, value } }) => (
            <View style={styles.acceptRow}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: value }}
                accessibilityLabel={t('auth.register.acceptRequired')}
                onPress={() => onChange(!value)}
                hitSlop={8}
                style={[
                  styles.checkbox,
                  value ? styles.checkboxChecked : null,
                  formState.errors.acceptedLegal ? styles.checkboxError : null,
                ]}
              >
                {value ? <Check color="#FFFFFF" size={14} strokeWidth={3} /> : null}
              </Pressable>
              <View style={styles.acceptCopy}>
                <AppText variant="caption" style={styles.acceptText}>
                  {t('auth.register.acceptLead')}{' '}
                </AppText>
                <Pressable onPress={() => void openLegalUrl(LEGAL_URLS.terms)} hitSlop={6}>
                  <AppText variant="caption" style={styles.acceptLink}>
                    {t('settings.legal.terms')}
                  </AppText>
                </Pressable>
                <AppText variant="caption" style={styles.acceptText}>
                  {' '}
                  {t('auth.register.acceptAnd')}{' '}
                </AppText>
                <Pressable onPress={() => void openLegalUrl(LEGAL_URLS.privacy)} hitSlop={6}>
                  <AppText variant="caption" style={styles.acceptLink}>
                    {t('settings.legal.privacy')}
                  </AppText>
                </Pressable>
              </View>
            </View>
          )}
        />

        {formState.errors.firstName ||
        formState.errors.lastName ||
        formState.errors.phone ||
        formState.errors.email ||
        formState.errors.password ||
        formState.errors.acceptedLegal ? (
          <AppText variant="formError" color={colors.danger}>
            {formState.errors.firstName?.message ??
              formState.errors.lastName?.message ??
              formState.errors.phone?.message ??
              formState.errors.email?.message ??
              formState.errors.password?.message ??
              formState.errors.acceptedLegal?.message ??
              t('auth.register.acceptRequired')}
          </AppText>
        ) : null}
        <Button
          label={isLoading ? t('common.loading') : t('auth.register.submit')}
          disabled={isLoading || !canSubmit}
          onPress={handleSubmit(onSubmit)}
        />
        <Link href="/(auth)/login">
          <AppText variant="seeAll">
            {t('auth.register.hasAccount')} {t('auth.register.signIn')}
          </AppText>
        </Link>
      </View>
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
    gap: spacing.md,
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
    color: palette.primary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: -4,
  },
});
