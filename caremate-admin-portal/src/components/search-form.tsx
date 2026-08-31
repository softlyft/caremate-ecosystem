import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SearchForm({
  placeholder,
  defaultValue,
  inputClassName,
  submitLabel = 'Search',
  children,
  className,
}: {
  placeholder: string;
  defaultValue?: string;
  inputClassName?: string;
  submitLabel?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <form className={cn('flex flex-wrap gap-2', className)}>
      {children}
      <Input
        name="q"
        placeholder={placeholder}
        defaultValue={defaultValue ?? ''}
        className={cn('max-w-sm', inputClassName)}
      />
      <Button type="submit" variant="secondary">
        {submitLabel}
      </Button>
    </form>
  );
}
