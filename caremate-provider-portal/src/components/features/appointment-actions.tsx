'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { updateAppointmentStatusAction } from '@/domains/appointments/actions';
import type { AppointmentStatus } from '@/types/database';

export function AppointmentActions({
  appointmentId,
  currentStatus,
}: {
  appointmentId: string;
  currentStatus: AppointmentStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.set('appointment_id', appointmentId);
        startTransition(async () => {
          try {
            await updateAppointmentStatusAction(formData);
            toast.success('Appointment updated');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Update failed');
          }
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor={`status-${appointmentId}`}>Status</Label>
        <Select
          id={`status-${appointmentId}`}
          name="status"
          defaultValue={currentStatus === 'pending' ? 'confirmed' : currentStatus}
        >
          <option value="confirmed">Confirm</option>
          <option value="rejected">Reject</option>
          <option value="rescheduled">Reschedule</option>
          <option value="completed">Complete</option>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`date-${appointmentId}`}>Reschedule date</Label>
        <Input id={`date-${appointmentId}`} name="rescheduled_date" type="date" />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`time-${appointmentId}`}>Time</Label>
        <Input id={`time-${appointmentId}`} name="rescheduled_time" type="time" />
      </div>
      <div className="min-w-[160px] space-y-1">
        <Label htmlFor={`note-${appointmentId}`}>Note</Label>
        <Textarea id={`note-${appointmentId}`} name="provider_note" className="min-h-[40px]" rows={1} />
      </div>
      <Button type="submit" size="sm" loading={pending} loadingLabel="Saving…">
        Update
      </Button>
    </form>
  );
}
