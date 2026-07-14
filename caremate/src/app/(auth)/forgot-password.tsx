import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AppText } from '@/components/ui/AppText';
import { Button, Input, SectionTitle } from '@/components/ui/form-controls';
import { authService } from '@/services/auth-service';
import { config } from '@/constants/env';
import { getPasswordResetRedirectUri } from '@/lib/auth-deep-link';
import { useAppTheme } from '@/theme';
import { spacing } from '@/theme/colors';

const schema = z.object({
  email: z.email('Enter a valid email'),
});

type ForgotPasswordForm = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit, formState } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordForm) {
    try {
      if (!config.isSupabaseConfigured) {
        Alert.alert('Supabase not configured', 'Add your Supabase environment variables first.');
        return;
      }
      setIsSubmitting(true);
      await authService.resetPassword(values.email);
      Alert.alert(
        'Check your email',
        'If an account exists for that address, we sent a password reset link. Open it on this device to choose a new password.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send reset email';
      Alert.alert('Request failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionTitle
        title="Reset password"
        subtitle="Enter the email for your CareMate account. We’ll send a secure link that opens back in the app."
      />
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              autoComplete="email"
              textContentType="emailAddress"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {formState.errors.email ? (
          <AppText variant="formError" color={colors.danger}>
            {formState.errors.email.message}
          </AppText>
        ) : null}
        <Button
          label={isSubmitting ? 'Sending...' : 'Send Reset Link'}
          disabled={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />
        <Link href="/(auth)/login">
          <AppText variant="seeAll">Back to sign in</AppText>
        </Link>
        {__DEV__ ? (
          <AppText variant="caption" color={colors.textMuted}>
            Redirect URI: {getPasswordResetRedirectUri()}
          </AppText>
        ) : null}
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
