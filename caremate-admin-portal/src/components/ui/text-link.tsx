import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type TextLinkProps = Omit<ComponentProps<typeof Link>, 'className'> & {
  className?: string;
  external?: boolean;
};

export function TextLink({ href, children, className, external, ...props }: TextLinkProps) {
  const linkClassName = cn('text-sm font-medium text-primary hover:underline', className);

  if (external) {
    return (
      <a href={String(href)} className={linkClassName} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={linkClassName} {...props}>
      {children}
    </Link>
  );
}
