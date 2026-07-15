'use client';

import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { saveTip, deleteTip } from '@/domains/tips/actions';
import { HEALTH_CATEGORIES } from '@/constants/categories';
import type { HealthTip } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

const schema = z.object({
  category_id: z.string().min(1),
  body: z.string().min(1),
  sort_order: z.number().int(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function TipForm({ tip, onDone }: { tip?: HealthTip; onDone?: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category_id: tip?.category_id ?? 'heart',
      body: tip?.body ?? '',
      sort_order: tip?.sort_order ?? 0,
      is_active: tip?.is_active ?? true,
    },
  });

  const isActive = useWatch({ control, name: 'is_active' });
  const sortOrder = useWatch({ control, name: 'sort_order' });

  const onSubmit = handleSubmit((values) => {
    start(async () => {
      try {
        await saveTip({
          id: tip?.id,
          category_id: values.category_id,
          body: values.body,
          sort_order: values.sort_order,
          is_active: values.is_active,
        });
        toast.success(tip ? 'Tip updated' : 'Tip created');
        onDone?.();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Save failed');
      }
    });
  });

  const onDelete = () => {
    if (!tip || !confirm('Delete this tip?')) return;
    start(async () => {
      try {
        await deleteTip(tip.id);
        toast.success('Deleted');
        onDone?.();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Delete failed');
      }
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category_id">Category</Label>
              <Select id="category_id" {...register('category_id')}>
                {HEALTH_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort order</Label>
              <Input
                id="sort_order"
                type="number"
                value={sortOrder}
                onChange={(e) => setValue('sort_order', Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="body">Tip body</Label>
              <Textarea id="body" rows={3} {...register('body')} />
              {errors.body && <p className="text-xs text-danger">{errors.body.message}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={isActive}
                onChange={(e) => setValue('is_active', e.target.checked)}
              />
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
            {tip ? (
              <Button type="button" variant="danger" disabled={pending} onClick={onDelete}>
                Delete
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
