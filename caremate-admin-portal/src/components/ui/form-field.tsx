import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  compact = false,
  labelExtra,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  labelExtra?: ReactNode;
}) {
  return (
    <div className={cn(compact ? 'space-y-1.5' : 'space-y-2', className)}>
      {labelExtra ? (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={htmlFor}>{label}</Label>
          {labelExtra}
        </div>
      ) : (
        <Label htmlFor={htmlFor}>{label}</Label>
      )}
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function FormStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}

export function FormActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('flex justify-end gap-2', className)}>{children}</div>;
}

export const formInlineGridClassName =
  'grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end';
