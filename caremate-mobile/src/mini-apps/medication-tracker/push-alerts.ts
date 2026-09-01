import { GUEST_USER_ID } from '@/constants/guest';
import type { MedicationAlertCandidate } from '@/mini-apps/medication-tracker/alerts';
import { MEDICATION_TRACKER_PATH } from '@/mini-apps/medication-tracker/scheduled-notifications';
import { supabase } from '@/lib/supabase';

type MedicationPushAlertPayload = {
  eventType: MedicationAlertCandidate['eventType'];
  dedupeKey: string;
  title: string;
  body: string;
  severity: MedicationAlertCandidate['severity'];
  entityId: string;
};

/** Best-effort remote Expo push for signed-in users. Idempotent on the server via dedupe keys. */
export async function sendMedicationPushAlerts(params: {
  userId: string;
  alerts: MedicationAlertCandidate[];
}): Promise<void> {
  if (!params.alerts.length || !params.userId || params.userId === GUEST_USER_ID) {
    return;
  }

  const payload: MedicationPushAlertPayload[] = params.alerts.map((alert) => ({
    eventType: alert.eventType,
    dedupeKey: alert.dedupeKey,
    title: alert.title,
    body: alert.body,
    severity: alert.severity,
    entityId: alert.entityId,
  }));

  try {
    const { error } = await supabase.functions.invoke('notify-medication', {
      body: { alerts: payload },
    });
    if (error && __DEV__) {
      console.warn('sendMedicationPushAlerts', error.message);
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('sendMedicationPushAlerts', err instanceof Error ? err.message : err);
    }
  }
}

export { MEDICATION_TRACKER_PATH };
