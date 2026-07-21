'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password is required'),
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

      const { count: membershipCount } = await supabase
        .from('community_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', data.user.id)
        .eq('status', 'approved');

      const next = searchParams.get('next');
      if ((membershipCount ?? 0) === 0) {
        router.replace('/join');
      } else {
        router.replace(next || '/app/dashboard');
      }
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
          <CardTitle className="text-xl text-brand-navy">Community Portal</CardTitle>
          <CardDescription className="mt-1">
            Sign in to join chapters, events, and recognition.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
          </div>
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            loadingLabel="Signing in…"
          >
            Sign in
          </Button>
          <p className="text-center text-sm text-muted">
            New here?{' '}
            <Link href="/join" className="font-medium text-primary hover:underline">
              Join the community
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
