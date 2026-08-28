'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createBadge } from '@/domains/community/actions';
import { Button } from '@/components/ui/button';
import { FormField, FormStack } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, underscores'),
  name: z.string().min(2),
  description: z.string().optional(),
  points_value: z.number().int().min(0),
});

type FormValues = z.infer<typeof schema>;

export function CreateBadgeForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: '',
      name: '',
      description: '',
      points_value: 10,
    },
  });

  const pointsValue = useWatch({ control, name: 'points_value' });

  const onSubmit = handleSubmit((values) => {
    start(async () => {
      try {
        await createBadge({
          slug: values.slug,
          name: values.name,
          description: values.description || null,
          points_value: values.points_value,
        });
        toast.success('Badge created');
        reset();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Create failed');
      }
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create badge</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FormStack>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Slug" htmlFor="slug" error={errors.slug?.message}>
                <Input id="slug" placeholder="community_builder" {...register('slug')} />
              </FormField>
              <FormField label="Name" htmlFor="name" error={errors.name?.message}>
                <Input id="name" placeholder="Community Builder" {...register('name')} />
              </FormField>
              <FormField label="Description" htmlFor="description" className="sm:col-span-2">
                <Textarea id="description" rows={2} {...register('description')} />
              </FormField>
              <FormField label="Points" htmlFor="points_value">
                <Input
                  id="points_value"
                  type="number"
                  min={0}
                  value={pointsValue}
                  onChange={(e) => setValue('points_value', Number(e.target.value) || 0)}
                />
              </FormField>
            </div>
            <Button type="submit" loading={pending} loadingLabel="Creating…">
              Create badge
            </Button>
          </FormStack>
        </form>
      </CardContent>
    </Card>
  );
}
