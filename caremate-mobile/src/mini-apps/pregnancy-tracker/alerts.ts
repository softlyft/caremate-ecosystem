import { createInAppNotification } from '@/domains/notifications/service';
import type { NotificationSeverity } from '@/domains/notifications/types';
import {
  isMaternalTt2Due,
  type MaternalTtDose,
} from '@/mini-apps/pregnancy-tracker/maternal-tt';
import { getDaysUntilDue, getUpcomingMilestones } from '@/mini-apps/pregnancy-tracker/utils';
import { toDateKey } from '@/mini-apps/_kit/date-utils';

export type PregnancyAlertCandidate = {
  eventType:
    | 'milestone_soon'
    | 'due_soon'
    | 'due_today'
    | 'past_due'
    | 'daily_log_nudge'
    | 'tt_dose_due';
  dedupeKey: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
};

export type PregnancyAlertCopy = {
  milestoneSoonTitle: (title: string, week: number) => string;
  milestoneSoonBody: (title: string, days: number) => string;
  dueSoonTitle: (name: string, days: number) => string;
  dueSoonBody: (name: string, days: number) => string;
  dueTodayTitle: (name: string) => string;
  dueTodayBody: (name: string) => string;
  pastDueTitle: (name: string, days: number) => string;
  pastDueBody: (name: string, days: number) => string;
  dailyNudgeTitle: () => string;
  dailyNudgeBody: () => string;
  ttDoseDueTitle: () => string;
  ttDoseDueBody: () => string;
};

const DEFAULT_COPY: PregnancyAlertCopy = {
  milestoneSoonTitle: (title, week) => `Coming up: Week ${week}`,
  milestoneSoonBody: (title, days) =>
    days <= 0 ? `${title} is this week.` : `${title} is in about ${days} day(s).`,
  dueSoonTitle: (name, days) => `${name}'s due date in ${days} day(s)`,
  dueSoonBody: (name, days) =>
    `${name}'s estimated due date is in ${days} day(s). Check your pregnancy timeline.`,
  dueTodayTitle: (name) => `Today is ${name}'s due date`,
  dueTodayBody: (name) => `${name}'s estimated due date is today.`,
  pastDueTitle: (name, days) => `${days} day(s) past due date`,
  pastDueBody: (name, days) =>
    `${name}'s estimated due date was ${days} day(s) ago. Update your timeline or end pregnancy when ready.`,
  dailyNudgeTitle: () => 'Log how you feel today',
  dailyNudgeBody: () => 'A quick mood, symptom, or kick log keeps your pregnancy history useful.',
  ttDoseDueTitle: () => 'TT2 may be due',
  ttDoseDueBody: () =>
    'It has been at least 4 weeks since TT1. Ask your clinic about your next tetanus (TT) dose.',
};

/** Mother-care TT nudge — independent of pregnancy timeline setup. */
export function collectMaternalTtAlerts(params: {
  maternalTtDoses: MaternalTtDose[];
  now?: Date;
  copy?: PregnancyAlertCopy;
}): PregnancyAlertCandidate[] {
  const now = params.now ?? new Date();
  const todayKey = toDateKey(now);
  const copy = params.copy ?? DEFAULT_COPY;

  if (!isMaternalTt2Due(params.maternalTtDoses, todayKey)) {
    return [];
  }

  return [
    {
      eventType: 'tt_dose_due',
      dedupeKey: `pregnancy:tt2:${todayKey.slice(0, 7)}`,
      title: copy.ttDoseDueTitle(),
      body: copy.ttDoseDueBody(),
      severity: 'info',
    },
  ];
}

