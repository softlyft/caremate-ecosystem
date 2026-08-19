import { CHECKUP_CATALOG } from '@/mini-apps/checkup-planner/constants';
import { VACCINE_SCHEDULE } from '@/mini-apps/immunization-tracker/constants';
import type { MiniAppKey } from '@/mini-apps/_kit/snapshot-repository';

import type { HealthTimelineKind, ProjectedTimelineEvent } from '@/domains/timeline/types';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function dateKeyFromUnknown(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) {
    return null;
  }
  if (DATE_KEY.test(raw)) {
    return raw;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function eventId(
  userId: string,
  appKey: MiniAppKey,
  kind: HealthTimelineKind,
  naturalKey: string,
): string {
  return `${userId}:${appKey}:${kind}:${naturalKey}`;
}

function titleFromVitalType(type: string): string {
  return type
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function projectVitals(userId: string, payload: Record<string, unknown>): ProjectedTimelineEvent[] {
  const events: ProjectedTimelineEvent[] = [];
  for (const item of asArray(payload.entries)) {
    const entry = asRecord(item);
    if (!entry) continue;
    const id = asString(entry.id);
    const occurredAt = asString(entry.recordedAt);
    const occurredOn = dateKeyFromUnknown(occurredAt);
    const type = asString(entry.type) ?? 'vital';
    if (!id || !occurredOn) continue;

    const unit = asString(entry.unit) ?? '';
    let summary = '';
    if (type === 'blood_pressure' && entry.systolic != null && entry.diastolic != null) {
      summary = `${entry.systolic}/${entry.diastolic}${unit ? ` ${unit}` : ''}`;
    } else if (typeof entry.value === 'number') {
      summary = `${entry.value}${unit ? ` ${unit}` : ''}`;
    }

    events.push({
      id: eventId(userId, 'vitals', 'vital', id),
      userId,
      appKey: 'vitals',
      kind: 'vital',
      occurredOn,
      occurredAt,
      title: titleFromVitalType(type),
      summary,
      payload: {
        type,
        unit: unit || undefined,
        value: entry.value,
        systolic: entry.systolic,
        diastolic: entry.diastolic,
      },
    });
  }
  return events;
}

function projectMedication(
  userId: string,
  payload: Record<string, unknown>,
): ProjectedTimelineEvent[] {
  const medNames = new Map<string, string>();
  for (const item of asArray(payload.medications)) {
    const med = asRecord(item);
    if (!med) continue;
    const id = asString(med.id);
    const name = asString(med.name);
    if (id && name) {
      medNames.set(id, name);
    }
  }

  const events: ProjectedTimelineEvent[] = [];
  for (const item of asArray(payload.logs)) {
    const log = asRecord(item);
    if (!log) continue;
    const id = asString(log.id);
    const occurredOn = dateKeyFromUnknown(log.dateKey);
    if (!id || !occurredOn) continue;
    const medicationId = asString(log.medicationId);
    const name = (medicationId && medNames.get(medicationId)) || 'Medication';
    const takenAt = asString(log.takenAt);

    events.push({
      id: eventId(userId, 'medication', 'med_dose', id),
      userId,
      appKey: 'medication',
      kind: 'med_dose',
      occurredOn,
      occurredAt: takenAt,
      title: name,
      summary: 'Dose logged',
      payload: {
        medicationId,
        slotIndex: log.slotIndex,
      },
    });
  }
  return events;
}

function pushPregnancyLog(
  events: ProjectedTimelineEvent[],
  userId: string,
  pregnancyId: string,
  log: Record<string, unknown>,
): void {
  const dateKey = dateKeyFromUnknown(log.dateKey);
  if (!dateKey) return;
  const mood = asString(log.mood);
  const notes = asString(log.notes);
  const symptoms = asArray(log.symptoms)
    .map((s) => asString(s))
    .filter((s): s is string => Boolean(s));
  const summaryParts = [mood, symptoms.slice(0, 3).join(', '), notes].filter(Boolean);

  events.push({
    id: eventId(userId, 'pregnancy', 'pregnancy_log', `${pregnancyId}:${dateKey}`),
    userId,
    appKey: 'pregnancy',
    kind: 'pregnancy_log',
    occurredOn: dateKey,
    occurredAt: null,
    title: 'Pregnancy log',
    summary: summaryParts.join(' · '),
    payload: { pregnancyId, mood, kickCount: log.kickCount },
  });
}

function pushTtDose(
  events: ProjectedTimelineEvent[],
  userId: string,
  pregnancyId: string,
  dose: Record<string, unknown>,
): void {
  const doseId = asString(dose.id);
  const dateKey = dateKeyFromUnknown(dose.dateKey);
  if (!doseId || !dateKey) return;
  const label = doseId.toUpperCase();
  events.push({
    id: eventId(userId, 'pregnancy', 'tt_dose', `${pregnancyId}:${doseId}`),
    userId,
    appKey: 'pregnancy',
    kind: 'tt_dose',
    occurredOn: dateKey,
    occurredAt: null,
    title: `Maternal ${label}`,
    summary: dateKey,
    payload: { pregnancyId, doseId },
  });
}

function projectPregnancy(
  userId: string,
  payload: Record<string, unknown>,
): ProjectedTimelineEvent[] {
  const events: ProjectedTimelineEvent[] = [];
  const currentId = asString(payload.pregnancyId) ?? 'current';

  const dailyLogs = asRecord(payload.dailyLogs) ?? {};
  for (const log of Object.values(dailyLogs)) {
    const record = asRecord(log);
    if (record) {
      pushPregnancyLog(events, userId, currentId, record);
    }
  }

  for (const item of asArray(payload.maternalTtDoses)) {
    const dose = asRecord(item);
    if (dose) {
      pushTtDose(events, userId, currentId, dose);
    }
  }

  for (const item of asArray(payload.pastPregnancies)) {
    const archive = asRecord(item);
    if (!archive) continue;
    const archiveId = asString(archive.id) ?? 'archive';
    for (const log of asArray(archive.dailyLogs)) {
      const record = asRecord(log);
      if (record) {
        pushPregnancyLog(events, userId, archiveId, record);
      }
    }
    for (const dose of asArray(archive.maternalTtDoses)) {
      const record = asRecord(dose);
      if (record) {
        pushTtDose(events, userId, archiveId, record);
      }
    }
  }

  return events;
}

function projectPeriod(userId: string, payload: Record<string, unknown>): ProjectedTimelineEvent[] {
  const events: ProjectedTimelineEvent[] = [];
  for (const day of asArray(payload.loggedPeriodDays)) {
    const dateKey = dateKeyFromUnknown(day);
    if (!dateKey) continue;
    events.push({
      id: eventId(userId, 'period', 'period_day', dateKey),
      userId,
      appKey: 'period',
      kind: 'period_day',
      occurredOn: dateKey,
      occurredAt: null,
      title: 'Period day',
      summary: dateKey,
      payload: {},
    });
  }
  return events;
}

function projectImmunization(
  userId: string,
  payload: Record<string, unknown>,
): ProjectedTimelineEvent[] {
  const names = new Map<string, string>();
  for (const item of asArray(payload.profiles)) {
    const profile = asRecord(item);
    if (!profile) continue;
    const id = asString(profile.id);
    const name = asString(profile.name);
    if (id && name) {
      names.set(id, name);
    }
  }

  const events: ProjectedTimelineEvent[] = [];
  for (const item of asArray(payload.records)) {
    const record = asRecord(item);
    if (!record) continue;
    const profileId = asString(record.profileId);
    const vaccineId = asString(record.vaccineId);
    const occurredOn = dateKeyFromUnknown(record.administeredDate);
    if (!profileId || !vaccineId || !occurredOn) continue;
    const vaccine = VACCINE_SCHEDULE.find((entry) => entry.id === vaccineId);
    const profileName = names.get(profileId);
    const title = vaccine ? `${vaccine.name} (${vaccine.doseLabel})` : vaccineId;
    events.push({
      id: eventId(userId, 'immunization', 'vaccine', `${profileId}:${vaccineId}`),
      userId,
      appKey: 'immunization',
      kind: 'vaccine',
      occurredOn,
      occurredAt: null,
      title,
      summary: profileName ?? occurredOn,
      payload: { profileId, vaccineId },
    });
  }
  return events;
}

function projectCheckup(userId: string, payload: Record<string, unknown>): ProjectedTimelineEvent[] {
  const events: ProjectedTimelineEvent[] = [];
  for (const item of asArray(payload.completions)) {
    const completion = asRecord(item);
    if (!completion) continue;
    const checkupId = asString(completion.checkupId);
    const year = typeof completion.year === 'number' ? completion.year : null;
    const occurredOn = dateKeyFromUnknown(completion.completedDate);
    if (!checkupId || year == null || !occurredOn) continue;
    const catalog = CHECKUP_CATALOG.find((entry) => entry.id === checkupId);
    events.push({
      id: eventId(userId, 'checkup', 'checkup', `${checkupId}:${year}`),
      userId,
      appKey: 'checkup',
      kind: 'checkup',
      occurredOn,
      occurredAt: null,
      title: catalog?.name ?? checkupId,
      summary: String(year),
      payload: { checkupId, year },
    });
  }
  return events;
}

export function projectMiniAppEvents(
  userId: string,
  appKey: MiniAppKey,
  payload: Record<string, unknown>,
): ProjectedTimelineEvent[] {
  switch (appKey) {
    case 'vitals':
      return projectVitals(userId, payload);
    case 'medication':
      return projectMedication(userId, payload);
    case 'pregnancy':
      return projectPregnancy(userId, payload);
    case 'period':
      return projectPeriod(userId, payload);
    case 'immunization':
      return projectImmunization(userId, payload);
    case 'checkup':
      return projectCheckup(userId, payload);
    default:
      return [];
  }
}
