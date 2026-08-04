'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { scheduleAppointmentAction } from '@/domains/appointments/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function ScheduleAppointmentForm({
  patients,
}: {
  patients: Array<{ userId: string; label: string }>;
}) {
  const [pending, start] = useTransition();

  if (patients.length === 0) {
    return (
      <p className="text-sm text-muted">
        Connect a patient first, then you can schedule appointments here.
      </p>
    );
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          try {
            await scheduleAppointmentAction(fd);
            toast.success('Appointment scheduled');
            form.reset();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not schedule');
          }
        });
      }}
    >
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="patient_id">Connected patient</Label>
        <Select id="patient_id" name="patient_id" required defaultValue="">
          <option value="" disabled>
            Select patient
          </option>
          {patients.map((p) => (
            <option key={p.userId} value={p.userId}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="requested_date">Date</Label>
        <Input id="requested_date" name="requested_date" type="date" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="requested_time">Time</Label>
        <Input id="requested_time" name="requested_time" type="time" />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" loading={pending}>
          Schedule appointment
        </Button>
      </div>
    </form>
  );
}
