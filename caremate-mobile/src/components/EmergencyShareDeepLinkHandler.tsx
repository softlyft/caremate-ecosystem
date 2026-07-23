import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { parseEmergencyShareToken } from '@/domains/emergency/share';

async function openEmergencyShareFromUrl(url: string): Promise<void> {
  const token = parseEmergencyShareToken(url);
  if (!token) {
    return;
  }
  router.push(`/emergency/share/${token}`);
}

/** Opens Patient ID QR deep links: caremate://emergency/share/<token> */
export function EmergencyShareDeepLinkHandler() {
  const handledInitial = useRef(false);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      void openEmergencyShareFromUrl(url);
    });

    if (!handledInitial.current) {
      handledInitial.current = true;
      void Linking.getInitialURL().then((url) => {
        if (url) {
          return openEmergencyShareFromUrl(url);
        }
      });
    }

    return () => sub.remove();
  }, []);

  return null;
}
