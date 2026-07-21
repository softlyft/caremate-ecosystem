import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { hydrateSessionFromHash, isSupabaseConfigured, supabase } from '@/lib/supabase';

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const parsed = useMemo(() => parseCheckoutParams(searchParams), [searchParams]);

  const [session, setSession] = useState<Session | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [amountLabel, setAmountLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          throw new Error('Sign in from the CareMate app to continue payment.');
        }
        setSession(nextSession);

        const [price, profilePatientId] = await Promise.all([
          fetchActivePrice({
            planType: parsed.planType,
            billingInterval: parsed.billingInterval,
            currency: parsed.currency,
          }),
          parsed.patientId
            ? Promise.resolve(parsed.patientId)
            : fetchPatientId(nextSession.user.id),
        ]);

        if (!active) return;
        if (!price) {
          throw new Error('No active price found for this plan and currency.');
        }

        setPatientId(profilePatientId);
        setAmountLabel(formatAmount(price.amount_minor, parsed.currency));
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not prepare checkout');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void boot();
    return () => {
      active = false;
    };
  }, [parsed]);

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

  if (error || !params || !session) {
    return (
      <Shell>
        <h1>Checkout unavailable</h1>
        <p className="error">{error ?? 'Missing checkout parameters.'}</p>
        <p className="muted">
          Open Premium in the CareMate app and tap Pay again. If this keeps happening, sign out and
          back in, then retry.
        </p>
      </Shell>
    );
  }

  const provider = providerForCurrency(params.currency);

  return (
    <Shell>
      <div className="badge">{provider === 'paystack' ? 'Paystack · NGN' : 'Stripe · USD'}</div>
      <h1>Confirm your plan</h1>
      <p className="lead">
        You&apos;ll complete payment with {provider === 'paystack' ? 'Paystack' : 'Stripe'}, then
        return to CareMate.
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

      <button className="primary" type="button" disabled={paying} onClick={() => void pay(params)}>
        {paying ? 'Redirecting…' : `Pay with ${provider === 'paystack' ? 'Paystack' : 'Stripe'}`}
      </button>

      <button
        className="ghost"
        type="button"
        disabled={paying}
        onClick={() => {
          void supabase.auth.signOut();
          window.location.href = params.returnCancel;
        }}
      >
        Cancel and return to app
      </button>
    </Shell>
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
