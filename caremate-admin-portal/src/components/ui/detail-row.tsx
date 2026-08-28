import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-foreground">{children ?? value}</span>
    </div>
  );
}

export function DescriptionRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-1 border-b border-border py-3 sm:grid-cols-[10rem_1fr] sm:gap-4',
        className,
      )}
    >
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}
