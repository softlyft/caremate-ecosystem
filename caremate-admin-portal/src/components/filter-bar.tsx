import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FilterBar({
  children,
  submitLabel = 'Filter',
  className,
}: {
  children: ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  return (
    <form className={cn('mb-4 flex flex-wrap gap-2', className)}>
      {children}
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
