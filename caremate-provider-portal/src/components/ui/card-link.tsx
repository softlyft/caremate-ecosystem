import type { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TextLink } from '@/components/ui/text-link';

export function CardLink({
  title,
  description,
  href,
  linkLabel,
  children,
  className,
}: {
  title: string;
  description?: string;
  href: string;
  linkLabel: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
        <TextLink href={href}>{linkLabel}</TextLink>
      </CardContent>
    </Card>
  );
}
