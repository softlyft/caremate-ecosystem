import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { BookOpen, Lightbulb, MapPin, Users } from 'lucide-react';
import { getOverviewMetrics } from '@/domains/dashboard/repository';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function DashboardPage() {
  let metrics;
  try {
    metrics = await getOverviewMetrics();
  } catch {
    metrics = {
      userCount: 0,
      articleCount: 0,
      providerCount: 0,
      tipCount: 0,
      recentUsers: [],
    };
  }

  const cards = [
    {
      label: 'Users',
      value: metrics.userCount,
      icon: Users,
      href: '/dashboard/users',
      tint: 'bg-accent-light text-accent',
    },
    {
      label: 'Learn items',
      value: metrics.articleCount,
      icon: BookOpen,
      href: '/dashboard/learn',
      tint: 'bg-primary-light text-primary-dark',
    },
    {
      label: 'Providers',
      value: metrics.providerCount,
      icon: MapPin,
      href: '/dashboard/providers',
      tint: 'bg-warning-light text-warning',
    },
    {
      label: 'Health tips',
      value: metrics.tipCount,
      icon: Lightbulb,
      href: '/dashboard/tips',
      tint: 'bg-primary-light text-primary-dark',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Monitor CareMate catalogs and recent account activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, href, tint }) => (
          <Link key={label} href={href} className="group">
            <Card className="transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted">{label}</CardTitle>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tint}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight text-brand-navy">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent signups</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.recentUsers.length === 0 ? (
            <p className="text-sm text-muted">No users found (check service role env).</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/users/${u.id}`}
                        className="font-medium text-primary-dark hover:underline"
                      >
                        {u.email}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {u.role ? <Badge>{u.role}</Badge> : <span className="text-muted">—</span>}
                    </TableCell>
                    <TableCell className="text-muted">
                      {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
