'use client';

import Image from 'next/image';
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
import { FormField, FormStack } from '@/components/ui/form-field';
import { TextLink } from '@/components/ui/text-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
          <form onSubmit={onSubmitEmail}>
            <FormStack>
              <FormField label="Account email" htmlFor="reset-email">
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormField>
              <Button type="submit" className="w-full" loading={loading} loadingLabel="Sending…">
                Send verification code
              </Button>
            </FormStack>
          </form>
        ) : null}

        {step === 'code' ? (
          <form onSubmit={onVerifyCode}>
            <FormStack>
              <p className="text-sm text-muted">
                Enter the verification code sent to{' '}
                <span className="font-medium text-foreground">{email}</span>.
              </p>
              <FormField label="Verification code" htmlFor="reset-code">
                <Input
                  id="reset-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </FormField>
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
            </FormStack>
          </form>
        ) : null}

        {step === 'password' ? (
          <form onSubmit={onSetPassword}>
            <FormStack>
              <FormField
                label="New password"
                htmlFor="reset-password"
                hint={PASSWORD_REQUIREMENTS_MESSAGE}
              >
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>
              <FormField label="Confirm password" htmlFor="reset-password-confirm">
                <Input
                  id="reset-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </FormField>
              <Button
                type="submit"
                className="w-full"
                loading={loading}
                loadingLabel="Updating…"
              >
                Update password
              </Button>
            </FormStack>
          </form>
        ) : null}

        <p className="text-center text-sm text-muted">
          Remembered it? <TextLink href="/login">Sign in</TextLink>
        </p>
      </CardContent>
    </Card>
  );
}
