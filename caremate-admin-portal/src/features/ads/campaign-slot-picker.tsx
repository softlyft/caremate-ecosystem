'use client';

import { FormField } from '@/components/ui/form-field';
import { AD_CAMPAIGN_SLOTS } from '@/features/ads/campaign-slots';

export function CampaignSlotPicker({
  slotIds,
  onToggle,
}: {
  slotIds: string[];
  onToggle: (slotId: string) => void;
}) {
  return (
    <FormField label="Slots">
      <div className="flex flex-wrap gap-3">
        {AD_CAMPAIGN_SLOTS.map((slot) => (
          <label key={slot.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={slotIds.includes(slot.id)}
              onChange={() => onToggle(slot.id)}
            />
            {slot.label}
          </label>
        ))}
      </div>
    </FormField>
  );
}
