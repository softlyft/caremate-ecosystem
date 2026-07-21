export type NotificationSeverity = 'info' | 'important' | 'critical';

export type NotificationDomain =
  | 'family'
  | 'medication'
  | 'immunization'
  | 'checkup'
  | 'pregnancy'
  | 'period'
  | 'profile'
  | 'emergency'
  | 'auth'
  | 'billing'
  | 'learn'
  | 'nearby'
  | 'sync'
  | 'system';

export type InAppNotification = {
  id: string;
  userId: string;
  domain: NotificationDomain | string;
  eventType: string;
  title: string;
  body: string;
  severity: NotificationSeverity | string;
  entityType: string | null;
  entityId: string | null;
  data: Record<string, unknown>;
  dedupeKey: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateInAppNotificationInput = {
  userId: string;
  domain: NotificationDomain | string;
  eventType: string;
  title: string;
  body: string;
  severity?: NotificationSeverity | string;
  entityType?: string | null;
  entityId?: string | null;
  data?: Record<string, unknown>;
  /** When set, re-creating the same key updates title/body instead of inserting a duplicate. */
  dedupeKey?: string | null;
};
