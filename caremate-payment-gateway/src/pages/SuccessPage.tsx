import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { verifyCheckout } from '@/lib/api';
import { isAppDeepLinkReturn, openAppDeepLink, sanitizeAppReturnUrl } from '@/lib/checkout';
import { supabase } from '@/lib/supabase';

const DEFAULT_RETURN = 'caremate://billing/success';
const APP_STORE_IOS = 'https://apps.apple.com/app/caremate';
const APP_STORE_ANDROID = 'https://play.google.com/store/apps/details?id=com.softlyft.caremate';

function buildReturnUrl(base: string, searchParams: URLSearchParams): string {
  const reference =
    searchParams.get('reference')?.trim() ||
    searchParams.get('trxref')?.trim() ||
    searchParams.get('session_id')?.trim() ||
    null;

  if (!reference) return base;

  try {
    if (base.includes('://') && !base.startsWith('http')) {
      const joiner = base.includes('?') ? '&' : '?';
      return `${base}${joiner}reference=${encodeURIComponent(reference)}`;
    }
    const url = new URL(base);
    url.searchParams.set('reference', reference);
    return url.toString();
  } catch {
    const joiner = base.includes('?') ? '&' : '?';
    return `${base}${joiner}reference=${encodeURIComponent(reference)}`;
  }
}

export function SuccessPage() {
  const [searchParams] = useSearchParams();
  const returnBase = sanitizeAppReturnUrl(searchParams.get('return'), DEFAULT_RETURN);
  const returnUrl = useMemo(
    () => buildReturnUrl(returnBase, searchParams),
    [returnBase, searchParams],
  );
  const isAppReturn = isAppDeepLinkReturn(returnUrl);
  const reference =
    searchParams.get('reference')?.trim() ||
    searchParams.get('trxref')?.trim() ||
    searchParams.get('session_id')?.trim() ||
    null;
  const [manual, setManual] = useState(false);
  const [status, setStatus] = useState(isAppReturn ? 'Premium is activating…' : 'Confirming your payment…');

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      try {
        const result = await verifyCheckout({ reference });
        if (!cancelled) {
          setStatus(
            result.status === 'succeeded'
              ? 'Premium is active on your CareMate account.'
              : 'Payment received. Open the CareMate app to finish syncing.',
          );
        }
      } catch {
        if (!cancelled) {
          setStatus(
            'Payment received. Open the CareMate app and pull to refresh if Premium is not on yet.',
          );
        }
      }

      if (isAppReturn) {
        window.setTimeout(() => {
          if (cancelled) return;
          openAppDeepLink(returnUrl);
          void supabase.auth.signOut();
          setManual(true);
        }, 600);
        return;
      }

      void supabase.auth.signOut();
      if (!cancelled) setManual(true);
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [isAppReturn, reference, returnUrl]);

  return (
    <main className="page">
      <section className="card">
        <header className="brand">
          <img src="/caremate-icon.png" alt="CareMate" width={44} height={44} />
          <div>
            <p className="brand-name">CareMate</p>
            <p className="brand-sub">Payment successful</p>
          </div>
        </header>
        <h1>You&apos;re all set</h1>
        <p className="lead">{status}</p>
        {isAppReturn ? (
          manual ? (
            <a className="primary link" href={returnUrl}>
              Open CareMate
            </a>
          ) : null
        ) : (
          <>
            <p className="muted">
              Sign in to the CareMate app with the same account to use Standard or Family Premium.
            </p>
            <a className="primary link" href={APP_STORE_IOS}>
              Open on iOS
            </a>
            <a className="ghost link" href={APP_STORE_ANDROID}>
              Open on Android
            </a>
            {manual && !isAppDeepLinkReturn(returnBase) ? (
              <a className="ghost link" href={returnBase}>
                Back to CareMate
              </a>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
