import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export type DashboardMetric = {
  label: string;
  value: number;
  icon: LucideIcon;
  href: string;
};

export function DashboardMetricCard({ label, value, icon: Icon, href }: DashboardMetric) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function DashboardMetricGrid({
  title,
  metrics,
  columns = 'sm:grid-cols-2 lg:grid-cols-4',
}: {
  title?: string;
  metrics: DashboardMetric[];
  columns?: string;
}) {
  return (
    <div>
      {title ? (
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted/80">{title}</h2>
      ) : null}
      <div className={`grid gap-4 ${columns}`}>
        {metrics.map((metric) => (
          <DashboardMetricCard key={metric.label} {...metric} />
        ))}
      </div>
    </div>
  );
}
