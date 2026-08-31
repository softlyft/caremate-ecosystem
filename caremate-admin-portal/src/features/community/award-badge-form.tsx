'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { awardBadge, awardCertificate } from '@/domains/community/actions';
import type { CommunityBadge, CommunityCertificate } from '@/types/community';
import { Button } from '@/components/ui/button';
import { FormField, FormStack } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  userId: z.string().uuid('Enter a valid user UUID'),
  kind: z.enum(['badge', 'certificate']),
  itemId: z.string().uuid('Select an item'),
});

type FormValues = z.infer<typeof schema>;

export function AwardBadgeForm({
  badges,
  certificates,
}: {
  badges: CommunityBadge[];
  certificates: CommunityCertificate[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: '',
      kind: 'badge',
      itemId: badges[0]?.id ?? certificates[0]?.id ?? '',
    },
  });

  const kind = useWatch({ control, name: 'kind' });
  const items = kind === 'badge' ? badges : certificates;

  const onSubmit = handleSubmit((values) => {
    start(async () => {
      try {
        if (values.kind === 'badge') {
          await awardBadge(values.userId, values.itemId);
          toast.success('Badge awarded');
        } else {
          await awardCertificate(values.userId, values.itemId);
          toast.success('Certificate awarded');
        }
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Award failed');
      }
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Award recognition</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FormStack>
            <FormField label="User ID" htmlFor="userId" error={errors.userId?.message}>
              <Input id="userId" placeholder="auth user UUID" {...register('userId')} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Type" htmlFor="kind">
                <Select id="kind" {...register('kind')}>
                  <option value="badge">Badge</option>
                  <option value="certificate">Certificate</option>
                </Select>
              </FormField>
              <FormField
                label={kind === 'badge' ? 'Badge' : 'Certificate'}
                htmlFor="itemId"
                error={errors.itemId?.message}
              >
                <Select id="itemId" {...register('itemId')}>
                  {items.length === 0 ? (
                    <option value="">No items available</option>
                  ) : (
                    items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))
                  )}
                </Select>
              </FormField>
            </div>
            <Button
              type="submit"
              disabled={items.length === 0}
              loading={pending}
              loadingLabel="Awarding…"
            >
              Award
            </Button>
          </FormStack>
        </form>
      </CardContent>
    </Card>
  );
}
