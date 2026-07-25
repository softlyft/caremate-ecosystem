import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AppText } from '@/components/ui/AppText';
import { Button, Input, SectionTitle } from '@/components/ui/form-controls';
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
        Alert.alert(
          'Link expired',
          'Open the reset link from your email again, or request a new one.',
          [{ text: 'Request new link', onPress: () => router.replace('/(auth)/forgot-password') }],
        );
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
      <SectionTitle
        title="Choose a new password"
        subtitle="Enter a new password for your CareMate account."
      />
      <View style={styles.form}>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              secureTextEntry
              placeholder="New password"
              autoComplete="new-password"
              textContentType="newPassword"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        <AppText
          variant="caption"
          style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17 }}
        >
          {t('auth.password.requirements')}
        </AppText>
        {formState.errors.password ? (
          <AppText variant="formError" color={colors.danger}>
            {formState.errors.password.message}
          </AppText>
        ) : null}
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              secureTextEntry
              placeholder="Confirm new password"
              autoComplete="new-password"
              textContentType="newPassword"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {formState.errors.confirmPassword ? (
          <AppText variant="formError" color={colors.danger}>
            {formState.errors.confirmPassword.message}
          </AppText>
        ) : null}
        <Button
          label={isLoading ? 'Saving...' : 'Update password'}
          disabled={isLoading}
          onPress={handleSubmit(onSubmit)}
        />
        <Button
          label="Back to sign in"
          variant="ghost"
          onPress={() => router.replace('/(auth)/login')}
        />
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
});
