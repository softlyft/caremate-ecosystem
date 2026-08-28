import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function NavCard({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn('group block', className)}>
      <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
        {children}
      </Card>
    </Link>
  );
}
