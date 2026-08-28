import {
  Award,
  BarChart3,
  Building2,
  Calendar,
  FolderOpen,
  Users,
} from 'lucide-react';
import { getCommunityStats } from '@/domains/community/repository';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NavCard } from '@/components/ui/nav-card';
import { Badge } from '@/components/ui/badge';

const LINKS = [
  {
    href: '/dashboard/community/profiles',
    label: 'Profiles',
    description: 'Community member profiles and categories',
    icon: Users,
  },
  {
    href: '/dashboard/community/chapters',
    label: 'Chapters',
    description: 'Active and archived chapters',
    icon: Building2,
  },
  {
    href: '/dashboard/community/chapters/requests',
    label: 'Chapter requests',
    description: 'Approve or reject new chapter proposals',
    icon: Building2,
  },
  {
    href: '/dashboard/community/events',
    label: 'Events',
    description: 'Cross-chapter event oversight',
    icon: Calendar,
  },
  {
    href: '/dashboard/community/resources',
    label: 'Resources',
    description: 'Global and chapter resource library',
    icon: FolderOpen,
  },
  {
    href: '/dashboard/community/recognition',
    label: 'Recognition',
    description: 'Badges, certificates, and awards',
    icon: Award,
  },
  {
    href: '/dashboard/community/reports',
    label: 'Reports',
    description: 'Member, event, and contribution stats',
    icon: BarChart3,
  },
] as const;

export default async function CommunityOverviewPage() {
  let stats;
  try {
    stats = await getCommunityStats();
  } catch {
    stats = {
      profileCount: 0,
      approvedMemberCount: 0,
      activeChapterCount: 0,
      pendingChapterRequestCount: 0,
      eventCount: 0,
      resourceCount: 0,
      contributionCount: 0,
      badgeCount: 0,
      certificateCount: 0,
    };
  }

  const cards = [
    { label: 'Profiles', value: stats.profileCount },
    { label: 'Approved members', value: stats.approvedMemberCount },
    { label: 'Active chapters', value: stats.activeChapterCount },
    { label: 'Pending requests', value: stats.pendingChapterRequestCount },
    { label: 'Events', value: stats.eventCount },
    { label: 'Resources', value: stats.resourceCount },
  ];

  return (
    <div>
      <PageHeader
        title="Community"
        description="Staff oversight for CareMate Community chapters, members, and recognition."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-brand-navy">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.pendingChapterRequestCount > 0 ? (
        <div className="mt-6">
          <Badge variant="warning">
            {stats.pendingChapterRequestCount} chapter request
            {stats.pendingChapterRequestCount === 1 ? '' : 's'} awaiting review
          </Badge>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {LINKS.map(({ href, label, description, icon: Icon }) => (
          <NavCard key={href} href={href}>
            <CardHeader className="flex flex-row items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base">{label}</CardTitle>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </div>
            </CardHeader>
          </NavCard>
        ))}
      </div>
    </div>
  );
}
