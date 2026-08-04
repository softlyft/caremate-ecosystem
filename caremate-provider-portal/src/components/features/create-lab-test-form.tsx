'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { createLabTestAction } from '@/domains/lab/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function CreateLabTestForm() {
  const [pending, start] = useTransition();

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          try {
            await createLabTestAction(fd);
            toast.success('Test added to catalog');
            form.reset();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not add test');
          }
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" placeholder="FBC" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Full blood count" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="specimen_type">Specimen</Label>
        <Select id="specimen_type" name="specimen_type" defaultValue="blood">
          <option value="blood">Blood</option>
          <option value="urine">Urine</option>
          <option value="swab">Swab</option>
          <option value="stool">Stool</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="unit">Unit</Label>
        <Input id="unit" name="unit" placeholder="g/dL" />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="reference_range">Reference range</Label>
        <Input id="reference_range" name="reference_range" placeholder="e.g. 12–16" />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" loading={pending}>
          Add test
        </Button>
      </div>
    </form>
  );
}
