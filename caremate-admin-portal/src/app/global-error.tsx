'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold text-brand-navy">Something went wrong</h1>
          <p className="text-sm text-muted">
            The admin portal hit an unexpected error
            {error.digest ? ` (${error.digest})` : ''}. You can try again or return home.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-muted"
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
