'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormActions, FormField, FormStack } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CampaignSlotPicker } from '@/features/ads/campaign-slot-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deleteCampaign, saveCampaign } from '@/domains/ads/actions';
import type { CampaignWithCreative } from '@/domains/ads/repository';
import type { AdAdvertiser } from '@/types/database';

type FormValues = {
  advertiserId: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  priority: number;
  frequencyCapPerDay: number;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  slotIds: string[];
};

function toForm(campaign?: CampaignWithCreative): FormValues {
  return {
    advertiserId: campaign?.advertiser_id ?? '',
    name: campaign?.name ?? '',
    status: (campaign?.status as FormValues['status']) ?? 'draft',
    priority: campaign?.priority ?? 0,
    frequencyCapPerDay: campaign?.frequency_cap_per_day ?? 6,
    title: campaign?.creative?.title ?? '',
    body: campaign?.creative?.body ?? '',
    ctaLabel: campaign?.creative?.cta_label ?? '',
    ctaHref: campaign?.creative?.cta_href ?? '',
    imageUrl: campaign?.creative?.image_url ?? '',
    slotIds: (campaign?.placements ?? [])
      .filter((p) => !p.deleted_at)
      .map((p) => p.slot_id),
  };
}

function CampaignForm({
  campaign,
  verifiedAdvertisers,
  onDone,
}: {
  campaign?: CampaignWithCreative;
  verifiedAdvertisers: AdAdvertiser[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pendingAction, setPendingAction] = useState<'save' | 'archive' | null>(null);
  const { register, handleSubmit, setValue, control } = useForm<FormValues>({
    defaultValues: toForm(campaign),
  });
  const slotIds = useWatch({ control, name: 'slotIds' }) ?? [];
  const status = useWatch({ control, name: 'status' });
  const advertiserId = useWatch({ control, name: 'advertiserId' });

  const onSubmit = handleSubmit((values) => {
    start(async () => {
      setPendingAction('save');
      try {
        await saveCampaign({
          id: campaign?.id,
          source: 'sponsored',
          advertiserId: values.advertiserId,
          name: values.name,
          status: values.status,
          priority: values.priority,
          frequencyCapPerDay: values.frequencyCapPerDay,
          title: values.title,
          body: values.body,
          ctaLabel: values.ctaLabel,
          ctaHref: values.ctaHref,
          imageUrl: values.imageUrl,
          slotIds: values.slotIds,
        });
        toast.success(campaign ? 'Campaign updated' : 'Campaign created');
        onDone();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setPendingAction(null);
      }
    });
  });

  const onDelete = () => {
    if (!campaign || !confirm('Archive this campaign?')) return;
    start(async () => {
      setPendingAction('archive');
      try {
        await deleteCampaign(campaign.id, 'sponsored');
        toast.success('Archived');
        onDone();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Delete failed');
      } finally {
        setPendingAction(null);
      }
    });
  };

  const toggleSlot = (id: string) => {
    if (slotIds.includes(id)) {
      setValue(
        'slotIds',
        slotIds.filter((s) => s !== id),
      );
    } else {
      setValue('slotIds', [...slotIds, id]);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={onSubmit}>
          <FormStack>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Verified advertiser" htmlFor="advertiserId" className="md:col-span-2">
                <Select
                  id="advertiserId"
                  value={advertiserId}
                  onChange={(e) => setValue('advertiserId', e.target.value)}
                >
                  <option value="">Select advertiser…</option>
                  {verifiedAdvertisers.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Campaign name" htmlFor="name">
                <Input id="name" {...register('name', { required: true })} />
              </FormField>
              <FormField label="Status" htmlFor="status">
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setValue('status', e.target.value as FormValues['status'])}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </Select>
              </FormField>
              <FormField label="Priority" htmlFor="priority">
                <Input
                  id="priority"
                  type="number"
                  {...register('priority', { valueAsNumber: true })}
                />
              </FormField>
              <FormField label="Daily frequency cap" htmlFor="frequencyCapPerDay">
                <Input
                  id="frequencyCapPerDay"
                  type="number"
                  {...register('frequencyCapPerDay', { valueAsNumber: true })}
                />
              </FormField>
              <FormField label="Title" htmlFor="title" className="md:col-span-2">
                <Input id="title" {...register('title', { required: true })} />
              </FormField>
              <FormField label="Body" htmlFor="body" className="md:col-span-2">
                <Textarea id="body" rows={3} {...register('body', { required: true })} />
              </FormField>
              <FormField label="CTA label" htmlFor="ctaLabel">
                <Input id="ctaLabel" {...register('ctaLabel')} />
              </FormField>
              <FormField label="CTA href (in-app)" htmlFor="ctaHref">
                <Input id="ctaHref" {...register('ctaHref')} placeholder="/(app)/(tabs)/apps" />
              </FormField>
              <FormField
                label="Image URL"
                htmlFor="imageUrl"
                className="md:col-span-2"
                hint='Badge is always "Sponsored" for this source.'
              >
                <Input id="imageUrl" {...register('imageUrl')} />
              </FormField>
            </div>

            <CampaignSlotPicker slotIds={slotIds} onToggle={toggleSlot} />

            <FormActions className="justify-start">
              <Button
                type="submit"
                disabled={pending || !advertiserId}
                loading={pendingAction === 'save'}
                loadingLabel="Saving…"
              >
                Save
              </Button>
              {campaign ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={pending}
                  loading={pendingAction === 'archive'}
                  loadingLabel="Archiving…"
                  onClick={onDelete}
                >
                  Archive
                </Button>
              ) : null}
            </FormActions>
          </FormStack>
        </form>
      </CardContent>
    </Card>
  );
}

export function SponsoredCampaignsManager({
  campaigns,
  verifiedAdvertisers,
  canEdit,
}: {
  campaigns: CampaignWithCreative[];
  verifiedAdvertisers: AdAdvertiser[];
  canEdit: boolean;
}) {
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editing, setEditing] = useState<CampaignWithCreative | undefined>();

  if (mode === 'create' && canEdit) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setMode('list')}>
          ← Back
        </Button>
        <CampaignForm verifiedAdvertisers={verifiedAdvertisers} onDone={() => setMode('list')} />
      </div>
    );
  }

  if (mode === 'edit' && editing && canEdit) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setMode('list')}>
          ← Back
        </Button>
        <CampaignForm
          campaign={editing}
          verifiedAdvertisers={verifiedAdvertisers}
          onDone={() => setMode('list')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Button
          type="button"
          onClick={() => setMode('create')}
          disabled={verifiedAdvertisers.length === 0}
        >
          New sponsored campaign
        </Button>
      ) : null}
      {verifiedAdvertisers.length === 0 ? (
        <p className="text-sm text-muted">Verify at least one advertiser before creating sponsored campaigns.</p>
      ) : null}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Advertiser</TableHead>
                <TableHead>Slots</TableHead>
                <TableHead>Status</TableHead>
                {canEdit ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 4} className="text-muted">
                    No sponsored campaigns yet.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.advertiser?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted">
                      {c.placements
                        .filter((p) => !p.deleted_at)
                        .map((p) => p.slot_id)
                        .join(', ') || '—'}
                    </TableCell>
                    <TableCell>
                      {c.status === 'active' ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">{c.status}</Badge>
                      )}
                    </TableCell>
                    {canEdit ? (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(c);
                            setMode('edit');
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    ) : null}
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
