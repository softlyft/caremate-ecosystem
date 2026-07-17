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
    <div className="mb-8 border-b border-border pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-8 w-1.5 rounded-full bg-gradient-to-b from-primary to-accent" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">{title}</h1>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
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
    </div>
  );
}