/** Pure collector used by tests and the async evaluator. */
export function collectPregnancyAlerts(params: {
  lastMenstrualPeriod: string | null;
  dueDate: string | null;
  babyNickname: string;
  hasTodayLog: boolean;
  status?: 'active' | 'postpartum' | 'ended' | null;
  maternalTtDoses?: MaternalTtDose[];
  now?: Date;
  copy?: PregnancyAlertCopy;
}): PregnancyAlertCandidate[] {
  const copy = params.copy ?? DEFAULT_COPY;
  const candidates: PregnancyAlertCandidate[] = [
    ...collectMaternalTtAlerts({
      maternalTtDoses: params.maternalTtDoses ?? [],
      now: params.now,
      copy,
    }),
  ];

  // Gestational alerts only while antenatal; postpartum is mother-care only.
  if (params.status === 'ended' || params.status === 'postpartum') {
    return candidates;
  }
  if (!params.lastMenstrualPeriod || !params.dueDate) {
    return candidates;
  }

  const now = params.now ?? new Date();
  const todayKey = toDateKey(now);
  const name = params.babyNickname.trim() || 'Baby';

  const daysUntilDue = getDaysUntilDue(params.dueDate, now);
  if (daysUntilDue !== null) {
    if (daysUntilDue === 0) {
      candidates.push({
        eventType: 'due_today',
        dedupeKey: `pregnancy:due:${params.dueDate}:today`,
        title: copy.dueTodayTitle(name),
        body: copy.dueTodayBody(name),
        severity: 'important',
      });
    } else if (daysUntilDue > 0 && daysUntilDue <= 7) {
      candidates.push({
        eventType: 'due_soon',
        dedupeKey: `pregnancy:due:${params.dueDate}:soon`,
        title: copy.dueSoonTitle(name, daysUntilDue),
        body: copy.dueSoonBody(name, daysUntilDue),
        severity: 'important',
      });
    } else if (daysUntilDue < 0) {
      const past = Math.abs(daysUntilDue);
      candidates.push({
        eventType: 'past_due',
        dedupeKey: `pregnancy:due:${params.dueDate}:past`,
        title: copy.pastDueTitle(name, past),
        body: copy.pastDueBody(name, past),
        severity: 'important',
      });
    }
  }

  const milestones = getUpcomingMilestones(params.lastMenstrualPeriod, now);
  const next = milestones.find((item) => !item.isPast && item.daysUntil <= 7);
  if (next) {
    candidates.push({
      eventType: 'milestone_soon',
      dedupeKey: `pregnancy:milestone:${next.week}:${todayKey.slice(0, 7)}`,
      title: copy.milestoneSoonTitle(next.title, next.week),
      body: copy.milestoneSoonBody(next.title, Math.max(0, next.daysUntil)),
      severity: 'info',
    });
  }

  if (!params.hasTodayLog) {
    candidates.push({
      eventType: 'daily_log_nudge',
      dedupeKey: `pregnancy:daily:${todayKey}`,
      title: copy.dailyNudgeTitle(),
      body: copy.dailyNudgeBody(),
      severity: 'info',
    });
  }

  return candidates;
}

/** Best-effort inbox write. Never throws to callers. */
export async function evaluatePregnancyAlerts(params: {
  userId: string;
  lastMenstrualPeriod: string | null;
  dueDate: string | null;
  babyNickname: string;
  hasTodayLog: boolean;
  status?: 'active' | 'postpartum' | 'ended' | null;
  maternalTtDoses?: MaternalTtDose[];
  notificationsEnabled: boolean;
  now?: Date;
  copy?: PregnancyAlertCopy;
}): Promise<number> {
  if (!params.notificationsEnabled || !params.userId) {
    return 0;
  }

  const candidates = collectPregnancyAlerts(params);
  let written = 0;
  for (const candidate of candidates) {
    try {
      await createInAppNotification({
        userId: params.userId,
        domain: 'pregnancy',
        eventType: candidate.eventType,
        title: candidate.title,
        body: candidate.body,
        severity: candidate.severity,
        entityType: candidate.eventType === 'tt_dose_due' ? 'maternal_tt' : 'pregnancy',
        entityId: params.dueDate,
        dedupeKey: candidate.dedupeKey,
        data: {
          route:
            candidate.eventType === 'tt_dose_due'
              ? '/(app)/apps/pregnancy-tracker/tt'
              : '/(app)/apps/pregnancy-tracker',
        },
      });
      written += 1;
    } catch {
      // Inbox must never break pregnancy flows.
    }
  }
  return written;
}
