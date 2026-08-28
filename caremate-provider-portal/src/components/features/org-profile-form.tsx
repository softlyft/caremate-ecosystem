'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormActions, FormField, FormStack } from '@/components/ui/form-field';
import { FormNotice } from '@/components/ui/form-notice';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ORG_TYPES, ORG_TYPE_LABELS } from '@/constants/org-types';
import { updateOrgProfileAction } from '@/domains/org/actions';
import type { ProviderOrgType, ProviderProfile } from '@/types/database';

export function OrgProfileForm({
  profile,
  organizationName,
  contactEmail,
}: {
  profile: ProviderProfile | null;
  organizationName: string;
  contactEmail?: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await updateOrgProfileAction(formData);
            toast.success('Organization profile saved');
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
            Name is managed in CareMate admin. Claim contact email, phone, address, and services come
            from the catalog — providers cannot change the claim email.
          </p>
        </FormNotice>

        <FormField label="Claim contact email" htmlFor="contact_email">
          <Input
            id="contact_email"
            type="email"
            readOnly
            disabled
            value={contactEmail ?? profile?.email ?? ''}
            placeholder="Set by SoftLyft / ingest"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Organization type" htmlFor="organization_type">
            <Select
              id="organization_type"
              name="organization_type"
              defaultValue={profile?.organization_type ?? 'clinic'}
            >
              {ORG_TYPES.map((t: ProviderOrgType) => (
                <option key={t} value={t}>
                  {ORG_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Website" htmlFor="website">
            <Input id="website" name="website" defaultValue={profile?.website ?? ''} />
          </FormField>
          <FormField label="Emergency contact" htmlFor="emergency_contact">
            <Input
              id="emergency_contact"
              name="emergency_contact"
              defaultValue={profile?.emergency_contact ?? ''}
            />
          </FormField>
          <FormField label="Logo URL" htmlFor="logo_url" className="sm:col-span-2">
            <Input id="logo_url" name="logo_url" defaultValue={profile?.logo_url ?? ''} />
          </FormField>
          <FormField label="Description" htmlFor="description" className="sm:col-span-2">
            <Textarea id="description" name="description" defaultValue={profile?.description ?? ''} />
          </FormField>
          <FormField
            label="Opening hours (JSON or free text)"
            htmlFor="opening_hours_text"
            className="sm:col-span-2"
          >
            <Textarea
              id="opening_hours_text"
              name="opening_hours_text"
              defaultValue={
                profile?.opening_hours ? JSON.stringify(profile.opening_hours, null, 2) : ''
              }
            />
          </FormField>
        </div>

        <FormActions className="justify-start">
          <Button type="submit" loading={pending} loadingLabel="Saving…">
            Save profile
          </Button>
        </FormActions>
      </FormStack>
    </form>
  );
}
