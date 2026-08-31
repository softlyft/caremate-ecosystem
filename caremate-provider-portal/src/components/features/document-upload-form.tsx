'use client';

import { useRouter } from 'next/navigation';
import { useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField, FormStack } from '@/components/ui/form-field';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '@/constants/document-types';
import { uploadDocumentAction } from '@/domains/documents/actions';

type UploadDocumentAction = typeof uploadDocumentAction;

export function DocumentUploadForm({
  patients,
  uploadAction = uploadDocumentAction,
}: {
  patients: { id: string; label: string }[];
  uploadAction?: UploadDocumentAction;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = formRef.current;
        if (!form) {
          return;
        }
        const formData = new FormData(form);
        startTransition(async () => {
          try {
            await uploadAction(formData);
            formRef.current?.reset();
            toast.success('Document uploaded');
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Upload failed');
          }
        });
      }}
    >
      <FormStack>
        <FormField label="Patient" htmlFor="patient_id">
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
        </FormField>
        <FormField label="Document type" htmlFor="document_type">
          <Select id="document_type" name="document_type" required defaultValue="prescription">
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Title" htmlFor="title">
          <Input id="title" name="title" required placeholder="e.g. CBC results" />
        </FormField>
        <FormField
          label="File"
          htmlFor="file"
          hint="PDF, JPG, PNG, DOC, or DOCX — up to 3 MB."
        >
          <Input
            id="file"
            name="file"
            type="file"
            required
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
        </FormField>
      </FormStack>
      <Button
        type="submit"
        disabled={patients.length === 0}
        loading={pending}
        loadingLabel="Uploading…"
      >
        Upload document
      </Button>
      {patients.length === 0 && (
        <p className="text-xs text-muted">Connect and approve a patient before uploading.</p>
      )}
    </form>
  );
}
