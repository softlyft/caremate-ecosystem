import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import {
  Button,
  FormField,
  FormStack,
  PasswordInput,
  SectionTitle,
  TextLink,
} from '@/components/ui/form-controls';
import { passwordSchema } from '@/domains/auth/password';
import { useTranslation } from '@/domains/localization';
import { useAuthStore } from '@/features/auth/store';
import { useAppTheme } from '@/theme';
import { spacing } from '@/theme/colors';

type ResetPasswordForm = {
  password: string;
  confirmPassword: string;
};

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const updatePassword = useAuthStore((state) => state.updatePassword);
  const isLoading = useAuthStore((state) => state.isLoading);
  const passwordRecoveryPending = useAuthStore((state) => state.passwordRecoveryPending);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const schema = z
    .object({
      password: passwordSchema(t('auth.password.requirements')),
      confirmPassword: z.string().min(1, 'Confirm your password'),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });

  const { control, handleSubmit, formState } = useForm<ResetPasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(values: ResetPasswordForm) {
    try {
      if (!isAuthenticated && !passwordRecoveryPending) {
        Alert.alert(t('auth.reset.expiredTitle'), t('auth.reset.expiredMessage'), [
          {
            text: t('auth.reset.requestNew'),
            onPress: () => router.replace('/(auth)/forgot-password'),
          },
        ]);
        return;
      }
      await updatePassword(values.password);
      Alert.alert('Password updated', 'You can now sign in with your new password.', [
        {
          text: 'Continue',
          onPress: () => router.replace('/(app)/(tabs)'),
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update password';
      Alert.alert('Update failed', message);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionTitle title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')} />
      <FormStack style={styles.form}>
        <FormField
          error={formState.errors.password?.message}
          hint={t('auth.password.requirements')}
        >
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <PasswordInput
                placeholder={t('auth.reset.password')}
                autoComplete="new-password"
                textContentType="newPassword"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </FormField>
        <FormField error={formState.errors.confirmPassword?.message}>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <PasswordInput
                placeholder={t('auth.reset.confirm')}
                autoComplete="new-password"
                textContentType="newPassword"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </FormField>
        <Button
          label={isLoading ? t('common.loading') : t('auth.reset.submit')}
          disabled={isLoading}
          onPress={handleSubmit(onSubmit)}
        />
        <TextLink href="/(auth)/login">{t('auth.forgot.back')}</TextLink>
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
});
