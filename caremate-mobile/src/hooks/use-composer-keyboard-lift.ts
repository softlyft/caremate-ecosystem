import { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/theme';

/** Keep a little air between the composer and the keyboard top edge. */
const KEYBOARD_CLEARANCE = spacing.sm;

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
    const recompute = (keyboardHeight: number) => {
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

      // Android: only lift the portion not already taken by window resize / insets.
      const shrunkBy = Math.max(0, baselineHeightRef.current - windowHeight);
      const remaining = Math.max(0, keyboardHeight - shrunkBy);
      setLift(remaining + KEYBOARD_CLEARANCE);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      recompute(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      recompute(0);
    });
    const dimSub = Dimensions.addEventListener('change', () => {
      recompute(keyboardHeightRef.current);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      dimSub.remove();
    };
  }, []);

  const composerPaddingBottom = keyboardOpen
    ? KEYBOARD_CLEARANCE
    : Math.max(insets.bottom, KEYBOARD_CLEARANCE);

  return { lift, composerPaddingBottom, keyboardOpen };
}
