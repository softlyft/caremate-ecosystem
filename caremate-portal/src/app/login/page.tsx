import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/login-form';

export default function LoginPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{
        background:
          'radial-gradient(ellipse at top left, #dcfce7 0%, transparent 50%), radial-gradient(ellipse at bottom right, #dbeafe 0%, #f8fafc 55%)',
      }}
    >
      <Suspense fallback={<div className="relative z-10 text-muted">Loading…</div>}>
        <div className="relative z-10 w-full max-w-md">
          <LoginForm />
        </div>
      </Suspense>
    </main>
  );
}
