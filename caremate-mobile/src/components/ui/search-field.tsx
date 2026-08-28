import { Search, X } from 'lucide-react-native';
import type { ReactNode, RefObject } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button, PressableCard } from '@/components/ui/form-controls';
import { fontFamily, layoutSpacing, palette, primaryAlpha, radius, shadow, spacing } from '@/theme';
import { textColors } from '@/theme/typography';

type SearchFieldInlineProps = {
  variant?: 'inline';
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  inputRef?: RefObject<TextInput | null>;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  trailing?: ReactNode;
  inputProps?: Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'style'>;
};

type SearchFieldPressableProps = {
  variant: 'pressable';
  placeholder: string;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  trailing?: ReactNode;
};

export type SearchFieldProps = SearchFieldInlineProps | SearchFieldPressableProps;

export function SearchField(props: SearchFieldProps) {
  if (props.variant === 'pressable') {
    const { placeholder, onPress, accessibilityLabel, style, trailing } = props;
    return (
      <PressableCard
        padded={false}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        accessibilityRole="search"
        onPress={onPress}
        style={[styles.pressableShell, style]}
      >
        <View style={styles.pressableInner}>
          <View style={styles.iconWrap}>
            <Search color={palette.primary} size={18} strokeWidth={2.5} />
          </View>
          <Text style={styles.pressablePlaceholder} numberOfLines={1}>
            {placeholder}
          </Text>
          {trailing}
        </View>
      </PressableCard>
    );
  }

  const {
    value,
    onChangeText,
    placeholder,
    onClear,
    inputRef,
    accessibilityLabel,
    style,
    trailing,
    inputProps,
  } = props;
  const showClear = value.length > 0 && onClear;

  return (
    <View style={[styles.shell, shadow.soft, style]}>
      <View style={styles.iconWrap}>
        <Search color={palette.primary} size={16} strokeWidth={2.5} />
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={textColors.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        style={styles.input}
        {...inputProps}
      />
      {showClear ? (
        <Button
          accessibilityLabel="Clear search"
          onPress={onClear}
          style={styles.clearButton}
          variant="plain"
        >
          <X color={palette.textSecondary} size={16} strokeWidth={2.4} />
        </Button>
      ) : null}
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: primaryAlpha(0.12),
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: palette.text,
    paddingVertical: 4,
  },
  clearButton: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  pressableShell: {
    marginHorizontal: layoutSpacing.screenHorizontal,
    marginBottom: layoutSpacing.sectionTitleToContent,
    borderRadius: radius.xxl,
    borderColor: primaryAlpha(0.12),
    ...shadow.card,
  },
  pressableInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  pressablePlaceholder: {
    flex: 1,
    flexShrink: 1,
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: textColors.placeholder,
  },
});
