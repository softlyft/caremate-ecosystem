import {
  collectDailyTipScheduledNotifications,
  DAILY_TIP_NOTIFICATION_PREFIX,
} from '@/domains/tips/scheduled-notifications';
import { parseDateKey, toDateKey } from '@/mini-apps/_kit/date-utils';

describe('tips/scheduled-notifications', () => {
  it('plans 08:00 local reminders for future tip days', () => {
    const now = new Date(2026, 10, 24, 9, 0, 0); // after 8am today
    const planned = collectDailyTipScheduledNotifications({
      tips: [
        { dateKey: '2026-11-24', body: 'Skip — already past 8am' },
        { dateKey: '2026-11-25', body: 'Tomorrow tip' },
        { dateKey: '2026-11-26', body: 'Day after tip' },
      ],
      now,
      title: 'Daily insight',
    });

    expect(planned).toHaveLength(2);
    expect(planned.map((item) => item.dateKey)).toEqual(['2026-11-25', '2026-11-26']);
    expect(planned[0]?.identifier).toBe(`${DAILY_TIP_NOTIFICATION_PREFIX}2026-11-25`);
    expect(planned[0]?.title).toBe('Daily insight');
    expect(planned[0]?.body).toBe('Tomorrow tip');
    expect(planned[0]?.triggerAt.getHours()).toBe(8);
    expect(planned[0]?.triggerAt.getMinutes()).toBe(0);
    expect(toDateKey(planned[0]!.triggerAt)).toBe('2026-11-25');
  });

  it('includes today when still before 08:00', () => {
    const now = new Date(2026, 10, 24, 7, 30, 0);
    const planned = collectDailyTipScheduledNotifications({
      tips: [{ dateKey: '2026-11-24', body: 'Morning tip' }],
      now,
    });
    expect(planned).toHaveLength(1);
    const expected = parseDateKey('2026-11-24');
    expected.setHours(8, 0, 0, 0);
    expect(planned[0]?.triggerAt.getTime()).toBe(expected.getTime());
  });

  it('skips empty tip bodies', () => {
    const planned = collectDailyTipScheduledNotifications({
      tips: [
        { dateKey: '2026-11-25', body: '   ' },
        { dateKey: '2026-11-26', body: 'Keep me' },
      ],
      now: new Date(2026, 10, 24, 9, 0, 0),
    });
    expect(planned.map((item) => item.dateKey)).toEqual(['2026-11-26']);
  });
});
