'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { CHAPTER_TYPES } from '@/constants/chapter-types';
import {
  getChapter,
  requestChapterCreation,
  searchChapters,
} from '@/domains/chapters/repository';

export async function searchChaptersAction(formData: FormData) {
  return searchChapters({
    query: String(formData.get('query') || ''),
    countryCode: String(formData.get('country_code') || '') || undefined,
    chapterType: (String(formData.get('chapter_type') || '') || undefined) as
      | undefined
      | (typeof CHAPTER_TYPES)[number],
  });
}

export async function getChapterAction(chapterId: string) {
  return getChapter(chapterId);
}

const requestSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional().nullable(),
  chapter_type: z.enum(CHAPTER_TYPES),
  country_code: z.string().min(2),
  state_id: z.string().uuid().optional().nullable().or(z.literal('')),
  city_id: z.string().uuid().optional().nullable().or(z.literal('')),
});

export async function requestChapterCreationAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const parsed = requestSchema.parse({
    name: formData.get('name'),
    description: formData.get('description') || null,
    chapter_type: formData.get('chapter_type'),
    country_code: formData.get('country_code'),
    state_id: formData.get('state_id') || null,
    city_id: formData.get('city_id') || null,
  });

  const request = await requestChapterCreation({
    requested_by: user.id,
    name: parsed.name,
    description: parsed.description,
    chapter_type: parsed.chapter_type,
    country_code: parsed.country_code,
    state_id: parsed.state_id || null,
    city_id: parsed.city_id || null,
  });

  revalidatePath('/join');
  revalidatePath('/app/community');
  return request;
}
