import { formatDistanceToNow } from 'date-fns';
import { listUsersPage, type AdminUserRow } from '@/domains/users/repository';
import { getPortalSession } from '@/lib/auth';
import { canManageUsers } from '@/constants/roles';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { SearchForm } from '@/components/search-form';
import { TextLink } from '@/components/ui/text-link';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

function usersHref(opts: { q?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (opts.q?.trim()) params.set('q', opts.q.trim());
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const qs = params.toString();
  return `/dashboard/users${qs ? `?${qs}` : ''}`;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getPortalSession();
  if (!session || !canManageUsers(session.role)) {
    return (
      <div>
        <PageHeader title="Users" description="You do not have permission to manage users." />
      </div>
    );
  }

  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  let users: PaginatedResult<AdminUserRow> = emptyPage(page);
  try {
    users = await listUsersPage({ search: q, page });
  } catch {
    users = emptyPage(page);
  }

  const hrefForPage = (nextPage: number) => usersHref({ q, page: nextPage });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Search accounts, disable access, and assign portal roles."
      />

      <SearchForm placeholder="Search by email, name, or phone…" defaultValue={q} className="mb-4" />

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
              {users.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <TextLink href={`/dashboard/users/${u.id}`} className="font-medium text-primary-dark">
                        {u.email}
                      </TextLink>
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
          <PaginationBar result={users} hrefForPage={hrefForPage} />
        </CardContent>
      </Card>
    </div>
  );
}
