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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input id="userId" placeholder="auth user UUID" {...register('userId')} />
            {errors.userId ? (
              <p className="text-xs text-danger">{errors.userId.message}</p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kind">Type</Label>
              <Select id="kind" {...register('kind')}>
                <option value="badge">Badge</option>
                <option value="certificate">Certificate</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemId">{kind === 'badge' ? 'Badge' : 'Certificate'}</Label>
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
              {errors.itemId ? (
                <p className="text-xs text-danger">{errors.itemId.message}</p>
              ) : null}
            </div>
          </div>
          <Button
            type="submit"
            disabled={items.length === 0}
            loading={pending}
            loadingLabel="Awarding…"
          >
            Award
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
