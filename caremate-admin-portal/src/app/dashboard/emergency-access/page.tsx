import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { Input } from '@/components/ui/input';
import { canViewAuditLogs } from '@/constants/roles';
import {
  listEmergencyAccessLogsPage,
  type EmergencyAccessLogRow,
} from '@/domains/emergency-access/repository';
import { EmergencyAccessLogsTable } from '@/features/emergency-access/emergency-access-logs-table';
import { getPortalSession } from '@/lib/auth';
import { emptyPage, parsePage, type PaginatedResult } from '@/lib/pagination';

function logsHref(opts: { viewer?: string; patient?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (opts.viewer?.trim()) params.set('viewer', opts.viewer.trim());
  if (opts.patient?.trim()) params.set('patient', opts.patient.trim());
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const qs = params.toString();
  return `/dashboard/emergency-access${qs ? `?${qs}` : ''}`;
}

export default async function EmergencyAccessLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ viewer?: string; patient?: string; page?: string }>;
}) {
  const session = await getPortalSession();
  if (!canViewAuditLogs(session?.role)) {
    redirect('/dashboard');
  }

  const { viewer, patient, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  let result: PaginatedResult<EmergencyAccessLogRow> = emptyPage(page);
  let loadError: string | null = null;

  try {
    result = await listEmergencyAccessLogsPage({
      viewerEmail: viewer || undefined,
      patientQuery: patient || undefined,
      page,
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load emergency access logs';
    result = emptyPage(page);
  }

  const hrefForPage = (nextPage: number) => logsHref({ viewer, patient, page: nextPage });

  return (
    <div>
      <PageHeader
        title="Emergency QR access"
        description="Who viewed a patient’s emergency card after scanning a Patient ID QR."
      />

      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Access log</h2>
        <p className="mt-1 text-sm text-muted">
          SoftLyft-only. Each successful QR view records the signed-in practitioner, the patient,
          timestamp, access basis, and a snapshot of disclosed emergency details.
        </p>
      </div>

      {loadError ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Could not load logs: {loadError}
        </p>
      ) : null}

      <form className="mb-4 flex flex-wrap items-end gap-2">
        <Input
          name="viewer"
          defaultValue={viewer ?? ''}
          placeholder="Viewer email"
          className="w-52"
        />
        <Input
          name="patient"
          defaultValue={patient ?? ''}
          placeholder="Patient name, email, or CareMate ID"
          className="w-72"
        />
        <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm text-white">
          Filter
        </button>
      </form>

      <EmergencyAccessLogsTable rows={result.rows} />
      <PaginationBar
        result={result}
        hrefForPage={hrefForPage}
        className="rounded-b-lg border border-t-0 border-border bg-white"
      />
    </div>
  );
}
