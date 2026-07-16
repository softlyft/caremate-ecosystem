'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { getIngestJob, uploadProvidersFile } from '@/domains/providers/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

const RESOURCES = [
  {
    value: 'organization',
    label: '1. Organization',
    hint: 'UUID → update that row. Else match by unique name (update) or insert. Names must be unique.',
  },
  {
    value: 'location',
    label: '2. Location',
    hint: 'No managingOrganization UUID → skip orphan. Org UUID validated → location id non-UUID insert / UUID update.',
  },
  {
    value: 'healthcareservice',
    label: '3. HealthcareService',
    hint: 'No location UUID → skip orphan. Location UUID validated → service id non-UUID insert / UUID update.',
  },
] as const;

export function ProviderUploadForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobNote, setJobNote] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    start(async () => {
      try {
        const accepted = await uploadProvidersFile(formData);
        setJobId(accepted.job_id);
        setJobNote(`Accepted (${accepted.resource ?? 'resource'}) — processing…`);
        toast.success('Upload accepted');

        for (let i = 0; i < 10; i += 1) {
          await new Promise((r) => setTimeout(r, 800));
          const job = await getIngestJob(accepted.job_id);
          if (job.status === 'completed') {
            const ids = Array.isArray(job.details?.ids)
              ? (job.details.ids as string[])
              : [];
            const detail = job.details
              ? ` inserted=${String(job.details.inserted ?? '')} updated=${String(job.details.updated ?? '')} skipped=${String(job.details.skipped ?? '0')} pins=${String(job.details.projections_updated ?? job.providers_upserted)}`
              : '';
            const idNote =
              ids.length > 0
                ? `\nIDs (copy into Excel for updates / parent refs):\n${ids.join('\n')}`
                : '';
            setJobNote(`Completed.${detail}${idNote}`);
            toast.success('Ingest completed');
            const resource = accepted.resource ?? 'organization';
            const view =
              resource === 'organization'
                ? 'organizations'
                : resource === 'location'
                  ? 'locations'
                  : resource === 'healthcareservice'
                    ? 'services'
                    : 'pins';
            router.push(`/dashboard/providers?view=${view}`);
            router.refresh();
            return;
          }
          if (job.status === 'failed') {
            setJobNote(job.error ?? 'Ingest failed');
            toast.error(job.error ?? 'Ingest failed');
            return;
          }
          setJobNote(`Status: ${job.status}…`);
        }
        setJobNote('Still running — refresh the providers list shortly.');
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        toast.error(message);
        setJobNote(message);
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Upload providers</h2>
          <p className="mt-1 text-sm text-muted">
            Run separately in order: Organization → Location → HealthcareService. Excel cells are
            FHIR-shaped JSON; Supabase stores resource tables and rebuilds Nearby pins (one per
            location).
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="resource">Resource</Label>
            <Select id="resource" name="resource" defaultValue="organization" disabled={pending}>
              {RESOURCES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted">
              {RESOURCES.map((r) => (
                <span key={r.value} className="mr-3 inline-block">
                  {r.hint}
                </span>
              ))}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              disabled={pending}
            />
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? 'Uploading…' : 'Upload and ingest'}
          </Button>
        </form>

        {jobId ? (
          <div className="space-y-2 text-sm text-muted">
            <p>
              Job <code className="text-xs">{jobId}</code>
            </p>
            {jobNote ? (
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs text-foreground">
                {jobNote}
              </pre>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
