'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      className="space-y-4"
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
      <div className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
        <span className="text-muted">Organization name: </span>
        <span className="font-medium">{organizationName}</span>
        <p className="mt-1 text-xs text-muted">
          Name is managed in CareMate admin. Claim contact email, phone, address, and services come
          from the catalog — providers cannot change the claim email.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_email">Claim contact email</Label>
        <Input
          id="contact_email"
          type="email"
          readOnly
          disabled
          value={contactEmail ?? profile?.email ?? ''}
          placeholder="Set by SoftLyft / ingest"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="organization_type">Organization type</Label>
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
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" defaultValue={profile?.website ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emergency_contact">Emergency contact</Label>
          <Input
            id="emergency_contact"
            name="emergency_contact"
            defaultValue={profile?.emergency_contact ?? ''}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="logo_url">Logo URL</Label>
          <Input id="logo_url" name="logo_url" defaultValue={profile?.logo_url ?? ''} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" defaultValue={profile?.description ?? ''} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="opening_hours_text">Opening hours (JSON or free text)</Label>
          <Textarea
            id="opening_hours_text"
            name="opening_hours_text"
            defaultValue={
              profile?.opening_hours
                ? JSON.stringify(profile.opening_hours, null, 2)
                : ''
            }
          />
        </div>
      </div>

      <Button type="submit" loading={pending} loadingLabel="Saving…">
        Save profile
      </Button>
    </form>
  );
}
