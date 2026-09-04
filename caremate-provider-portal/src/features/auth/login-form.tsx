'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { resolvePostLoginRedirectAction } from '@/domains/auth/actions';
import { createClient } from '@/lib/supabase/browser';
import {
  getRememberedLoginEmail,
  setRememberedLoginEmail,
} from '@/lib/remember-login';
import { Button } from '@/components/ui/button';
import { FormField, FormStack } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { TextLink } from '@/components/ui/text-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password is required'),
  rememberMe: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  useEffect(() => {
    const remembered = getRememberedLoginEmail();
    if (!remembered) return;
    reset({ email: remembered, password: '', rememberMe: true });
  }, [reset]);

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const email = values.email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: values.password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Login failed');

      setRememberedLoginEmail(email, values.rememberMe);

      const redirect = await resolvePostLoginRedirectAction(searchParams.get('next'));
      if (!redirect.ok) {
        await supabase.auth.signOut();
        toast.error(redirect.error);
        return;
      }

      router.replace(redirect.path);
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
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                className="size-4 rounded border-border accent-brand-navy"
                {...register('rememberMe')}
              />
              Remember me
            </label>
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
