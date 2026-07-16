import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getUser } from '@/domains/users/repository';
import { getPortalSession } from '@/lib/auth';
import { canAssignRoles, canManageUsers } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { UserActions } from '@/features/users/user-actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getPortalSession();
  if (!session || !canManageUsers(session.role)) {
    return <PageHeader title="Users" description="Forbidden" />;
  }

  const { id } = await params;
  let user;
  try {
    user = await getUser(id);
  } catch {
    user = null;
  }
  if (!user) notFound();

  return (
    <div>
      <PageHeader title={user.email} description={`User ID: ${user.id}`} />

      <div className="mb-6">
        <UserActions
          userId={user.id}
          email={user.email}
          banned={Boolean(user.bannedUntil)}
          role={user.role}
          canManage={canManageUsers(session.role)}
          canAssign={canAssignRoles(session.role)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Status">
              {user.bannedUntil ? (
                <Badge variant="danger">Disabled</Badge>
              ) : (
                <Badge variant="success">Active</Badge>
              )}
            </Row>
            <Row label="Portal role">{user.role ?? '—'}</Row>
            <Row label="Created">{format(new Date(user.createdAt), 'PPp')}</Row>
            <Row label="Last sign-in">
              {user.lastSignInAt ? format(new Date(user.lastSignInAt), 'PPp') : '—'}
            </Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name">{user.profile?.full_name ?? '—'}</Row>
            <Row label="Patient ID">
              {user.profile?.patient_id
                ? `${user.profile.patient_id.slice(0, 4)} ${user.profile.patient_id.slice(4, 8)} ${user.profile.patient_id.slice(8, 12)}`
                : '—'}
            </Row>
            <Row label="Phone">{user.profile?.phone ?? '—'}</Row>
            <Row label="Country">{user.profile?.country_code ?? '—'}</Row>
            <Row label="State">{user.profile?.state ?? '—'}</Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>App data presence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Settings">{user.hasSettings ? 'Yes' : 'No'}</Row>
            <Row label="Emergency profile">
              {user.hasEmergencyProfile ? 'Present (clinical data not shown)' : 'No'}
            </Row>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}
