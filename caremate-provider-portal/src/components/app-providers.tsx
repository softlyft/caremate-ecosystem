'use client';

import { Toaster } from 'sonner';
import { TopRouteLoader } from '@/components/top-route-loader';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopRouteLoader />
      {children}
      <Toaster richColors position="top-right" />
    </>
  );
}
