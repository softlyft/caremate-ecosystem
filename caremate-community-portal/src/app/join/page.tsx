import { JoinForm } from '@/features/join/join-form';

export default async function JoinPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
      style={{
        background:
          'radial-gradient(ellipse at top left, #ccfbf1 0%, transparent 55%), radial-gradient(ellipse at bottom right, #dbeafe 0%, #f6f8fb 60%)',
      }}
    >
      <div className="relative z-10 w-full max-w-lg">
        <JoinForm />
        <p className="mt-6 text-center text-xs text-muted">
          © {new Date().getFullYear()} CareMate · Softlyft
        </p>
      </div>
    </main>
  );
}
