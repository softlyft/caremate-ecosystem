import type { ChapterType } from '@/types/database';

export const CHAPTER_TYPES = [
  'campus',
  'city',
  'community',
  'organization',
  'healthcare_partner',
] as const satisfies readonly ChapterType[];

export const CHAPTER_TYPE_LABELS: Record<ChapterType, string> = {
  campus: 'Campus',
  city: 'City',
  community: 'Community',
  organization: 'Organization',
  healthcare_partner: 'Healthcare Partner',
};
