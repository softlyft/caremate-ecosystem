'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createChapter } from '@/domains/community/actions';
import type { ChapterType, CommunityCountry } from '@/types/community';
import { sanitizeAdministrativeHierarchy, sortedAdministrativeLevels } from '@/lib/community-geography';
import { AdministrativeHierarchyFields } from '@/components/community/administrative-hierarchy-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CHAPTER_TYPES = [
  'campus',
  'city',
  'community',
  'organization',
  'healthcare_partner',
] as const satisfies readonly ChapterType[];

const CHAPTER_TYPE_LABELS: Record<ChapterType, string> = {
  campus: 'Campus',
  city: 'City',
  community: 'Community',
  organization: 'Organization',
  healthcare_partner: 'Healthcare Partner',
};

const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  chapter_type: z.enum(CHAPTER_TYPES),
  country_code: z.string().min(2, 'Select a country'),
  status: z.enum(['active', 'pending', 'archived']),
});

type FormValues = z.infer<typeof schema>;

export function CreateChapterForm({
  countries,
}: {
  countries: CommunityCountry[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [countryCode, setCountryCode] = useState(countries[0]?.code ?? 'NG');
  const [administrativeHierarchy, setAdministrativeHierarchy] = useState<
    Record<string, string>
  >({});
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      chapter_type: 'community',
      country_code: countries[0]?.code ?? 'NG',
      status: 'active',
    },
  });

  const country = useMemo(
    () => countries.find((item) => item.code === countryCode),
    [countries, countryCode],
  );

  const onSubmit = handleSubmit((values) => {
    start(async () => {
      try {
        const hierarchy = sanitizeAdministrativeHierarchy(
          sortedAdministrativeLevels(country),
          administrativeHierarchy,
        );
        const chapter = await createChapter({
          name: values.name,
          description: values.description || null,
          chapter_type: values.chapter_type,
          country_code: values.country_code,
          administrative_hierarchy: hierarchy,
          status: values.status,
        });
        toast.success(`Created ${chapter.name}`);
        reset({
          name: '',
          description: '',
          chapter_type: 'community',
          country_code: values.country_code,
          status: 'active',
        });
        setAdministrativeHierarchy({});
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not create chapter');
      }
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create chapter</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Lagos Mainland Chapter" {...register('name')} />
              {errors.name ? (
                <p className="text-xs text-danger">{errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={2}
                placeholder="Optional summary for members"
                {...register('description')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chapter_type">Type</Label>
              <Select id="chapter_type" {...register('chapter_type')}>
                {CHAPTER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CHAPTER_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country_code">Country</Label>
              <Select
                id="country_code"
                value={countryCode}
                onChange={(event) => {
                  const nextCountry = event.target.value;
                  setCountryCode(nextCountry);
                  setValue('country_code', nextCountry, { shouldValidate: true });
                  setAdministrativeHierarchy({});
                }}
              >
                {countries.length === 0 ? (
                  <option value="">No countries seeded</option>
                ) : (
                  countries.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name} ({item.code})
                    </option>
                  ))
                )}
              </Select>
              {errors.country_code ? (
                <p className="text-xs text-danger">{errors.country_code.message}</p>
              ) : null}
            </div>
            <AdministrativeHierarchyFields
              country={country}
              value={administrativeHierarchy}
              onChange={setAdministrativeHierarchy}
              idPrefix="create_admin"
            />
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" {...register('status')}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted">
            Country is required. Select fixed subdivisions (for example Nigeria State → LGA), or
            choose Other to type a custom value. Lower levels can be filled later when editing.
          </p>
          <Button
            type="submit"
            disabled={countries.length === 0}
            loading={pending}
            loadingLabel="Creating…"
          >
            Create chapter
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
