import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useMemo } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import {
  Button,
  FormField,
  FormStack,
  Input,
  PasswordInput,
  SectionTitle,
  TextLink,
} from '@/components/ui/form-controls';
import { Screen } from '@/components/ui/screen-states';
import { config } from '@/constants/env';
import { confirmDeviceAccountForAuth } from '@/domains/auth/confirm-device-account';
import { normalizeAccountEmail } from '@/domains/auth/device-account-binding';
import { continueAfterAuth } from '@/domains/emergency/continue-after-auth';
import { useTranslation } from '@/domains/localization';
import { AuthBrandHeader } from '@/features/auth/AuthBrandHeader';
import { useAuthStore } from '@/features/auth/store';
import { authService } from '@/services/auth-service';
import { isNetworkError, toUserFacingErrorMessage } from '@/lib/user-facing-error';
import { useAppTheme } from '@/theme';
import { spacing } from '@/theme/colors';

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const signIn = useAuthStore((state) => state.signIn);
  const isLoading = useAuthStore((state) => state.isLoading);

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.email(t('auth.validation.emailInvalid')),
        password: z.string().min(8, t('auth.validation.passwordMin')),
      }),
    [t],
  );

  const { control, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginForm) {
    try {
      if (!config.isSupabaseConfigured) {
        Alert.alert(t('auth.config.supabaseTitle'), t('auth.config.supabaseMessage'));
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
      await signIn(email, values.password);
      await continueAfterAuth();
    } catch (error) {
      const message = toUserFacingErrorMessage(
        error,
        t('auth.login.error'),
        t('common.networkError'),
      );
      if (!isNetworkError(error) && /email not confirmed|confirm your email/i.test(message)) {
        Alert.alert(t('auth.login.error'), t('auth.login.emailNotConfirmed'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('auth.verify.open'),
            onPress: () =>
              router.push({
                pathname: '/(auth)/verify-email',
                params: { email: normalizeAccountEmail(values.email) },
              } as Href),
          },
        ]);
        return;
      }
      Alert.alert(t('auth.login.error'), message);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen padded={false} style={styles.container}>
      <AuthBrandHeader>
        <SectionTitle title={t('auth.login.title')} subtitle={t('auth.login.subtitle')} />
      </AuthBrandHeader>
      <FormStack style={styles.form}>
        <FormField error={formState.errors.email?.message}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder={t('auth.login.emailPlaceholder')}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </FormField>
        <FormField error={formState.errors.password?.message}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <PasswordInput
                placeholder={t('auth.login.passwordPlaceholder')}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </FormField>
        <TextLink href="/(auth)/forgot-password">{t('auth.login.forgot')}</TextLink>
        <Button
          label={isLoading ? t('common.loading') : t('auth.login.submit')}
          disabled={isLoading}
          onPress={handleSubmit(onSubmit)}
        />
        <TextLink href="/(auth)/register">
          {t('auth.login.noAccount')} {t('auth.login.register')}
        </TextLink>
        <Button
          label={t('auth.login.continueGuest')}
          variant="ghost"
          onPress={() => {
            void authService.setOnboardingComplete(true).then(() => {
              router.replace('/(app)/(tabs)');
            });
          }}
        />
      </FormStack>
      </Screen>
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
