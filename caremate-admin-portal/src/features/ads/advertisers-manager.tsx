'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField, FormStack } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  saveAdvertiser,
  setAdvertiserVerification,
} from '@/domains/ads/actions';
import type { AdAdvertiser } from '@/types/database';

const ORG_TYPES = [
  'hospital',
  'pharmacy',
  'laboratory',
  'ngo',
  'hmo',
  'public_health',
  'other',
] as const;

type FormValues = {
  name: string;
  orgType: (typeof ORG_TYPES)[number];
  websiteUrl: string;
  logoUrl: string;
};

function AdvertiserForm({
  advertiser,
  onDone,
}: {
  advertiser?: AdAdvertiser;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: {
      name: advertiser?.name ?? '',
      orgType: (advertiser?.org_type as FormValues['orgType']) ?? 'other',
      websiteUrl: advertiser?.website_url ?? '',
      logoUrl: advertiser?.logo_url ?? '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    start(async () => {
      try {
        await saveAdvertiser({
          id: advertiser?.id,
          name: values.name,
          orgType: values.orgType,
          websiteUrl: values.websiteUrl || null,
          logoUrl: values.logoUrl || null,
        });
        toast.success(advertiser ? 'Advertiser updated' : 'Advertiser submitted for verification');
        onDone();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Save failed');
      }
    });
  });

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={onSubmit}>
          <FormStack>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Organization name" htmlFor="name" className="md:col-span-2">
                <Input id="name" {...register('name', { required: true })} />
              </FormField>
              <FormField label="Type" htmlFor="orgType">
                <Select
                  id="orgType"
                  defaultValue={advertiser?.org_type ?? 'other'}
                  onChange={(e) => setValue('orgType', e.target.value as FormValues['orgType'])}
                >
                  {ORG_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Website" htmlFor="websiteUrl">
                <Input id="websiteUrl" {...register('websiteUrl')} placeholder="https://" />
              </FormField>
              <FormField label="Logo URL" htmlFor="logoUrl" className="md:col-span-2">
                <Input id="logoUrl" {...register('logoUrl')} />
              </FormField>
            </div>
            <Button type="submit" loading={pending} loadingLabel="Saving…">
              Save advertiser
            </Button>
          </FormStack>
        </form>
      </CardContent>
    </Card>
  );
}

function statusBadge(status: string) {
  if (status === 'verified') return <Badge variant="success">Verified</Badge>;
  if (status === 'rejected') return <Badge variant="danger">Rejected</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

export function AdvertisersManager({
  advertisers,
  canEdit,
  canVerify,
}: {
  advertisers: AdAdvertiser[];
  canEdit: boolean;
  canVerify: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editing, setEditing] = useState<AdAdvertiser | undefined>();
  const [pendingVerification, setPendingVerification] = useState<{
    id: string;
    status: 'verified' | 'rejected';
  } | null>(null);

  const verify = (id: string, status: 'verified' | 'rejected') => {
    start(async () => {
      setPendingVerification({ id, status });
      try {
        await setAdvertiserVerification(id, status);
        toast.success(status === 'verified' ? 'Advertiser verified' : 'Advertiser rejected');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Action failed');
      } finally {
        setPendingVerification(null);
      }
    });
  };

  if (mode === 'create' && canEdit) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setMode('list')}>
          ← Back
        </Button>
        <AdvertiserForm onDone={() => setMode('list')} />
      </div>
    );
  }

  if (mode === 'edit' && editing && canEdit) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setMode('list')}>
          ← Back
        </Button>
        <AdvertiserForm advertiser={editing} onDone={() => setMode('list')} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Button type="button" onClick={() => setMode('create')}>
          Register advertiser
        </Button>
      ) : null}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                {(canEdit || canVerify) && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {advertisers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit || canVerify ? 4 : 3} className="text-muted">
                    No advertisers yet.
                  </TableCell>
                </TableRow>
              ) : (
                advertisers.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-sm text-muted">{a.org_type}</TableCell>
                    <TableCell>{statusBadge(a.verification_status)}</TableCell>
                    {(canEdit || canVerify) && (
                      <TableCell className="space-x-2">
                        {canEdit ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(a);
                              setMode('edit');
                            }}
                          >
                            Edit
                          </Button>
                        ) : null}
                        {canVerify && a.verification_status === 'pending' ? (
                          <>
                            <Button
                              size="sm"
                              disabled={pending}
                              loading={
                                pendingVerification?.id === a.id &&
                                pendingVerification.status === 'verified'
                              }
                              loadingLabel="Verifying…"
                              onClick={() => verify(a.id, 'verified')}
                            >
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={pending}
                              loading={
                                pendingVerification?.id === a.id &&
                                pendingVerification.status === 'rejected'
                              }
                              loadingLabel="Rejecting…"
                              onClick={() => verify(a.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </TableCell>
                    )}
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
