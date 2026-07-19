import { ClaimOrgForm } from '@/features/auth/claim-org-form';

export default function ClaimOrgPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
      style={{
        background:
          'radial-gradient(ellipse at top left, #ccfbf1 0%, transparent 55%), radial-gradient(ellipse at bottom right, #dbeafe 0%, #f6f8fb 60%)',
      }}
    >
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <ClaimOrgForm />
        <p className="mt-6 text-center text-xs text-muted">
          © {new Date().getFullYear()} CareMate · SoftLyft
        </p>
      </div>
    </main>
  );
}
