import * as Linking from 'expo-linking';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { parseEmergencyShareToken } from '@/domains/emergency/share';

/** Ignore Linking's duplicate cold-start `url` event (common on Android). */
const COLD_START_DEDUPE_MS = 2_000;

function shareHref(token: string): `/emergency/share/${string}` {
  return `/emergency/share/${token}`;
}

function isViewingEmergencyShare(pathname: string, token: string): boolean {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized === shareHref(token) || normalized.endsWith(`/emergency/share/${token}`);
}

/**
 * Opens Patient ID QR deep links: caremate://emergency/share/<token>
 * (and https://…/emergency/share/<token> when Linking delivers them while the app is warm).
 *
 * Cold-start launch URLs are already applied by Expo Router's file-based linking.
 * Pushing again stacks a duplicate Emergency Details screen so hardware back needs
 * two presses while the in-app "Go back" (replace) still looks fine.
 */
export function EmergencyShareDeepLinkHandler() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const lastHandledRef = useRef<{ token: string; at: number } | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    let acceptWarmEvents = false;

    const remember = (token: string) => {
      lastHandledRef.current = { token, at: Date.now() };
    };

    const openWarmShare = (url: string) => {
      const token = parseEmergencyShareToken(url);
      if (!token) {
        return;
      }

      const last = lastHandledRef.current;
      if (last?.token === token && Date.now() - last.at < COLD_START_DEDUPE_MS) {
        return;
      }

      if (isViewingEmergencyShare(pathnameRef.current, token)) {
        remember(token);
        return;
      }

      remember(token);
      router.push(shareHref(token));
    };

    const sub = Linking.addEventListener('url', ({ url }) => {
      if (!acceptWarmEvents) {
        // Event arrived before getInitialURL settled — treat as cold-start noise.
        const token = parseEmergencyShareToken(url);
        if (token) {
          remember(token);
        }
        return;
      }
      openWarmShare(url);
    });

    void Linking.getInitialURL()
      .then((url) => {
        if (cancelled) {
          return;
        }
        // Expo Router already mounted this route from the launch URL.
        const token = url ? parseEmergencyShareToken(url) : null;
        if (token) {
          remember(token);
        }
      })
      .finally(() => {
        if (!cancelled) {
          acceptWarmEvents = true;
        }
      });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return null;
}
