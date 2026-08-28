'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  completeOrgClaimAction,
  startOrgClaimAction,
  verifyOrgClaimAction,
} from '@/domains/claim/actions';
import type { CareOrgKind } from '@/types/database';
import { PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_MESSAGE, meetsPasswordRequirements } from '@/lib/password';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { FormField, FormStack } from '@/components/ui/form-field';
import { TextLink } from '@/components/ui/text-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type Step = 'email' | 'code' | 'password';

type OrgOption = { id: string; name: string };

export function ClaimOrgForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);

  const [orgKind, setOrgKind] = useState<CareOrgKind>('provider');
  const [email, setEmail] = useState('');
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [claimId, setClaimId] = useState('');
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
        orgKind,
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
      setStep('code');
      toast.success('Enter the verification code sent to your email');
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
      const result = await startOrgClaimAction({ email, organizationId, orgKind });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (!result.data.claimId) {
        toast.error('Could not start claim for that organization');
        return;
      }
      setClaimId(result.data.claimId);
      setStep('code');
      toast.success('Enter the verification code sent to your email');
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await verifyOrgClaimAction({ claimId, code, orgKind });
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
    if (!meetsPasswordRequirements(password)) {
      toast.error(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      const result = await completeOrgClaimAction({
        claimId,
        password,
        displayName: displayName.trim() || undefined,
        orgKind,
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
      router.replace(result.data.orgKind === 'payer' ? '/payer/dashboard' : '/app/dashboard');
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
          <form onSubmit={onSubmitEmail}>
            <FormStack>
              <FormField label="Care Org type" htmlFor="claim-org-kind">
                <Select
                  id="claim-org-kind"
                  value={orgKind}
                  onChange={(e) => {
                    setOrgKind(e.target.value === 'payer' ? 'payer' : 'provider');
                    setOrganizations([]);
                    setOrganizationId('');
                  }}
                >
                  <option value="provider">Provider</option>
                  <option value="payer">Payer</option>
                </Select>
              </FormField>

              <FormField
                label="Organization contact email"
                htmlFor="claim-email"
                hint={
                  orgKind === 'payer'
                    ? 'Must match the contact email SoftLyft stored on your payer catalog listing.'
                    : 'Must match an email already stored for your organization in CareMate (location or organization contact).'
                }
              >
                <Input
                  id="claim-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormField>

              {organizations.length > 1 ? (
                <FormField label="Organization" htmlFor="claim-org">
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
                    className="mt-2 w-full"
                    loading={loading}
                    loadingLabel="Continuing…"
                    onClick={onSelectOrgAndSend}
                  >
                    Continue with selected organization
                  </Button>
                </FormField>
              ) : (
                <Button type="submit" className="w-full" loading={loading} loadingLabel="Looking up…">
                  Continue
                </Button>
              )}
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
              <FormField label="Verification code" htmlFor="claim-code">
                <Input
                  id="claim-code"
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
              <FormField label="Your name (optional)" htmlFor="display-name">
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </FormField>
              <FormField
                label="Admin password"
                htmlFor="claim-password"
                hint={PASSWORD_REQUIREMENTS_MESSAGE}
              >
                <Input
                  id="claim-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>
              <FormField label="Confirm password" htmlFor="claim-password-confirm">
                <Input
                  id="claim-password-confirm"
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
                loadingLabel="Creating admin…"
              >
                Create admin account & enter portal
              </Button>
            </FormStack>
          </form>
        ) : null}

        <p className="text-center text-sm text-muted">
          Already claimed? <TextLink href="/login">Sign in</TextLink>
        </p>
      </CardContent>
    </Card>
  );
}
