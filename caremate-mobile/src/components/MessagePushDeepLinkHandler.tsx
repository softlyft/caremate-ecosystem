import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import { config } from '@/constants/env';
import { MEDICATION_TRACKER_PATH } from '@/mini-apps/medication-tracker/push-alerts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractConversationId(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;

  const direct = data.conversationId ?? data.conversation_id;
  if (typeof direct === 'string' && UUID_RE.test(direct.trim())) {
    return direct.trim();
  }

  const path = data.path;
  if (typeof path === 'string') {
    const match = path.match(/\/messages\/([0-9a-f-]{36})/i);
    if (match?.[1] && UUID_RE.test(match[1])) {
      return match[1];
    }
  }

  return null;
}

function openConversation(conversationId: string) {
  router.push(`/(app)/messages/${conversationId}`);
}

function extractMedicationPath(data: Record<string, unknown> | undefined): Href | null {
  if (!data) return null;
  if (data.domain === 'medication') {
    const path = data.path;
    if (typeof path === 'string' && path.trim()) {
      return path.trim() as Href;
    }
    return MEDICATION_TRACKER_PATH;
  }
  return null;
}

/**
 * Opens org message push taps (provider or payer) on the matching thread.
 */
export function MessagePushDeepLinkHandler() {
  const handledColdStart = useRef(false);

  useEffect(() => {
    if (!config.isSupabaseConfigured) {
      return;
    }

    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = response.notification.request.content.data as
        Record<string, unknown> | undefined;
      const medicationPath = extractMedicationPath(data);
      if (medicationPath) {
        router.push(medicationPath);
        return;
      }
      const conversationId = extractConversationId(data);
      if (conversationId) {
        openConversation(conversationId);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleResponse(response);
    });

    if (!handledColdStart.current) {
      handledColdStart.current = true;
      void Notifications.getLastNotificationResponseAsync().then(handleResponse);
    }

    return () => {
      sub.remove();
    };
  }, []);

  return null;
}
