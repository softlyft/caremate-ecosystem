'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormActions, FormField, FormStack } from '@/components/ui/form-field';
import { FormNotice } from '@/components/ui/form-notice';
import { Input } from '@/components/ui/input';
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
      <FormStack>
        <FormNotice>
          <span className="text-muted">Organization name: </span>
          <span className="font-medium">{organizationName}</span>
          <p className="mt-1 text-xs text-muted">
            Name and claim contact email are set by SoftLyft. You can update phone, website, address,
            and description — changes appear in the CareMate Health Insurance Directory.
          </p>
        </FormNotice>

        <FormField label="Claim contact email" htmlFor="contact_email">
          <Input
            id="contact_email"
            type="email"
            readOnly
            disabled
            value={details.email ?? ''}
            placeholder="Set by SoftLyft"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Website" htmlFor="website">
            <Input id="website" name="website" defaultValue={details.website ?? ''} />
          </FormField>
          <FormField label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={details.phone ?? ''} />
          </FormField>
        </div>

        <FormField label="Address" htmlFor="address">
          <Input id="address" name="address" defaultValue={details.address ?? ''} />
        </FormField>

        <FormField label="Logo URL" htmlFor="logo_url">
          <Input id="logo_url" name="logo_url" defaultValue={details.logo_url ?? ''} />
        </FormField>

        <FormField label="Description" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={details.description ?? ''}
          />
        </FormField>

        <FormActions className="justify-start">
          <Button type="submit" loading={pending} loadingLabel="Saving…">
            Save details
          </Button>
        </FormActions>
      </FormStack>
    </form>
  );
}
