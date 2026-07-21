import { formatDistanceToNow } from 'date-fns';
import { listChapterRequests } from '@/domains/community/repository';
import { ChapterRequestActions } from '@/features/community/chapter-request-actions';
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

export default async function CommunityChapterRequestsPage() {
  let requests: Awaited<ReturnType<typeof listChapterRequests>> = [];
  try {
    requests = await listChapterRequests('pending');
  } catch {
    requests = [];
  }

  return (
    <div>
      <PageHeader
        title="Chapter requests"
        description="Pending proposals to create new community chapters."
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted">
                    No pending chapter requests.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="font-medium">{req.name}</div>
                      {req.description ? (
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted">
                          {req.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{req.chapter_type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted">{req.country_code}</TableCell>
                    <TableCell className="text-muted">
                      {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <ChapterRequestActions requestId={req.id} />
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
