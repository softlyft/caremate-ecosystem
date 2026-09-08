import { Send } from 'lucide-react-native';
import { forwardRef, useImperativeHandle, useRef, type ComponentPropsWithRef } from 'react';
import type { StyleProp, TextInput, ViewStyle } from 'react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/form-controls';
import { Input, InputField } from '@/components/ui/input';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export type MessageComposerHandle = {
  focus: () => void;
};

const SEND_BUTTON_SIZE = 44;

export const MessageComposer = forwardRef<
  MessageComposerHandle,
  {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    placeholder: string;
    sending?: boolean;
    sendLabel: string;
    sendingLabel: string;
    style?: StyleProp<ViewStyle>;
    paddingBottom?: number;
    marginBottom?: number;
  }
>(function MessageComposer(
  {
    value,
    onChangeText,
    onSend,
    placeholder,
    sending = false,
    sendLabel,
    sendingLabel,
    style,
    paddingBottom,
    marginBottom,
  },
  ref,
) {
  const inputRef = useRef<TextInput>(null);
  const canSend = value.trim().length > 0 && !sending;

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  function handleSendPress() {
    if (!canSend) return;
    onSend();
    // Tapping send moves focus to the button; refocus so the keyboard stays up for rapid replies.
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  return (
    <View style={[styles.composer, { paddingBottom, marginBottom }, style]}>
      <View style={styles.inputWrap}>
        <Input
          className="min-h-12 bg-secondary border-input px-4 overflow-hidden"
          style={styles.inputShell}
        >
          <InputField
            ref={inputRef as ComponentPropsWithRef<typeof InputField>['ref']}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            multiline
            blurOnSubmit={false}
            textAlignVertical="top"
            className="text-[15px] font-sans py-2.5"
            style={styles.input}
          />
        </Input>
      </View>
      <Button
        style={[styles.sendButton, !canSend && styles.sendDisabled]}
        onPress={handleSendPress}
        disabled={!canSend}
        variant="plain"
        accessibilityLabel={sending ? sendingLabel : sendLabel}
        accessibilityRole="button"
      >
        {sending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Send color="#fff" size={18} strokeWidth={2.4} />
        )}
      </Button>
    </View>
  );
});

MessageComposer.displayName = 'MessageComposer';

const styles = StyleSheet.create({
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
    backgroundColor: palette.background,
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
  },
  inputShell: {
    borderRadius: radius.pill,
  },
  input: {
    minHeight: 42,
    maxHeight: 120,
  },
  sendButton: {
    flexShrink: 0,
    width: SEND_BUTTON_SIZE,
    height: SEND_BUTTON_SIZE,
    borderRadius: radius.full,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
