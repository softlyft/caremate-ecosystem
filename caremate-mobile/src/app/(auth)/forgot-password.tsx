import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AppText } from '@/components/ui/AppText';
import { Button, Input, SectionTitle } from '@/components/ui/form-controls';
import { config } from '@/constants/env';
import { normalizeAccountEmail } from '@/domains/auth/device-account-binding';
import { useTranslation } from '@/domains/localization';
import { authService } from '@/services/auth-service';
import { toUserFacingErrorMessage } from '@/lib/user-facing-error';
import { useAppTheme } from '@/theme';
import { spacing } from '@/theme/colors';

const schema = z.object({
  email: z.email('Enter a valid email'),
});

type ForgotPasswordForm = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
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
      const email = normalizeAccountEmail(values.email);
      await authService.resetPassword(email);
      router.replace({
        pathname: '/(auth)/verify-reset',
        params: { email },
      });
    } catch (error) {
      Alert.alert(
        t('common.error'),
        toUserFacingErrorMessage(error, t('auth.forgot.sendFailed'), t('common.networkError')),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionTitle title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')} />
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t('auth.forgot.email')}
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
          label={isSubmitting ? t('common.loading') : t('auth.forgot.submit')}
          disabled={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />
        <Button
          label={t('auth.forgot.alreadyHaveCode')}
          variant="link"
          disabled={isSubmitting}
          onPress={handleSubmit((values) => {
            const email = normalizeAccountEmail(values.email);
            router.replace({
              pathname: '/(auth)/verify-reset',
              params: { email },
            });
          })}
        />
        <Link href="/(auth)/login">
          <AppText variant="seeAll">{t('auth.forgot.back')}</AppText>
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
});
