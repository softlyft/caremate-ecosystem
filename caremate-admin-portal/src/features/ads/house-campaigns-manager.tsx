'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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

const SLOTS = [
  { id: 'home.tips', label: 'Home tips' },
  { id: 'home.feed', label: 'Home feed' },
  { id: 'learn.list', label: 'Learn list' },
  { id: 'learn.article_header', label: 'Article header' },
  { id: 'learn.article_footer', label: 'Article footer' },
  { id: 'nearby.list', label: 'Nearby list' },
  { id: 'nearby.provider', label: 'Provider detail' },
  { id: 'pregnancy.timeline', label: 'Pregnancy timeline' },
  { id: 'pregnancy.footer', label: 'Pregnancy footer' },
  { id: 'period.week', label: 'Period tracker week' },
  { id: 'period.footer', label: 'Period tracker footer' },
] as const;

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
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign name</Label>
              <Input id="name" {...register('name', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                {...register('priority', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequencyCapPerDay">Daily frequency cap</Label>
              <Input
                id="frequencyCapPerDay"
                type="number"
                {...register('frequencyCapPerDay', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register('title', { required: true })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" rows={3} {...register('body', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctaLabel">CTA label</Label>
              <Input id="ctaLabel" {...register('ctaLabel')} placeholder="Open Apps" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctaHref">CTA href (in-app)</Label>
              <Input
                id="ctaHref"
                {...register('ctaHref')}
                placeholder="/(app)/(tabs)/apps"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="badgeLabel">Badge</Label>
              <Input id="badgeLabel" {...register('badgeLabel')} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Slots</p>
            <div className="flex flex-wrap gap-3">
              {SLOTS.map((slot) => (
                <label key={slot.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={slotIds.includes(slot.id)}
                    onChange={() => toggleSlot(slot.id)}
                  />
                  {slot.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
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
          </div>
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
