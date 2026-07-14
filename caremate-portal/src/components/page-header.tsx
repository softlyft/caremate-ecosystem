import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function PageHeader({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        {actionHref && actionLabel ? (
          <Link href={actionHref}>
            <Button type="button">{actionLabel}</Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
