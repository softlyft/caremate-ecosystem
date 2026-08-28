import Link from 'next/link';
import type { ComponentProps } from 'react';
import { buttonVariants, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, 'className'> &
  Pick<ButtonProps, 'variant' | 'size'> & {
    className?: string;
  };

export function ButtonLink({
  href,
  children,
  className,
  variant,
  size,
  ...props
}: ButtonLinkProps) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </Link>
  );
}
