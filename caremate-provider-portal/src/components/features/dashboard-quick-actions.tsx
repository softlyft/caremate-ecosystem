import type { LucideIcon } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type DashboardQuickAction = {
  label: string;
  href: string;
  icon: LucideIcon;
  variant?: 'primary' | 'secondary';
};

export function DashboardQuickActions({
  actions,
}: {
  actions: DashboardQuickAction[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
        <CardDescription>Common engagement tasks</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {actions.map(({ label, href, icon: Icon, variant = 'secondary' }) => (
          <ButtonLink
            key={label}
            href={href}
            variant={variant === 'primary' ? 'default' : 'secondary'}
            className="justify-start"
          >
            <Icon className="h-4 w-4" />
            {label}
          </ButtonLink>
        ))}
      </CardContent>
    </Card>
  );
}
