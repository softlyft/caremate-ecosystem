import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold text-brand-navy">Page not found</h1>
        <p className="text-sm text-muted">
          That route does not exist in the CareMate Provider Portal.
        </p>
        <Link
          href="/app/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
