import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react';
import { Platform, ScrollView, TextInput } from 'react-native';

import { spacing } from '@/theme';

export type MiniAppKeyboardAwareApi = {
  /** Schedule scrolling the focused field above the soft keyboard. */
  scheduleScrollIntoView: () => void;
};

export const MiniAppKeyboardContext = createContext<MiniAppKeyboardAwareApi | null>(null);

/**
 * Wrap TextInput `onFocus` so fields scroll when the keyboard is already open
 * (keyboard show events alone miss focus moves between fields).
 */
export function useMiniAppKeyboardAwareFocusHandler() {
  const api = useContext(MiniAppKeyboardContext);
  return useCallback(
    <T,>(original?: (event: T) => void) => {
      return (event: T) => {
        original?.(event);
        api?.scheduleScrollIntoView();
      };
    },
    [api],
  );
}

/**
 * Scroll so the focused TextInput sits above `keyboardTop` (screen Y).
 * Falls back to scrollToEnd when the focused input cannot be measured.
 */
export function scrollFocusedInputAboveKeyboard(
  scrollRef: RefObject<ScrollView | null>,
  scrollY: number,
  keyboardTop: number,
  extraGap: number = spacing.md,
): void {
  const scrollView = scrollRef.current;
  if (!scrollView || keyboardTop <= 0) {
    return;
  }

  const focused = TextInput.State.currentlyFocusedInput?.();
  if (!focused) {
    scrollView.scrollToEnd({ animated: true });
    return;
  }

  const applyOverlap = (y: number, height: number) => {
    const overlap = y + height + extraGap - keyboardTop;
    if (overlap <= 0) {
      return;
    }
    scrollView.scrollTo({
      y: Math.max(0, scrollY + overlap),
      animated: true,
    });
  };

  if (typeof focused.measureInWindow === 'function') {
    focused.measureInWindow((_x, y, _width, height) => {
      applyOverlap(y, height);
    });
    return;
  }

  scrollView.scrollToEnd({ animated: true });
}

/** Delay so KeyboardAvoidingView / window resize can settle before measuring. */
export function keyboardScrollDelayMs(): number {
  return Platform.OS === 'ios' ? 100 : 160;
}

export function useScheduleFocusedInputScroll(
  scrollRef: RefObject<ScrollView | null>,
  scrollYRef: RefObject<number>,
  keyboardTopRef: RefObject<number>,
): MiniAppKeyboardAwareApi {
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) {
      clearTimeout(timer);
    }
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const scheduleScrollIntoView = useCallback(() => {
    clearTimers();
    if (keyboardTopRef.current <= 0) {
      return;
    }

    const run = () => {
      scrollFocusedInputAboveKeyboard(scrollRef, scrollYRef.current, keyboardTopRef.current);
    };

    const delay = keyboardScrollDelayMs();
    requestAnimationFrame(() => {
      timersRef.current.push(setTimeout(run, delay));
      // Second pass for modal presentation / multiline growth after focus.
      timersRef.current.push(setTimeout(run, delay + 180));
    });
  }, [clearTimers, keyboardTopRef, scrollRef, scrollYRef]);

  return useMemo(() => ({ scheduleScrollIntoView }), [scheduleScrollIntoView]);
}
