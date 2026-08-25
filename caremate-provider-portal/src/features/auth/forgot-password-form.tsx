'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  completePasswordResetAction,
  startPasswordResetAction,
  verifyPasswordResetAction,
} from '@/domains/password-reset/actions';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_MESSAGE,
  meetsPasswordRequirements,
} from '@/lib/password';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Step = 'email' | 'code' | 'password';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [resetId, setResetId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function onSubmitEmail(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await startPasswordResetAction({ email });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setResetId(result.data.resetId);
      setStep('code');
      toast.success(result.data.message);
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await verifyPasswordResetAction({ resetId, code });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setStep('password');
      toast.success('Code verified — choose a new password');
    } finally {
      setLoading(false);
    }
  }

  async function onSetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!meetsPasswordRequirements(password)) {
      toast.error(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      const result = await completePasswordResetAction({ resetId, password });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success('Password updated — sign in with your new password');
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  }

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
          <CardTitle className="text-xl text-brand-navy">Forgot password</CardTitle>
          <CardDescription className="mt-1">
            We&apos;ll email a verification code so you can set a new password for your Care Portal
            account.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="flex gap-2 text-xs text-muted">
          {(['email', 'code', 'password'] as Step[]).map((item, index) => (
            <li
              key={item}
              className={
                step === item
                  ? 'rounded-full bg-primary px-2.5 py-1 font-medium text-white'
                  : 'rounded-full bg-surface-muted px-2.5 py-1'
              }
            >
              {index + 1}. {item === 'email' ? 'Email' : item === 'code' ? 'Verify' : 'Password'}
            </li>
          ))}
        </ol>

        {step === 'email' ? (
          <form onSubmit={onSubmitEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Account email</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" loading={loading} loadingLabel="Sending…">
              Send verification code
            </Button>
          </form>
        ) : null}

        {step === 'code' ? (
          <form onSubmit={onVerifyCode} className="space-y-4">
            <p className="text-sm text-muted">
              Enter the verification code sent to{' '}
              <span className="font-medium text-foreground">{email}</span>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-code">Verification code</Label>
              <Input
                id="reset-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" loading={loading} loadingLabel="Verifying…">
              Verify code
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={loading}
              onClick={() => {
                setStep('email');
                setCode('');
                setResetId('');
              }}
            >
              Start over
            </Button>
          </form>
        ) : null}

        {step === 'password' ? (
          <form onSubmit={onSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">New password</Label>
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-password-confirm">Confirm password</Label>
              <Input
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              loadingLabel="Updating…"
            >
              Update password
            </Button>
          </form>
        ) : null}

        <p className="text-center text-sm text-muted">
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
