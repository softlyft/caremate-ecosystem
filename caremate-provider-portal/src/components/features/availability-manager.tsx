'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import {
  addAvailabilityAction,
  deleteAvailabilityAction,
} from '@/domains/appointments/actions';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { AppointmentAvailability } from '@/types/database';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function AvailabilityManager({
  rows,
  canWrite,
}: {
  rows: AppointmentAvailability[];
  canWrite: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No availability windows yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span>
                  <span className="font-medium">{WEEKDAYS[row.weekday]}</span>
                  {' · '}
                  {row.start_time.slice(0, 5)} – {row.end_time.slice(0, 5)}
                  {' · '}
                  {row.slot_minutes} min slots
                </span>
                {canWrite ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      start(async () => {
                        try {
                          await deleteAvailabilityAction(fd);
                          toast.success('Window removed');
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Failed');
                        }
                      });
                    }}
                  >
                    <input type="hidden" name="availability_id" value={row.id} />
                    <Button type="submit" size="sm" variant="secondary" loading={pending}>
                      Remove
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canWrite ? (
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            start(async () => {
              try {
                await addAvailabilityAction(fd);
                toast.success('Availability added');
                form.reset();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed');
              }
            });
          }}
        >
          <FormField compact label="Day" htmlFor="weekday">
            <Select id="weekday" name="weekday" defaultValue="1">
              {WEEKDAYS.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField compact label="Start" htmlFor="start_time">
            <Input id="start_time" name="start_time" type="time" required defaultValue="09:00" />
          </FormField>
          <FormField compact label="End" htmlFor="end_time">
            <Input id="end_time" name="end_time" type="time" required defaultValue="17:00" />
          </FormField>
          <FormField compact label="Slot" htmlFor="slot_minutes">
            <Select id="slot_minutes" name="slot_minutes" defaultValue="30">
              {[15, 20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </Select>
          </FormField>
          <div className="flex items-end">
            <Button type="submit" loading={pending}>
              Add window
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
