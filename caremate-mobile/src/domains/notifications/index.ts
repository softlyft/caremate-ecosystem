export type {
  CreateInAppNotificationInput,
  InAppNotification,
  NotificationDomain,
  NotificationSeverity,
} from '@/domains/notifications/types';
export { notificationRepository } from '@/domains/notifications/repository';
export {
  createInAppNotification,
  ensureWelcomeInAppNotification,
  markNotificationsRead,
} from '@/domains/notifications/service';
