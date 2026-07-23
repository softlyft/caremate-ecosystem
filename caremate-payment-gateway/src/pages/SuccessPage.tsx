import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { openAppDeepLink, sanitizeAppReturnUrl } from '@/lib/checkout';
import { supabase } from '@/lib/supabase';

const DEFAULT_RETURN = 'caremate://billing/success';

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
  const [manual, setManual] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      openAppDeepLink(returnUrl);
      void supabase.auth.signOut();
      setManual(true);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [returnUrl]);

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
        <p className="lead">Premium is activating. Returning you to the CareMate app…</p>
        {manual ? (
          <a className="primary link" href={returnUrl}>
            Open CareMate
          </a>
        ) : null}
      </section>
    </main>
  );
}
