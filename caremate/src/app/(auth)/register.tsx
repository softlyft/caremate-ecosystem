import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AppText } from '@/components/ui/AppText';
import { Button, Input, PasswordInput, SectionTitle } from '@/components/ui/form-controls';
import { useTranslation } from '@/domains/localization';
import { useAuthStore } from '@/features/auth/store';
import { joinFullName } from '@/domains/emergency/constants';
import { resolvePostSignupHref } from '@/domains/onboarding';
import { config } from '@/constants/env';
import { useAppTheme } from '@/theme';
import { spacing } from '@/theme/colors';

const registerSchema = z.object({
  firstName: z.string().min(1, 'Enter your first name'),
  lastName: z.string().min(1, 'Enter your last name'),
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a valid phone number')
    .regex(/^[+]?[\d\s()-]{7,20}$/, 'Enter a valid phone number'),
  email: z.email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const signUp = useAuthStore((state) => state.signUp);
  const isLoading = useAuthStore((state) => state.isLoading);

  const { control, handleSubmit, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '', password: '' },
  });

  async function onSubmit(values: RegisterForm) {
    try {
      if (!config.isSupabaseConfigured) {
        Alert.alert(
          'Supabase not configured',
          'Add your Supabase environment variables before registering.',
        );
        return;
      }
      await signUp(
        values.email,
        values.password,
        joinFullName(values.firstName, values.lastName),
        values.phone.trim(),
      );
      const href = await resolvePostSignupHref();
      router.replace(href);
    } catch (error) {
      const raw = error instanceof Error ? error.message : t('auth.register.error');
      const message =
        /Unable to resolve host|UnknownHostException|Network request failed|Failed to fetch/i.test(
          raw,
        )
          ? 'No internet connection. Check device/emulator network and try again.'
          : raw;
      Alert.alert(t('auth.register.error'), message);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionTitle title={t('auth.register.title')} subtitle={t('auth.register.subtitle')} />
      <View style={styles.form}>
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  autoCapitalize="words"
                  placeholder={t('auth.register.fullNamePlaceholder')}
                  onBlur={onBlur}
                  onChangeText={onChange}
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
                  placeholder={t('auth.register.fullNamePlaceholder')}
                  onBlur={onBlur}
                  onChangeText={onChange}
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
              placeholder={t('emergency.edit.contactPhone')}
              onBlur={onBlur}
              onChangeText={onChange}
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
        {formState.errors.firstName ||
        formState.errors.lastName ||
        formState.errors.phone ||
        formState.errors.email ||
        formState.errors.password ? (
          <AppText variant="formError" color={colors.danger}>
            {formState.errors.firstName?.message ??
              formState.errors.lastName?.message ??
              formState.errors.phone?.message ??
              formState.errors.email?.message ??
              formState.errors.password?.message}
          </AppText>
        ) : null}
        <Button
          label={isLoading ? t('common.loading') : t('auth.register.submit')}
          disabled={isLoading}
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
});
