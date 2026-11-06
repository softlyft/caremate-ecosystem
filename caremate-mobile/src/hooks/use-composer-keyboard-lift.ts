import { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/theme';

/** Keep a little air between the composer and the keyboard top edge. */
const KEYBOARD_CLEARANCE = spacing.sm;

/**
 * Android IME suggestion / autocomplete strip often sits above the reported
 * keyboard frame (or appears after `keyboardDidShow` without resizing the
 * window again). With `softwareKeyboardLayoutMode: resize`, `remaining` is ~0
 * and that strip covers the focused composer unless we add this extra lift.
 */
const ANDROID_IME_SUGGESTION_EXTRA = 48;

/**
 * Lift the composer by whatever keyboard height the layout hasn't already absorbed.
 * Android edge-to-edge can partially resize the window — subtracting only the remainder
 * avoids both under-lift (covered input) and double-lift.
 * iOS should pair this with KeyboardAvoidingView (lift stays 0).
 */
export function useComposerKeyboardLift() {
  const insets = useSafeAreaInsets();
  const baselineHeightRef = useRef(Dimensions.get('window').height);
  const keyboardHeightRef = useRef(0);

  const [lift, setLift] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const recompute = (keyboardHeight: number, metrics?: KeyboardEvent['endCoordinates']) => {
      keyboardHeightRef.current = keyboardHeight;
      const windowHeight = Dimensions.get('window').height;
      const open = keyboardHeight > 0;

      if (!open) {
        baselineHeightRef.current = windowHeight;
        setKeyboardOpen(false);
        setLift(0);
        return;
      }

      setKeyboardOpen(true);

      if (Platform.OS === 'ios') {
        // iOS uses KeyboardAvoidingView; keep lift at 0 to avoid double-adjustment.
        setLift(0);
        return;
      }

      // Prefer the live frame: screenY is the top of the IME (incl. suggestion bar when
      // reported). Overlap vs the current window bottom catches under-reported heights.
      const frameHeight = metrics?.height ?? keyboardHeight;
      const overlapFromScreenY = metrics != null ? Math.max(0, windowHeight - metrics.screenY) : 0;
      const covered = Math.max(frameHeight, overlapFromScreenY);

      // Android: only lift the portion not already taken by window resize / insets.
      const shrunkBy = Math.max(0, baselineHeightRef.current - windowHeight);
      const remaining = Math.max(0, covered - shrunkBy);

      // Always clear the suggestion / autocomplete strip. With `resize` layout mode,
      // remaining is often ~0 and that strip still paints over the focused field.
      setLift(remaining + KEYBOARD_CLEARANCE + ANDROID_IME_SUGGESTION_EXTRA);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      recompute(event.endCoordinates.height, event.endCoordinates);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      recompute(0);
    });
    // Suggestion bar / emoji tray can change IME height after the initial show.
    const frameSub =
      Platform.OS === 'android'
        ? Keyboard.addListener('keyboardDidChangeFrame', (event) => {
            const height = event.endCoordinates.height;
            if (height > 0 || keyboardHeightRef.current > 0) {
              recompute(height, event.endCoordinates);
            }
          })
        : null;
    const dimSub = Dimensions.addEventListener('change', () => {
      recompute(keyboardHeightRef.current);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      frameSub?.remove();
      dimSub.remove();
    };
  }, []);

  const composerPaddingBottom = keyboardOpen
    ? KEYBOARD_CLEARANCE
    : Math.max(insets.bottom, KEYBOARD_CLEARANCE);

  return { lift, composerPaddingBottom, keyboardOpen };
}
