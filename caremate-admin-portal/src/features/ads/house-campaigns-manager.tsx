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

type FormValues = {
  name: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  priority: number;
  frequencyCapPerDay: number;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  badgeLabel: string;
  slotIds: string[];
};

function toForm(campaign?: CampaignWithCreative): FormValues {
  return {
    name: campaign?.name ?? '',
    status: (campaign?.status as FormValues['status']) ?? 'draft',
    priority: campaign?.priority ?? 0,
    frequencyCapPerDay: campaign?.frequency_cap_per_day ?? 6,
    title: campaign?.creative?.title ?? '',
    body: campaign?.creative?.body ?? '',
    ctaLabel: campaign?.creative?.cta_label ?? '',
    ctaHref: campaign?.creative?.cta_href ?? '',
    badgeLabel: campaign?.creative?.badge_label ?? 'From CareMate',
    slotIds: (campaign?.placements ?? [])
      .filter((p) => !p.deleted_at)
      .map((p) => p.slot_id),
  };
}

function CampaignForm({
  campaign,
  onDone,
}: {
  campaign?: CampaignWithCreative;
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

  const onSubmit = handleSubmit((values) => {
    start(async () => {
      setPendingAction('save');
      try {
        await saveCampaign({
          id: campaign?.id,
          source: 'house',
          name: values.name,
          status: values.status,
          priority: values.priority,
          frequencyCapPerDay: values.frequencyCapPerDay,
          title: values.title,
          body: values.body,
          ctaLabel: values.ctaLabel,
          ctaHref: values.ctaHref,
          badgeLabel: values.badgeLabel,
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
        await deleteCampaign(campaign.id, 'house');
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
                <Input id="ctaLabel" {...register('ctaLabel')} placeholder="Open Apps" />
              </FormField>
              <FormField label="CTA href (in-app)" htmlFor="ctaHref">
                <Input
                  id="ctaHref"
                  {...register('ctaHref')}
                  placeholder="/(app)/(tabs)/apps"
                />
              </FormField>
              <FormField label="Badge" htmlFor="badgeLabel" className="md:col-span-2">
                <Input id="badgeLabel" {...register('badgeLabel')} />
              </FormField>
            </div>

            <CampaignSlotPicker slotIds={slotIds} onToggle={toggleSlot} />

            <FormActions className="justify-start">
              <Button
                type="submit"
                disabled={pending}
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

export function HouseCampaignsManager({
  campaigns,
  canEdit,
}: {
  campaigns: CampaignWithCreative[];
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
        <CampaignForm onDone={() => setMode('list')} />
      </div>
    );
  }

  if (mode === 'edit' && editing && canEdit) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setMode('list')}>
          ← Back
        </Button>
        <CampaignForm campaign={editing} onDone={() => setMode('list')} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Button type="button" onClick={() => setMode('create')}>
          New house campaign
        </Button>
      ) : null}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Creative</TableHead>
                <TableHead>Slots</TableHead>
                <TableHead>Status</TableHead>
                {canEdit ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 4} className="text-muted">
                    No house campaigns yet.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate text-sm">{c.creative?.title ?? '—'}</p>
                    </TableCell>
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
