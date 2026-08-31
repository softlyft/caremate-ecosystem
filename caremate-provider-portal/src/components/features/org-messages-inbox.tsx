import Link from 'next/link';
import { PageHeader, PageShell } from '@/components/page-header';
import { format } from 'date-fns';
import { BroadcastComposeForm } from '@/components/features/broadcast-compose-form';
import { sendBroadcastAction } from '@/domains/broadcasts/actions';
import type { PaginatedResult } from '@/lib/pagination';
import { PaginationBar } from '@/components/pagination-bar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type OrgInboxConversation = {
  id: string;
  patient_name: string | null;
  patient_caremate_id: string | null;
  subject: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread: boolean;
};

type SendBroadcastAction = typeof sendBroadcastAction;

export function OrgMessagesInbox({
  description,
  composeDescription = 'Send to all connected patients or selected members',
  canWrite,
  patients,
  conversations,
  hrefForPage,
  threadHref,
  sendAction = sendBroadcastAction,
}: {
  description: string;
  composeDescription?: string;
  canWrite: boolean;
  patients: { id: string; label: string }[];
  conversations: PaginatedResult<OrgInboxConversation>;
  hrefForPage: (page: number) => string;
  threadHref: (conversationId: string) => string;
  sendAction?: SendBroadcastAction;
}) {
  return (
    <PageShell>
      <PageHeader title="Messages" description={description} />

      <div className="grid gap-6 lg:grid-cols-3">
        {canWrite ? (
          <Card>
            <CardHeader>
              <CardTitle>Compose</CardTitle>
              <CardDescription>{composeDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <BroadcastComposeForm patients={patients} sendAction={sendAction} />
            </CardContent>
          </Card>
        ) : null}

        <Card className={canWrite ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
            <CardDescription>Threads with connected patients</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted">
                      No conversations yet. Send a message to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  conversations.rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={threadHref(c.id)}
                          className="font-medium text-brand-navy hover:underline"
                        >
                          {c.patient_name ?? 'Unknown'}
                        </Link>
                        <p className="text-xs text-muted">{c.patient_caremate_id ?? '—'}</p>
                        {c.unread ? (
                          <Badge variant="success" className="mt-1">
                            Unread
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2 text-sm">
                          {c.subject ? <span className="font-medium">{c.subject}: </span> : null}
                          {c.last_message_preview ?? '—'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {c.last_message_at
                          ? format(new Date(c.last_message_at), 'MMM d, yyyy HH:mm')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginationBar result={conversations} hrefForPage={hrefForPage} />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
