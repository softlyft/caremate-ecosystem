import { format } from 'date-fns';
import { requireProviderSession } from '@/lib/auth';
import { listDocuments } from '@/domains/documents/repository';
import { listConnectedPatients } from '@/domains/patients/repository';
import { DocumentUploadForm } from '@/components/features/document-upload-form';
import { DOCUMENT_TYPE_LABELS } from '@/constants/document-types';
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

export default async function DocumentsPage() {
  const session = await requireProviderSession();
  const orgId = session.activeOrganizationId;
  const [documents, { rows: patients }] = await Promise.all([
    listDocuments(orgId),
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
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Documents</h1>
        <p className="mt-1 text-sm text-muted">
          Share files with connected patients. They can open them in the CareMate app under Me → Documents.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {canWrite && (
          <Card>
            <CardHeader>
              <CardTitle>Upload</CardTitle>
              <CardDescription>Stored in Supabase Storage (provider-documents)</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUploadForm patients={patientOptions} />
            </CardContent>
          </Card>
        )}

        <Card className={canWrite ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <CardHeader>
            <CardTitle>Recent uploads</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted">
                      No documents yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{doc.patient_id.slice(0, 8)}…</TableCell>
                      <TableCell>
                        {format(new Date(doc.created_at), 'MMM d, yyyy')}
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
