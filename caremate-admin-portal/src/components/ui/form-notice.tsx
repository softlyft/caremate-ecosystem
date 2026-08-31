import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function FormNotice({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg bg-surface-muted px-3 py-2 text-sm', className)}>{children}</div>
  );
}
