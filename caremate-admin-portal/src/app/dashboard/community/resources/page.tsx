import { formatDistanceToNow } from 'date-fns';
import { listResources } from '@/domains/community/repository';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function CommunityResourcesPage() {
  let resources: Awaited<ReturnType<typeof listResources>> = [];
  try {
    resources = await listResources();
  } catch {
    resources = [];
  }

  return (
    <div>
      <PageHeader
        title="Community resources"
        description="Global and chapter-scoped resource library."
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted">
                    No resources found.
                  </TableCell>
                </TableRow>
              ) : (
                resources.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.title}</div>
                      {r.description ? (
                        <div className="mt-0.5 line-clamp-1 text-xs text-muted">
                          {r.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {r.is_global ? (
                        <Badge>Global</Badge>
                      ) : (
                        <Badge variant="secondary">Chapter</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted">
                      {r.tags.length > 0 ? r.tags.join(', ') : '—'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted">
                      {r.storage_path}
                    </TableCell>
                    <TableCell className="text-muted">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
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
