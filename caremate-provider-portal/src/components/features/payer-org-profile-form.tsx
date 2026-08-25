'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updatePayerOrgProfileAction } from '@/domains/payer/actions';
import type { PayerEditableDetails } from '@/domains/payer/repository';

export function PayerOrgProfileForm({
  details,
  organizationName,
  canEdit,
}: {
  details: PayerEditableDetails;
  organizationName: string;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return (
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Description</dt>
          <dd className="mt-0.5 font-medium">{details.description ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Website</dt>
          <dd className="mt-0.5 font-medium">{details.website ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Phone</dt>
          <dd className="mt-0.5 font-medium">{details.phone ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Address</dt>
          <dd className="mt-0.5 font-medium">{details.address ?? '—'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted">Claim contact email</dt>
          <dd className="mt-0.5 font-medium">{details.email ?? '—'}</dd>
        </div>
      </dl>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await updatePayerOrgProfileAction(formData);
            toast.success('Organization details saved');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Save failed');
          }
        });
      }}
    >
      <div className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
        <span className="text-muted">Organization name: </span>
        <span className="font-medium">{organizationName}</span>
        <p className="mt-1 text-xs text-muted">
          Name and claim contact email are set by SoftLyft. You can update phone, website, address,
          and description — changes appear in the CareMate Health Insurance Directory.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_email">Claim contact email</Label>
        <Input
          id="contact_email"
          type="email"
          readOnly
          disabled
          value={details.email ?? ''}
          placeholder="Set by SoftLyft"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" defaultValue={details.website ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={details.phone ?? ''} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={details.address ?? ''} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo_url">Logo URL</Label>
        <Input id="logo_url" name="logo_url" defaultValue={details.logo_url ?? ''} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={details.description ?? ''}
        />
      </div>

      <Button type="submit" loading={pending} loadingLabel="Saving…">
        Save details
      </Button>
    </form>
  );
}
