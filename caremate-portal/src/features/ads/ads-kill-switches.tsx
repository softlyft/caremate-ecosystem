'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { saveAdsRemoteConfig } from '@/domains/ads/actions';
import type { AdSlotMode } from '@/domains/ads/constants';

const SLOTS = [
  { id: 'home.tips' as const, label: 'Home after tips' },
  { id: 'home.feed' as const, label: 'Home feed' },
  { id: 'learn.list' as const, label: 'Learn (after featured)' },
  { id: 'learn.article_header' as const, label: 'Learn article (before body)' },
  { id: 'learn.article_footer' as const, label: 'Learn article footer' },
  { id: 'nearby.list' as const, label: 'Nearby list' },
  { id: 'nearby.provider' as const, label: 'Nearby provider (before contact)' },
  { id: 'pregnancy.timeline' as const, label: 'Pregnancy tracker (before timeline)' },
  { id: 'pregnancy.footer' as const, label: 'Pregnancy tracker (before update due date)' },
  { id: 'period.week' as const, label: 'Period tracker (before this week)' },
  { id: 'period.footer' as const, label: 'Period tracker (before log period days)' },
] as const;

const MODES: { value: AdSlotMode; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'house', label: 'House' },
  { value: 'sponsored', label: 'Sponsored' },
  { value: 'admob', label: 'AdMob' },
];

export type AdsSlotConfigFormValues = {
  adsEnabled: boolean;
  slotMode: Record<(typeof SLOTS)[number]['id'], AdSlotMode>;
};

export function AdsKillSwitches({
  initial,
  canEdit,
}: {
  initial: AdsSlotConfigFormValues;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { handleSubmit, setValue, control } = useForm<AdsSlotConfigFormValues>({
    defaultValues: initial,
  });

  const adsEnabled = useWatch({ control, name: 'adsEnabled' });
  const slotMode = useWatch({ control, name: 'slotMode' });

  const onSubmit = handleSubmit((values) => {
    start(async () => {
      try {
        await saveAdsRemoteConfig(values);
        toast.success('Slot settings saved — mobile picks up on next sync');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Save failed');
      }
    });
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Banner slot sources</h2>
          <p className="text-sm text-muted">
            Each slot shows exactly one source for free users. Premium users never see AdMob. No
            fallback when inventory is empty.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={adsEnabled}
              disabled={!canEdit}
              onChange={(e) => setValue('adsEnabled', e.target.checked)}
            />
            Ads enabled (master panic switch)
          </label>

          <div className="space-y-3">
            {SLOTS.map((slot) => (
              <div key={slot.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                <div className="sm:w-48">
                  <p className="text-sm font-medium">{slot.label}</p>
                  <p className="text-xs text-muted">{slot.id}</p>
                </div>
                <Select
                  className="sm:max-w-xs"
                  value={slotMode?.[slot.id] ?? 'off'}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setValue('slotMode', {
                      ...slotMode,
                      [slot.id]: e.target.value as AdSlotMode,
                    })
                  }
                >
                  {MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>

          {canEdit ? (
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save slot settings'}
            </Button>
          ) : (
            <p className="text-sm text-muted">View only — editors/admins can change settings.</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
