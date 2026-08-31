import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import {
  Button,
  FormField,
  FormStack,
  Input,
  SectionTitle,
  TextLink,
} from '@/components/ui/form-controls';
import { Screen } from '@/components/ui/screen-states';
import { config } from '@/constants/env';
import { normalizeAccountEmail } from '@/domains/auth/device-account-binding';
import { useTranslation } from '@/domains/localization';
import { resolvePostSignupHref } from '@/domains/onboarding';
import { AuthBrandHeader } from '@/features/auth/AuthBrandHeader';
import { useAuthStore } from '@/features/auth/store';
import { useResendCooldown } from '@/hooks/use-resend-cooldown';
import { toUserFacingErrorMessage } from '@/lib/user-facing-error';
import { useAppTheme } from '@/theme';
import { spacing } from '@/theme/colors';

type VerifyForm = {
  code: string;
};

const RESEND_COOLDOWN_SECONDS = 45;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{
    email?: string | string[];
    fullName?: string | string[];
    phone?: string | string[];
  }>();
  const email = normalizeAccountEmail(firstParam(params.email));
  const fullName = firstParam(params.fullName).trim();
  const phone = firstParam(params.phone).trim();

  const verifySignupEmail = useAuthStore((state) => state.verifySignupEmail);
  const resendSignupEmail = useAuthStore((state) => state.resendSignupEmail);
  const isLoading = useAuthStore((state) => state.isLoading);
  const { resendSeconds, startCooldown } = useResendCooldown(RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        code: z
          .string()
          .trim()
          .regex(/^\d{6}$/, t('auth.verify.codeInvalid')),
      }),
    [t],
  );

  const { control, handleSubmit, formState, setValue } = useForm<VerifyForm>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { code: '' },
  });

  async function onSubmit(values: VerifyForm) {
    try {
      if (!config.isSupabaseConfigured) {
        Alert.alert(t('auth.config.supabaseTitle'), t('auth.config.supabaseMessage'));
        return;
      }
      if (!email) {
        Alert.alert(t('auth.verify.error'), t('auth.verify.missingEmail'));
        return;
      }

      await verifySignupEmail(email, values.code, {
        ...(fullName ? { fullName } : {}),
        ...(phone ? { phone } : {}),
      });
      const href = await resolvePostSignupHref();
      router.replace(href);
    } catch (error) {
      Alert.alert(
        t('auth.verify.error'),
        toUserFacingErrorMessage(
          error,
          t('auth.verify.error'),
          t('common.networkError'),
          t('common.emailDeliveryError'),
        ),
      );
    }
  }

  async function onResend() {
    if (!email || resendSeconds > 0 || isResending) {
      return;
    }
    try {
      setIsResending(true);
      await resendSignupEmail(email);
      startCooldown();
      Alert.alert(t('auth.verify.resentTitle'), t('auth.verify.resentMessage'));
    } catch (error) {
      Alert.alert(
        t('auth.verify.error'),
        toUserFacingErrorMessage(
          error,
          t('auth.verify.error'),
          t('common.networkError'),
          t('common.emailDeliveryError'),
        ),
      );
    } finally {
      setIsResending(false);
    }
  }

  if (!email) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Screen padded={false} style={styles.container}>
          <SectionTitle title={t('auth.verify.title')} subtitle={t('auth.verify.missingEmail')} />
          <TextLink href="/(auth)/register">{t('auth.verify.backToRegister')}</TextLink>
        </Screen>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen padded={false} style={styles.container}>
        <AuthBrandHeader>
          <SectionTitle
            title={t('auth.verify.title')}
            subtitle={t('auth.verify.subtitle', { email })}
          />
        </AuthBrandHeader>
        <FormStack style={styles.form}>
          <FormField error={formState.errors.code?.message}>
            <Controller
              control={control}
              name="code"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder={t('auth.verify.codePlaceholder')}
                  onBlur={onBlur}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, '').slice(0, 6);
                    onChange(digits);
                    setValue('code', digits, { shouldValidate: true });
                  }}
                  value={value}
                />
              )}
            />
          </FormField>

          <Button
            label={isLoading ? t('common.loading') : t('auth.verify.submit')}
            disabled={isLoading || !formState.isValid}
            onPress={handleSubmit(onSubmit)}
          />

          <Button
            label={
              resendSeconds > 0
                ? t('auth.verify.resendIn', { seconds: resendSeconds })
                : isResending
                  ? t('common.loading')
                  : t('auth.verify.resend')
            }
            variant="secondary"
            disabled={resendSeconds > 0 || isResending || isLoading}
            onPress={() => void onResend()}
          />

          <TextLink href="/(auth)/login">{t('auth.verify.backToSignIn')}</TextLink>
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
