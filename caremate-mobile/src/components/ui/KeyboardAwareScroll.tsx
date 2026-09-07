import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MiniAppKeyboardContext,
  useScheduleFocusedInputScroll,
} from '@/hooks/use-keyboard-aware-scroll';
import { spacing } from '@/theme';

/** Default native stack header height used for iOS KeyboardAvoidingView offset. */
export const DEFAULT_STACK_HEADER_HEIGHT = 56;

export type KeyboardAwareScrollHandle = {
  scrollToEnd: (options?: { animated?: boolean }) => void;
};

type KeyboardAwareScrollProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Extra space under content when keyboard is hidden (on top of safe-area bottom). */
  restingBottomPad?: number;
  /** Extra space under content when keyboard is open (on top of keyboard height). */
  keyboardExtraPad?: number;
  /** Native stack / modal header height for iOS offset. */
  headerHeight?: number;
  /** When false, skip safe-area bottom in resting pad (caller already includes it). */
  includeSafeArea?: boolean;
  showsVerticalScrollIndicator?: boolean;
};

/**
 * Scroll + KeyboardAvoidingView that keeps focused TextInputs above the soft keyboard.
 * Provides MiniAppKeyboardContext so shared Input controls schedule scroll-into-view.
 */
export const KeyboardAwareScroll = forwardRef(function KeyboardAwareScroll(
  {
    children,
    contentContainerStyle,
    style,
    restingBottomPad = spacing.xl * 2,
    keyboardExtraPad = spacing.xl * 2,
    headerHeight = DEFAULT_STACK_HEADER_HEIGHT,
    includeSafeArea = true,
    showsVerticalScrollIndicator = false,
  }: KeyboardAwareScrollProps,
  ref: Ref<KeyboardAwareScrollHandle>,
) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardTopRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardApi = useScheduleFocusedInputScroll(scrollRef, scrollYRef, keyboardTopRef);

  useImperativeHandle(ref, () => ({
    scrollToEnd: (options) => scrollRef.current?.scrollToEnd(options),
  }));

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardTopRef.current = event.endCoordinates.screenY;
      setKeyboardHeight(event.endCoordinates.height);
      keyboardApi.scheduleScrollIntoView();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardTopRef.current = 0;
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardApi]);

  const safeBottom = includeSafeArea ? insets.bottom : 0;
  const bottomPad =
    keyboardHeight > 0
      ? Math.max(keyboardHeight - (includeSafeArea ? insets.bottom : 0), 0) + keyboardExtraPad
      : safeBottom + restingBottomPad;
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + headerHeight : 0;

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }

  const contextValue = useMemo(() => keyboardApi, [keyboardApi]);

  return (
    <MiniAppKeyboardContext.Provider value={contextValue}>
      <KeyboardAvoidingView
        style={[styles.flex, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[contentContainerStyle, { paddingBottom: bottomPad }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={false}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          scrollEventThrottle={16}
          onScroll={onScroll}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </MiniAppKeyboardContext.Provider>
  );
});

/** Bottom inset for sheets/modals that are not full-screen scrolls. */
export function useKeyboardBottomInset(extraPad: number = spacing.md): number {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (keyboardHeight > 0) {
    return Math.max(keyboardHeight - insets.bottom, 0) + extraPad;
  }
  return insets.bottom + extraPad;
}

type KeyboardAwareSheetProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  extraPad?: number;
};

/** Bottom sheet / modal card that lifts with the soft keyboard. */
export function KeyboardAwareSheet({
  children,
  style,
  extraPad = spacing.md,
}: KeyboardAwareSheetProps) {
  const bottomInset = useKeyboardBottomInset(extraPad);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.sheetAvoid}
    >
      <View style={[style, { paddingBottom: bottomInset }]}>{children}</View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  sheetAvoid: {
    width: '100%',
  },
});
