import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform } from 'react-native';
import { captureRef, type ViewShotRef } from 'react-native-view-shot';

import {
  DAILY_INSIGHT_SHARE_HEIGHT,
  DAILY_INSIGHT_SHARE_WIDTH,
} from '@/features/home/components/DailyInsightShareCard';

const CAPTURE_SCALE = 3;

export type ShareDailyInsightResult =
  | { ok: true }
  | { ok: false; reason: 'unavailable' | 'capture' | 'share' };

/**
 * Capture the branded Daily insight card and open the OS share sheet.
 * iOS/Android both use expo-sharing with a temp PNG (more reliable than RN Share for images).
 */
export async function shareDailyInsightImage(
  viewRef: RefObject<ViewShotRef | null>,
): Promise<ShareDailyInsightResult> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return { ok: false, reason: 'unavailable' };
  }

  let uri: string;
  try {
    uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: DAILY_INSIGHT_SHARE_WIDTH * CAPTURE_SCALE,
      height: DAILY_INSIGHT_SHARE_HEIGHT * CAPTURE_SCALE,
    });
  } catch {
    return { ok: false, reason: 'capture' };
  }

  try {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: Platform.OS === 'android' ? 'Share Daily insight' : undefined,
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'share' };
  }
}
