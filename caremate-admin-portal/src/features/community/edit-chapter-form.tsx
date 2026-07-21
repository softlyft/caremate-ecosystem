'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { updateChapter } from '@/domains/community/actions';
import type { ChapterType, CommunityChapter, CommunityCountry } from '@/types/community';
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

export function EditChapterForm({
  chapter,
  countries,
  onClose,
}: {
  chapter: CommunityChapter;
  countries: CommunityCountry[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [countryCode, setCountryCode] = useState(chapter.country_code);
  const [administrativeHierarchy, setAdministrativeHierarchy] = useState<
    Record<string, string>
  >(chapter.administrative_hierarchy ?? {});

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: chapter.name,
      description: chapter.description ?? '',
      chapter_type: chapter.chapter_type,
      country_code: chapter.country_code,
      status: chapter.status,
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
        const updated = await updateChapter({
          id: chapter.id,
          name: values.name,
          description: values.description || null,
          chapter_type: values.chapter_type,
          country_code: values.country_code,
          administrative_hierarchy: hierarchy,
          status: values.status,
        });
        toast.success(`Updated ${updated.name}`);
        onClose();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not update chapter');
      }
    });
  });

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Edit chapter</CardTitle>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`edit_name_${chapter.id}`}>Name</Label>
              <Input id={`edit_name_${chapter.id}`} {...register('name')} />
              {errors.name ? (
                <p className="text-xs text-danger">{errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`edit_description_${chapter.id}`}>Description</Label>
              <Textarea id={`edit_description_${chapter.id}`} rows={2} {...register('description')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit_type_${chapter.id}`}>Type</Label>
              <Select id={`edit_type_${chapter.id}`} {...register('chapter_type')}>
                {CHAPTER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CHAPTER_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit_country_${chapter.id}`}>Country</Label>
              <Select
                id={`edit_country_${chapter.id}`}
                value={countryCode}
                onChange={(event) => {
                  const nextCountry = event.target.value;
                  setCountryCode(nextCountry);
                  setValue('country_code', nextCountry, { shouldValidate: true });
                  setAdministrativeHierarchy({});
                }}
              >
                {countries.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </Select>
            </div>
            <AdministrativeHierarchyFields
              country={country}
              value={administrativeHierarchy}
              onChange={setAdministrativeHierarchy}
              idPrefix={`edit_admin_${chapter.id}`}
            />
            <div className="space-y-2">
              <Label htmlFor={`edit_status_${chapter.id}`}>Status</Label>
              <Select id={`edit_status_${chapter.id}`} {...register('status')}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={pending} loadingLabel="Saving…">
              Save changes
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
