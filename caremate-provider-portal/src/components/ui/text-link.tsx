import Link from 'next/link';
import { cn } from '@/lib/utils';

export function TextLink({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}) {
  const linkClassName = cn('text-sm font-medium text-primary hover:underline', className);

  if (external) {
    return (
      <a href={href} className={linkClassName} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={linkClassName}>
      {children}
    </Link>
  );
}
