import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { isAppDeepLinkReturn, openAppDeepLink, sanitizeAppReturnUrl } from '@/lib/checkout';
import { supabase } from '@/lib/supabase';

const DEFAULT_RETURN = 'caremate://billing/cancel';

export function CancelPage() {
  const [searchParams] = useSearchParams();
  const returnUrl = sanitizeAppReturnUrl(searchParams.get('return'), DEFAULT_RETURN);
  const isAppReturn = isAppDeepLinkReturn(returnUrl);
  const [manual, setManual] = useState(!isAppReturn);

  useEffect(() => {
    void supabase.auth.signOut();
    if (!isAppReturn) {
      return;
    }
    const timer = window.setTimeout(() => {
      openAppDeepLink(returnUrl);
      setManual(true);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [isAppReturn, returnUrl]);

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
        <p className="lead">
          {isAppReturn
            ? 'Returning you to CareMate so you can try again later.'
            : 'You can close this page or choose a plan again when you are ready.'}
        </p>
        {manual ? (
          <a className="primary link" href={returnUrl}>
            {isAppReturn ? 'Open CareMate' : 'Back to CareMate'}
          </a>
        ) : null}
      </section>
    </main>
  );
}
