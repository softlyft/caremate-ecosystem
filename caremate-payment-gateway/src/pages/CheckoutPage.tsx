import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

import { fetchActivePrice, fetchPatientId, startProviderCheckout } from '@/lib/api';
import {
  formatAmount,
  intervalLabel,
  parseCheckoutParams,
  planLabel,
  providerForCurrency,
  type CheckoutParams,
} from '@/lib/checkout';
import { hydrateSessionFromHash, isSupabaseConfigured, signInWithPassword, supabase } from '@/lib/supabase';

const APP_STORE_IOS = 'https://apps.apple.com/app/caremate';
const APP_STORE_ANDROID = 'https://play.google.com/store/apps/details?id=com.softlyft.caremate';

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const parsed = useMemo(() => parseCheckoutParams(searchParams), [searchParams]);

  const [session, setSession] = useState<Session | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [amountLabel, setAmountLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const params = 'error' in parsed ? null : parsed;

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        if (!isSupabaseConfigured) {
          throw new Error('Payment app is missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.');
        }
        if ('error' in parsed) {
          throw new Error(parsed.error);
        }

        const nextSession = await hydrateSessionFromHash();
        if (!active) return;
        if (!nextSession) {
          setNeedsSignIn(true);
          setSession(null);
          return;
        }
        setNeedsSignIn(false);
        setSession(nextSession);
        await loadAccount(nextSession, parsed);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not prepare checkout');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    async function loadAccount(nextSession: Session, checkout: CheckoutParams) {
      const [price, profilePatientId] = await Promise.all([
        fetchActivePrice({
          planType: checkout.planType,
          billingInterval: checkout.billingInterval,
          currency: checkout.currency,
        }),
        checkout.patientId
          ? Promise.resolve(checkout.patientId)
          : fetchPatientId(nextSession.user.id),
      ]);

      if (!price) {
        throw new Error('No active price found for this plan and currency.');
      }

      setPatientId(profilePatientId);
      setAmountLabel(formatAmount(price.amount_minor, checkout.currency));
    }

    void boot();
    return () => {
      active = false;
    };
  }, [parsed]);

  async function onSignedIn(nextSession: Session) {
    if (!params) return;
    setError(null);
    setLoading(true);
    try {
      setSession(nextSession);
      setNeedsSignIn(false);
      const [price, profilePatientId] = await Promise.all([
        fetchActivePrice({
          planType: params.planType,
          billingInterval: params.billingInterval,
          currency: params.currency,
        }),
        params.patientId ? Promise.resolve(params.patientId) : fetchPatientId(nextSession.user.id),
      ]);
      if (!price) {
        throw new Error('No active price found for this plan and currency.');
      }
      setPatientId(profilePatientId);
      setAmountLabel(formatAmount(price.amount_minor, params.currency));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not prepare checkout');
    } finally {
      setLoading(false);
    }
  }

  async function pay(checkout: CheckoutParams) {
    setPaying(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/success?return=${encodeURIComponent(checkout.returnSuccess)}`;
      const cancelUrl = `${origin}/cancel?return=${encodeURIComponent(checkout.returnCancel)}`;

      const result = await startProviderCheckout({
        planType: checkout.planType,
        billingInterval: checkout.billingInterval,
        currency: checkout.currency,
        householdId: checkout.householdId,
        successUrl,
        cancelUrl,
      });

      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <p className="muted">Preparing secure checkout…</p>
      </Shell>
    );
  }

  if (!params) {
    return (
      <Shell>
        <h1>Checkout unavailable</h1>
        <p className="error">{error ?? 'Missing checkout parameters.'}</p>
      </Shell>
    );
  }

  if (needsSignIn || !session) {
    return (
      <Shell>
        <div className="badge">
          {providerForCurrency(params.currency) === 'paystack' ? 'Paystack · NGN' : 'Stripe · USD'}
        </div>
        <h1>Sign in to pay</h1>
        <p className="lead">
          Use the same email and password as the CareMate app. New accounts are created in the app
          first.
        </p>
        <SignInForm
          onSignedIn={(next) => {
            void onSignedIn(next);
          }}
        />
        {error ? <p className="error">{error}</p> : null}
        <p className="muted">
          Don&apos;t have an account?{' '}
          <a href={APP_STORE_IOS}>Download for iOS</a>
          {' · '}
          <a href={APP_STORE_ANDROID}>Get it on Android</a>
        </p>
      </Shell>
    );
  }

  const provider = providerForCurrency(params.currency);
  const cancelIsApp = params.returnCancel.toLowerCase().startsWith('caremate://');

  return (
    <Shell>
      <div className="badge">{provider === 'paystack' ? 'Paystack · NGN' : 'Stripe · USD'}</div>
      <h1>Confirm your plan</h1>
      <p className="lead">
        You&apos;ll complete payment with {provider === 'paystack' ? 'Paystack' : 'Stripe'}. Premium
        unlocks on the same CareMate account in the app.
      </p>

      <dl className="summary">
        <div>
          <dt>Plan</dt>
          <dd>{planLabel(params.planType)}</dd>
        </div>
        <div>
          <dt>Billing</dt>
          <dd>{intervalLabel(params.billingInterval)}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>{amountLabel ?? '—'}</dd>
        </div>
        <div>
          <dt>Account</dt>
          <dd>{session.user.email ?? session.user.id}</dd>
        </div>
        {patientId ? (
          <div>
            <dt>Patient ID</dt>
            <dd className="mono">{patientId}</dd>
          </div>
        ) : null}
        {params.planType === 'family' && params.householdId ? (
          <div>
            <dt>Household</dt>
            <dd className="mono">{params.householdId}</dd>
          </div>
        ) : null}
      </dl>

      {error ? <p className="error">{error}</p> : null}

      <button className="primary" type="button" disabled={paying} onClick={() => void pay(params)}>
        {paying ? 'Redirecting…' : `Pay with ${provider === 'paystack' ? 'Paystack' : 'Stripe'}`}
      </button>

      <button
        className="ghost"
        type="button"
        disabled={paying}
        onClick={() => {
          void supabase.auth.signOut().finally(() => {
            window.location.href = params.returnCancel;
          });
        }}
      >
        {cancelIsApp ? 'Cancel and return to app' : 'Cancel'}
      </button>
    </Shell>
  );
}

function SignInForm({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const session = await signInWithPassword(email, password);
      onSignedIn(session);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={(event) => void onSubmit(event)}>
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {formError ? <p className="error">{formError}</p> : null}
      <button className="primary" type="submit" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Continue'}
      </button>
    </form>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="page">
      <section className="card">
        <header className="brand">
          <img src="/caremate-icon.png" alt="CareMate" width={44} height={44} />
          <div>
            <p className="brand-name">CareMate</p>
            <p className="brand-sub">Secure payment</p>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
