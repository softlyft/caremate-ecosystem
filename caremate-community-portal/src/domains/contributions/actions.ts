'use server';

import { z } from 'zod';
import { requireCommunitySession, requireLeaderAccess } from '@/lib/auth';
import {
  getSummary,
  listForUser,
  recordContribution,
} from '@/domains/contributions/repository';

export async function recordContributionAction(formData: FormData) {
  const session = await requireLeaderAccess();
  const userId = z.string().uuid().parse(formData.get('user_id'));
  const actionType = z.string().min(1).parse(formData.get('action_type'));
  const description = (formData.get('description') as string) || null;
  const points = z.coerce.number().int().parse(formData.get('points') || 0);

  return recordContribution({
    user_id: userId,
    chapter_id: session.activeChapterId,
    action_type: actionType,
    description,
    points,
    recorded_by: session.user.id,
  });
}

export async function listForUserAction(userId?: string) {
  const session = await requireCommunitySession();
  return listForUser(userId ?? session.user.id);
}

export async function getSummaryAction(userId?: string) {
  const session = await requireCommunitySession();
  return getSummary(userId ?? session.user.id);
}
