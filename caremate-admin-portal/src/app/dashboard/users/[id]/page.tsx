import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getUser } from '@/domains/users/repository';
import { getPortalSession } from '@/lib/auth';
import { canAssignRoles, canManageUsers } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { UserActions } from '@/features/users/user-actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DetailRow } from '@/components/ui/detail-row';

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
          <CardContent className="text-sm">
            <DetailRow label="Status">
              {user.bannedUntil ? (
                <Badge variant="danger">Disabled</Badge>
              ) : (
                <Badge variant="success">Active</Badge>
              )}
            </DetailRow>
            <DetailRow label="Portal role">{user.role ?? '—'}</DetailRow>
            <DetailRow label="Created">{format(new Date(user.createdAt), 'PPp')}</DetailRow>
            <DetailRow label="Last sign-in">
              {user.lastSignInAt ? format(new Date(user.lastSignInAt), 'PPp') : '—'}
            </DetailRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <DetailRow label="Name">{user.profile?.full_name ?? '—'}</DetailRow>
            <DetailRow label="Patient ID">
              {user.profile?.patient_id
                ? `${user.profile.patient_id.slice(0, 4)} ${user.profile.patient_id.slice(4, 8)} ${user.profile.patient_id.slice(8, 12)}`
                : '—'}
            </DetailRow>
            <DetailRow label="Phone">{user.profile?.phone ?? '—'}</DetailRow>
            <DetailRow label="Country">{user.profile?.country_code ?? '—'}</DetailRow>
            <DetailRow label="State">{user.profile?.state ?? '—'}</DetailRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>App data presence</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <DetailRow label="Settings">{user.hasSettings ? 'Yes' : 'No'}</DetailRow>
            <DetailRow label="Emergency profile">
              {user.hasEmergencyProfile ? 'Present (clinical data not shown)' : 'No'}
            </DetailRow>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
