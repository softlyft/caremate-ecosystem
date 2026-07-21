import { getCommunityStats } from '@/domains/community/repository';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function CommunityReportsPage() {
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

  const rows = [
    { label: 'Community profiles', value: stats.profileCount },
    { label: 'Approved memberships', value: stats.approvedMemberCount },
    { label: 'Active chapters', value: stats.activeChapterCount },
    { label: 'Pending chapter requests', value: stats.pendingChapterRequestCount },
    { label: 'Events', value: stats.eventCount },
    { label: 'Resources', value: stats.resourceCount },
    { label: 'Contributions recorded', value: stats.contributionCount },
    { label: 'Badge catalog size', value: stats.badgeCount },
    { label: 'Certificate catalog size', value: stats.certificateCount },
  ];

  return (
    <div>
      <PageHeader
        title="Community reports"
        description="Basic counts for members, events, and contributions."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ label, value }) => (
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
    </div>
  );
}
