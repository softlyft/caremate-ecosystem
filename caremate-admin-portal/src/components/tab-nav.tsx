import Link from 'next/link';
import { cn } from '@/lib/utils';

export function TabNav({
  tabs,
  current,
  ariaLabel,
  className,
  variant = 'underline',
}: {
  tabs: ReadonlyArray<{ href: string; label: string; key: string }>;
  current: string;
  ariaLabel: string;
  className?: string;
  variant?: 'underline' | 'pill';
}) {
  return (
    <nav
      className={cn(
        variant === 'underline' ? 'mb-6 flex gap-1 border-b border-border' : 'mb-4 flex flex-wrap gap-2',
        className,
      )}
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const active = tab.key === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              variant === 'underline'
                ? cn(
                    '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted hover:text-foreground',
                  )
                : cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-primary text-white'
                      : 'border border-border text-muted hover:text-foreground',
                  ),
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
