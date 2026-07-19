'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '@/constants/document-types';
import { uploadDocumentAction } from '@/domains/documents/actions';

export function DocumentUploadForm({
  patients,
}: {
  patients: { id: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await uploadDocumentAction(formData);
            toast.success('Document uploaded');
            e.currentTarget.reset();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Upload failed');
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="patient_id">Patient</Label>
        <Select id="patient_id" name="patient_id" required defaultValue="">
          <option value="" disabled>
            Select connected patient
          </option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="document_type">Document type</Label>
        <Select id="document_type" name="document_type" required defaultValue="prescription">
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {DOCUMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="e.g. CBC results" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">File</Label>
        <Input id="file" name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" />
      </div>
      <Button type="submit" disabled={pending || patients.length === 0}>
        {pending ? 'Uploading…' : 'Upload document'}
      </Button>
      {patients.length === 0 && (
        <p className="text-xs text-muted">Connect and approve a patient before uploading.</p>
      )}
    </form>
  );
}
