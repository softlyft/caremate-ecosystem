import { HEALTH_CATEGORIES } from '@/features/home/constants';
import { healthTipRepository } from '@/domains/tips/repository';

export type HealthTipCategoryId = (typeof HEALTH_CATEGORIES)[number]['id'];

export interface DailyHealthTipResult {
  categoryId: HealthTipCategoryId;
  categoryName: string;
  emoji: string;
  tip: string;
  tipIndex: number;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getDayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function getDailyHealthTip(
  userKey = 'guest',
  date = new Date(),
): Promise<DailyHealthTipResult | null> {
  const tips = await healthTipRepository.findActive();
  if (tips.length === 0) {
    return null;
  }

  const categories = HEALTH_CATEGORIES;
  const day = getDayOfYear(date);
  const userHash = hashString(userKey);
  const categoryIndex = (day + userHash) % categories.length;
  const category = categories[categoryIndex];

  const categoryTips = tips.filter((tip) => tip.categoryId === category.id);
  const pool = categoryTips.length > 0 ? categoryTips : tips;
  const tipIndex = (day + userHash) % pool.length;
  const chosen = pool[tipIndex];
  if (!chosen?.body?.trim()) {
    return null;
  }

  return {
    categoryId: category.id,
    categoryName: category.name,
    emoji: category.emoji,
    tip: chosen.body,
    tipIndex,
  };
}

export async function getHealthTipsForCategory(
  categoryId: HealthTipCategoryId,
): Promise<string[]> {
  const rows = await healthTipRepository.findActiveByCategory(categoryId);
  return rows.map((row) => row.body);
}
