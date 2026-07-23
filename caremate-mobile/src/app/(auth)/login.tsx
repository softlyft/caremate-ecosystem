import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AppText } from '@/components/ui/AppText';
import { Button, Input, PasswordInput, SectionTitle } from '@/components/ui/form-controls';
import { config } from '@/constants/env';
import { useTranslation } from '@/domains/localization';
import { AuthBrandHeader } from '@/features/auth/AuthBrandHeader';
import { useAuthStore } from '@/features/auth/store';
import { authService } from '@/services/auth-service';
import { useAppTheme } from '@/theme';
import { spacing } from '@/theme/colors';

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const signIn = useAuthStore((state) => state.signIn);
  const isLoading = useAuthStore((state) => state.isLoading);

  const { control, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginForm) {
    try {
      if (!config.isSupabaseConfigured) {
        Alert.alert(
          'Supabase not configured',
          'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to continue with cloud auth. Local data features still work offline.',
        );
        return;
      }
      await signIn(values.email, values.password);
      router.replace('/(app)/(tabs)');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.login.error');
      Alert.alert(t('auth.login.error'), message);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AuthBrandHeader>
        <SectionTitle title={t('auth.login.title')} subtitle={t('auth.login.subtitle')} />
      </AuthBrandHeader>
      <View style={styles.form}>
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
        {formState.errors.email ? (
          <AppText variant="formError" color={colors.danger}>
            {formState.errors.email.message}
          </AppText>
        ) : null}
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
        {formState.errors.password ? (
          <AppText variant="formError" color={colors.danger}>
            {formState.errors.password.message}
          </AppText>
        ) : null}
        <Link href="/(auth)/forgot-password">
          <AppText variant="seeAll">{t('auth.login.forgot')}</AppText>
        </Link>
        <Button
          label={isLoading ? t('common.loading') : t('auth.login.submit')}
          disabled={isLoading}
          onPress={handleSubmit(onSubmit)}
        />
        <Link href="/(auth)/register">
          <AppText variant="seeAll">
            {t('auth.login.noAccount')} {t('auth.login.register')}
          </AppText>
        </Link>
        <Button
          label={t('auth.login.continueGuest')}
          variant="ghost"
          onPress={() => {
            void authService.setOnboardingComplete(true).then(() => {
              router.replace('/(app)/(tabs)');
            });
          }}
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
