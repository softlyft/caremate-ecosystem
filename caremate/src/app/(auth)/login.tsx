import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AppText } from '@/components/ui/AppText';
import { Button, Input, SectionTitle } from '@/components/ui/form-controls';
import { useAuthStore } from '@/features/auth/store';
import { config } from '@/constants/env';
import { useAppTheme } from '@/theme';
import { spacing } from '@/theme/colors';

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const signIn = useAuthStore((state) => state.signIn);
  const signInDemo = useAuthStore((state) => state.signInDemo);
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
      const message = error instanceof Error ? error.message : 'Unable to sign in';
      Alert.alert('Sign in failed', message);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionTitle title="Welcome back" subtitle="Sign in to access your CareMate profile." />
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
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
            <Input
              secureTextEntry
              placeholder="Password"
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
          <AppText variant="seeAll">Forgot password?</AppText>
        </Link>
        <Button
          label={isLoading ? 'Signing in...' : 'Sign In'}
          disabled={isLoading}
          onPress={handleSubmit(onSubmit)}
        />
        {!config.isSupabaseConfigured ? (
          <Button
            label="Continue Offline Demo"
            variant="secondary"
            onPress={async () => {
              await signInDemo();
              router.replace('/(app)/(tabs)');
            }}
          />
        ) : null}
        <Link href="/(auth)/register">
          <AppText variant="seeAll">Create an account</AppText>
        </Link>
        <Button
          label="Continue as Guest"
          variant="ghost"
          onPress={() => router.replace('/(app)/(tabs)')}
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
