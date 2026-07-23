import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { openAppDeepLink, sanitizeAppReturnUrl } from '@/lib/checkout';
import { supabase } from '@/lib/supabase';

const DEFAULT_RETURN = 'caremate://billing/cancel';

export function CancelPage() {
  const [searchParams] = useSearchParams();
  const returnUrl = sanitizeAppReturnUrl(searchParams.get('return'), DEFAULT_RETURN);
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
            <p className="brand-sub">Checkout cancelled</p>
          </div>
        </header>
        <h1>No charge made</h1>
        <p className="lead">Returning you to CareMate so you can try again later.</p>
        {manual ? (
          <a className="primary link" href={returnUrl}>
            Open CareMate
          </a>
        ) : null}
      </section>
    </main>
  );
}
