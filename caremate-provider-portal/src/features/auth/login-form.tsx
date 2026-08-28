'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/browser';
import { resolveCareHomePath, sanitizePostLoginPath } from '@/lib/safe-redirect';
import { Button } from '@/components/ui/button';
import { FormField, FormStack } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { TextLink } from '@/components/ui/text-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Login failed');

      const [{ count: providerCount, error: providerError }, { count: payerCount, error: payerError }] =
        await Promise.all([
          supabase
            .from('provider_org_members')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', data.user.id)
            .is('deleted_at', null),
          supabase
            .from('payer_org_members')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', data.user.id)
            .is('deleted_at', null),
        ]);

      if (providerError) throw providerError;
      if (payerError) throw payerError;

      const hasProvider = (providerCount ?? 0) > 0;
      const hasPayer = (payerCount ?? 0) > 0;

      if (!hasProvider && !hasPayer) {
        await supabase.auth.signOut();
        toast.error('This account is not a member of any care organization.');
        return;
      }

      const preferredKind =
        typeof document !== 'undefined'
          ? document.cookie
              .split('; ')
              .find((row) => row.startsWith('care_active_kind='))
              ?.split('=')[1]
          : null;

      const home = resolveCareHomePath({
        hasProvider,
        hasPayer,
        preferredKind,
      });
      const next = sanitizePostLoginPath(searchParams.get('next'), home);
      router.replace(next);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  });

  return (
    <Card className="w-full max-w-md border-border shadow-card">
      <CardHeader className="items-center gap-3 text-center">
        <Image
          src="/brand/caremate-wordmark.png"
          alt="CareMate"
          width={200}
          height={54}
          className="h-12 w-auto object-contain"
          priority
        />
        <div>
          <CardTitle className="text-xl text-brand-navy">Care Portal</CardTitle>
          <CardDescription className="mt-1">
            Sign in with your organization account — providers and payers.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FormStack>
            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
            </FormField>
            <FormField
              label="Password"
              htmlFor="password"
              error={errors.password?.message}
              labelExtra={
                <TextLink href="/forgot-password" className="text-xs">
                  Forgot password?
                </TextLink>
              }
            >
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
            </FormField>
            <Button type="submit" className="w-full" loading={loading} loadingLabel="Signing in…">
              Sign in
            </Button>
            <p className="text-center text-sm text-muted">
              First time? <TextLink href="/claim">Claim your organization</TextLink>
            </p>
          </FormStack>
        </form>
      </CardContent>
    </Card>
  );
}
