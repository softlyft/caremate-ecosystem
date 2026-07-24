import { format } from 'date-fns';
import Link from 'next/link';
import { requireProviderSession } from '@/lib/auth';
import { listOrgConversations } from '@/domains/messaging/repository';
import { listConnectedPatients } from '@/domains/patients/repository';
import { BroadcastComposeForm } from '@/components/features/broadcast-compose-form';
import { canWriteOrg } from '@/constants/roles';
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

export default async function BroadcastsPage() {
  const session = await requireProviderSession();
  const orgId = session.activeOrganizationId;
  const [conversations, { rows: patients }] = await Promise.all([
    listOrgConversations(orgId),
    listConnectedPatients(orgId, { limit: 200 }),
  ]);
  const canWrite = canWriteOrg(session.activeRole);

  const patientOptions = patients.map((p) => ({
    id: p.connection.patient_id,
    label: `${p.profile?.full_name ?? 'Unknown'} (${p.profile?.patient_id ?? '—'})`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Messages</h1>
        <p className="mt-1 text-sm text-muted">
          Inbox-style messages to connected patients. Broadcasts land in each patient&apos;s CareMate
          Messages inbox with a push notification.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {canWrite && (
          <Card>
            <CardHeader>
              <CardTitle>Compose</CardTitle>
              <CardDescription>
                Send to all connected patients or a selected group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BroadcastComposeForm patients={patientOptions} />
            </CardContent>
          </Card>
        )}

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
                {conversations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted">
                      No conversations yet. Send a message to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  conversations.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/app/broadcasts/${c.id}`}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
