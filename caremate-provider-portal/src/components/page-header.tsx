import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageShell({
  children,
  className,
  spacing = 'default',
}: {
  children: ReactNode;
  className?: string;
  spacing?: 'default' | 'loose';
}) {
  return (
    <div className={cn(spacing === 'loose' ? 'space-y-8' : 'space-y-6', className)}>{children}</div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const heading = (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">{title}</h1>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
    </div>
  );

  if (actions) {
    return (
      <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
        {heading}
        {actions}
      </div>
    );
  }

  return <div className={className}>{heading}</div>;
}
