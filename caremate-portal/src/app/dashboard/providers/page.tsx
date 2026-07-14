import Link from 'next/link';
import { listProviders } from '@/domains/providers/repository';
import { getPortalSession } from '@/lib/auth';
import { canEditCatalog } from '@/constants/roles';
import { PROVIDER_TYPES, PROVIDER_TYPE_LABELS } from '@/constants/content';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const session = await getPortalSession();
  const canEdit = canEditCatalog(session?.role);
  const { q, type } = await searchParams;

  let providers: Awaited<ReturnType<typeof listProviders>> = [];
  try {
    providers = await listProviders({ search: q, type: type || undefined });
  } catch {
    providers = [];
  }

  return (
    <div>
      <PageHeader
        title="Providers"
        description="Directory of hospitals, clinics, and other care facilities."
        actionHref={canEdit ? '/dashboard/providers/new' : undefined}
        actionLabel={canEdit ? 'New provider' : undefined}
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Search name or address…" className="max-w-xs" />
        <Select name="type" defaultValue={type ?? ''} className="w-44">
          <option value="">All types</option>
          {PROVIDER_TYPES.map((t) => (
            <option key={t} value={t}>
              {PROVIDER_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm text-white">
          Filter
        </button>
      </form>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted">
                    No providers yet.
                  </TableCell>
                </TableRow>
              ) : (
                providers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/providers/${p.id}`}
                        className="font-medium text-primary-dark hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {PROVIDER_TYPE_LABELS[p.type as keyof typeof PROVIDER_TYPE_LABELS] ??
                          p.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted">{p.address ?? '—'}</TableCell>
                    <TableCell className="text-muted">{p.phone ?? '—'}</TableCell>
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
