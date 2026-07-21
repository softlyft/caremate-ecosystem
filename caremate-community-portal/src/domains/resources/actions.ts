'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireCommunitySession } from '@/lib/auth';
import { POINT_VALUES } from '@/constants/points';
import { recordContribution } from '@/domains/contributions/repository';
import { recordDownload, searchResources } from '@/domains/resources/repository';

export async function searchResourcesAction(formData?: FormData) {
  const session = await requireCommunitySession();
  const query = formData ? String(formData.get('query') || '') : '';
  const tagsRaw = formData ? String(formData.get('tags') || '') : '';
  const tags = tagsRaw
    ? tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined;

  return searchResources({
    query,
    chapterId: session.activeChapterId,
    tags,
  });
}

export async function recordDownloadAction(formData: FormData) {
  const session = await requireCommunitySession();
  const resourceId = z.string().uuid().parse(formData.get('resource_id'));
  const result = await recordDownload(resourceId);

  await recordContribution({
    user_id: session.user.id,
    chapter_id: session.activeChapterId,
    action_type: 'resource_download',
    description: `Downloaded ${result.resource.title}`,
    points: POINT_VALUES.resource_download,
    recorded_by: session.user.id,
    metadata: { resource_id: resourceId },
  });

  if (result.signedUrl) {
    redirect(result.signedUrl);
  }
}
