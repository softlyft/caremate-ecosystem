export type {
  CreateInAppNotificationInput,
  InAppNotification,
  NotificationDomain,
  NotificationSeverity,
} from '@/domains/notifications/types';
export { notificationRepository } from '@/domains/notifications/repository';
export { resolveNotificationHref } from '@/domains/notifications/resolve-href';
export {
  createInAppNotification,
  ensureWelcomeInAppNotification,
  markNotificationsRead,
} from '@/domains/notifications/service';
export {
  allowsOsNotifications,
  applyNotificationsEnabledPreference,
  claimExclusiveNotificationDevice,
  clearDeviceNotificationState,
  clearLocalReminderNotifications,
  clearPushRegistration,
  reconcilePushRegistrationWithOsPermission,
  syncPushRegistration,
} from '@/domains/notifications/push';
