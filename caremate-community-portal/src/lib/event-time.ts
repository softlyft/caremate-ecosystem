/** Whether an event start time is still in the future (ISO comparison). */
export function isUpcomingEvent(startsAt: string): boolean {
  return startsAt >= new Date().toISOString();
}
