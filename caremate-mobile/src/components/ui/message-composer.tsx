import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, Input } from '@/components/ui/form-controls';
import { layoutSpacing, palette, radius, spacing } from '@/theme';

export function MessageComposer({
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
}: {
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
}) {
  const canSend = value.trim().length > 0 && !sending;

  return (
    <View style={[styles.composer, { paddingBottom, marginBottom }, style]}>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline
        editable={!sending}
        textAlignVertical="top"
        style={styles.input}
      />
      <Button
        style={[styles.sendButton, !canSend && styles.sendDisabled]}
        onPress={onSend}
        disabled={!canSend}
        variant="plain"
      >
        <AppText variant="seeAll" style={styles.sendLabel}>
          {sending ? sendingLabel : sendLabel}
        </AppText>
      </Button>
    </View>
  );
}

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
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
  },
  sendButton: {
    borderRadius: radius.full,
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendDisabled: {
    opacity: 0.45,
  },
  sendLabel: {
    color: '#fff',
  },
});
