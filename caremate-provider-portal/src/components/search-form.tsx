import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SearchForm({
  placeholder,
  defaultValue,
  inputClassName,
  submitLabel = 'Search',
}: {
  placeholder: string;
  defaultValue?: string;
  inputClassName?: string;
  submitLabel?: string;
}) {
  return (
    <form className="flex gap-2">
      <Input
        name="q"
        placeholder={placeholder}
        defaultValue={defaultValue ?? ''}
        className={cn('w-72', inputClassName)}
      />
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
