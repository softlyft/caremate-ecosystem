import { PageHeader, PageShell } from '@/components/page-header';
import { format } from 'date-fns';
import { DocumentUploadForm } from '@/components/features/document-upload-form';
import { OpenDocumentButton } from '@/components/features/open-document-button';
import { openDocumentAction, uploadDocumentAction } from '@/domains/documents/actions';
import { DOCUMENT_TYPE_LABELS } from '@/constants/document-types';
import type { DocumentType } from '@/types/database';
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

export type OrgDocumentRow = {
  id: string;
  title: string;
  document_type: DocumentType;
  patient_id: string;
  created_at: string;
};

type UploadDocumentAction = typeof uploadDocumentAction;
type OpenDocumentAction = typeof openDocumentAction;

export function OrgDocumentsPanel({
  description,
  canWrite,
  patients,
  documents,
  hrefForPage,
  uploadAction = uploadDocumentAction,
  openAction = openDocumentAction,
  uploadDescription = 'Stored in Supabase Storage (provider-documents)',
}: {
  description: string;
  canWrite: boolean;
  patients: { id: string; label: string }[];
  documents: PaginatedResult<OrgDocumentRow>;
  hrefForPage: (page: number) => string;
  uploadAction?: UploadDocumentAction;
  openAction?: OpenDocumentAction;
  uploadDescription?: string;
}) {
  return (
    <PageShell>
      <PageHeader title="Documents" description={description} />

      <div className="grid gap-6 lg:grid-cols-3">
        {canWrite ? (
          <Card>
            <CardHeader>
              <CardTitle>Upload</CardTitle>
              <CardDescription>{uploadDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUploadForm patients={patients} uploadAction={uploadAction} />
            </CardContent>
          </Card>
        ) : null}

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
                  <TableHead className="w-[1%] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted">
                      No documents yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.rows.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{doc.patient_id.slice(0, 8)}…</TableCell>
                      <TableCell>{format(new Date(doc.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <OpenDocumentButton documentId={doc.id} openAction={openAction} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginationBar result={documents} hrefForPage={hrefForPage} />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
