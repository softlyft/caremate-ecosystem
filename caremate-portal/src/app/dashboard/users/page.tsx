import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { listUsers } from '@/domains/users/repository';
import { getPortalSession } from '@/lib/auth';
import { canManageUsers } from '@/constants/roles';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getPortalSession();
  if (!session || !canManageUsers(session.role)) {
    return (
      <div>
        <PageHeader title="Users" description="You do not have permission to manage users." />
      </div>
    );
  }

  const { q } = await searchParams;
  let users: Awaited<ReturnType<typeof listUsers>> = [];
  try {
    users = await listUsers(q);
  } catch {
    users = [];
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Search accounts, disable access, and assign portal roles."
      />

      <form className="mb-4">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by email, name, or phone…"
          className="max-w-md"
        />
      </form>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Portal role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/users/${u.id}`}
                        className="font-medium text-primary-dark hover:underline"
                      >
                        {u.email}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted">
                      {u.profile?.full_name ?? '—'}
                    </TableCell>
                    <TableCell>
                      {u.role ? <Badge>{u.role}</Badge> : <span className="text-muted">—</span>}
                    </TableCell>
                    <TableCell>
                      {u.bannedUntil ? (
                        <Badge variant="danger">Disabled</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted">
                      {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
