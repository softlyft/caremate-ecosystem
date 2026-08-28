import { ButtonLink } from '@/components/ui/button-link';

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold text-brand-navy">Page not found</h1>
        <p className="text-sm text-muted">That route does not exist in the CareMate Admin Portal.</p>
        <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
      </div>
    </main>
  );
}
