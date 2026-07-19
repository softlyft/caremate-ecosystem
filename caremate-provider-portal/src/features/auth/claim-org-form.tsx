'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  completeOrgClaimAction,
  startOrgClaimAction,
  verifyOrgClaimAction,
} from '@/domains/claim/actions';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

type Step = 'email' | 'code' | 'password';

type OrgOption = { id: string; name: string };

export function ClaimOrgForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [claimId, setClaimId] = useState('');
  const [debugCode, setDebugCode] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  async function onSubmitEmail(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await startOrgClaimAction({
        email,
        organizationId: organizationId || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setOrganizations(result.data.organizations);

      if (!result.data.claimId) {
        toast.message('Multiple organizations match this email. Select one to continue.');
        return;
      }

      setClaimId(result.data.claimId);
      setOrganizationId(result.data.selectedOrganizationId);
      setDebugCode(result.data.debugCode);
      setStep('code');
      toast.success('Verification code ready');
    } finally {
      setLoading(false);
    }
  }

  async function onSelectOrgAndSend() {
    if (!organizationId) {
      toast.error('Select an organization');
      return;
    }
    setLoading(true);
    try {
      const result = await startOrgClaimAction({ email, organizationId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (!result.data.claimId) {
        toast.error('Could not start claim for that organization');
        return;
      }
      setClaimId(result.data.claimId);
      setDebugCode(result.data.debugCode);
      setStep('code');
      toast.success('Verification code ready');
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await verifyOrgClaimAction({ claimId, code });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setStep('password');
      toast.success('Email verified — create your admin password');
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
    setLoading(true);
    try {
      const result = await completeOrgClaimAction({
        claimId,
        password,
        displayName: displayName.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password,
      });
      if (error) {
        toast.error(error.message);
        router.replace('/login');
        return;
      }

      toast.success('Organization claimed — welcome');
      router.replace('/app/dashboard');
      router.refresh();
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
          <CardTitle className="text-xl text-brand-navy">Claim your organization</CardTitle>
          <CardDescription className="mt-1">
            Confirm the email on your CareMate listing, verify a code, then create the admin
            account. No open registration.
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
              <Label htmlFor="claim-email">Organization contact email</Label>
              <Input
                id="claim-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted">
                Must match an email already stored for your organization in CareMate (location or
                organization contact).
              </p>
            </div>

            {organizations.length > 1 ? (
              <div className="space-y-2">
                <Label htmlFor="claim-org">Organization</Label>
                <Select
                  id="claim-org"
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                >
                  <option value="">Select organization…</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  className="w-full"
                  disabled={loading}
                  onClick={onSelectOrgAndSend}
                >
                  {loading ? 'Continuing…' : 'Continue with selected organization'}
                </Button>
              </div>
            ) : (
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Looking up…' : 'Continue'}
              </Button>
            )}
          </form>
        ) : null}

        {step === 'code' ? (
          <form onSubmit={onVerifyCode} className="space-y-4">
            <div className="rounded-lg border border-warning/40 bg-warning-light px-3 py-3 text-sm text-foreground">
              <p className="font-medium">MVP: email delivery is not wired yet</p>
              <p className="mt-1 text-muted">Use this verification code:</p>
              <p className="mt-2 font-mono text-2xl tracking-[0.3em] text-brand-navy">{debugCode}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="claim-code">Verification code</Label>
              <Input
                id="claim-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify code'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={loading}
              onClick={() => {
                setStep('email');
                setCode('');
                setDebugCode('');
              }}
            >
              Start over
            </Button>
          </form>
        ) : null}

        {step === 'password' ? (
          <form onSubmit={onSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Your name (optional)</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="claim-password">Admin password</Label>
              <Input
                id="claim-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="claim-password-confirm">Confirm password</Label>
              <Input
                id="claim-password-confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating admin…' : 'Create admin account & enter portal'}
            </Button>
          </form>
        ) : null}

        <p className="text-center text-sm text-muted">
          Already claimed?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
