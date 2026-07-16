import { QUERY_KEYS } from '@/constants/config';
import { GUEST_USER_ID } from '@/constants/guest';
import { translateText } from '@/domains/localization';
import type { LanguageCode } from '@/domains/localization/types';
import { notificationRepository } from '@/domains/notifications/repository';
import type { CreateInAppNotificationInput } from '@/domains/notifications/types';
import { queryClient } from '@/lib/query-client';

const WELCOME_DEDUPE_KEY = 'system:welcome';

export async function createInAppNotification(input: CreateInAppNotificationInput): Promise<void> {
  await notificationRepository.create(input);
  await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
}

export async function markNotificationsRead(userId: string): Promise<void> {
  await notificationRepository.markAllRead(userId);
  await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
}

/** First inbox card after onboarding — app tour. Idempotent via dedupe key. */
export async function ensureWelcomeInAppNotification(params: {
  userId?: string | null;
  languageCode: string;
}): Promise<void> {
  const userId = params.userId?.trim() || GUEST_USER_ID;
  const language = params.languageCode as LanguageCode;

  try {
    await createInAppNotification({
      userId,
      domain: 'system',
      eventType: 'welcome',
      title: translateText(language, 'home.notifications.welcomeTitle'),
      body: translateText(language, 'home.notifications.welcomeBody'),
      severity: 'info',
      dedupeKey: WELCOME_DEDUPE_KEY,
    });
  } catch {
    // Welcome card is best-effort; onboarding must not fail because of it.
  }
}
