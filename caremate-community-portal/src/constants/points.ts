export const POINT_VALUES = {
  onboarding: 10,
  event_register: 15,
  event_attend: 25,
  resource_download: 5,
} as const;

export type PointAction = keyof typeof POINT_VALUES;
