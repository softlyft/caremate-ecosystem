'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { saveProvider, deleteProvider } from '@/domains/providers/actions';
import { PROVIDER_TYPES, PROVIDER_TYPE_LABELS } from '@/constants/content';
import type { Provider } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

const schema = z.object({
  name: z.string().min(1),
  type: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  distance_km: z.string().optional(),
  attributes_json: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProviderForm({ provider }: { provider?: Provider }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: provider?.name ?? '',
      type: provider?.type ?? 'hospital',
      address: provider?.address ?? '',
      phone: provider?.phone ?? '',
      email: provider?.email ?? '',
      latitude: provider?.latitude?.toString() ?? '',
      longitude: provider?.longitude?.toString() ?? '',
      distance_km: provider?.distance_km?.toString() ?? '',
      attributes_json: JSON.stringify(provider?.attributes ?? {}, null, 2),
    },
  });

  const onSubmit = handleSubmit((values) => {
    start(async () => {
      try {
        let attributes = {};
        if (values.attributes_json?.trim()) {
          attributes = JSON.parse(values.attributes_json);
        }
        const id = await saveProvider({
          id: provider?.id,
          name: values.name,
          type: values.type,
          address: values.address || null,
          phone: values.phone || null,
          email: values.email || null,
          latitude: values.latitude ? Number(values.latitude) : null,
          longitude: values.longitude ? Number(values.longitude) : null,
          distance_km: values.distance_km ? Number(values.distance_km) : null,
          attributes,
        });
        toast.success(provider ? 'Provider updated' : 'Provider created');
        router.push(`/dashboard/providers/${id}`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Save failed');
      }
    });
  });

  const onDelete = () => {
    if (!provider || !confirm('Delete this provider?')) return;
    start(async () => {
      try {
        await deleteProvider(provider.id);
        toast.success('Deleted');
        router.push('/dashboard/providers');
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
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select id="type" {...register('type')}>
                {PROVIDER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PROVIDER_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...register('email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="distance_km">Distance (km)</Label>
              <Input id="distance_km" {...register('distance_km')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" {...register('latitude')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" {...register('longitude')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="attributes_json">Attributes (JSON)</Label>
              <Textarea
                id="attributes_json"
                rows={5}
                className="font-mono text-xs"
                {...register('attributes_json')}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
            {provider ? (
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
