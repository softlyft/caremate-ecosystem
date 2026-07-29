import { useState, type ReactNode } from 'react';
import {
  type AccessibilityRole,
  type AccessibilityState,
  type GestureResponderEvent,
  type Insets,
  type StyleProp,
  StyleSheet,
  type TextInputProps,
  type TextStyle,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Text as GSText } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { fontFamily, layoutSpacing, palette, radius, shadow, spacing } from '@/theme';
import { textColors } from '@/theme/typography';

export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link' | 'plain';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export type ButtonProps = {
  onPress: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  label?: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** Disables the control and sets accessibilityState.busy. */
  loading?: boolean;
  /** Press-scale factor forwarded to PressableScale (default 0.97). */
  scale?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  hitSlop?: number | Insets;
  testID?: string;
};

const VARIANT_STYLES: Record<
  Exclude<ButtonVariant, 'plain'>,
  { container: ViewStyle; text: TextStyle }
> = {
  primary: {
    container: { backgroundColor: palette.primary },
    text: { color: '#FFFFFF' },
  },
  secondary: {
    container: {
      backgroundColor: palette.background,
      borderWidth: 1.5,
      borderColor: palette.primary,
    },
    text: { color: palette.primary },
  },
  outline: {
    container: {
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    text: { color: palette.text },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: palette.primary },
  },
  destructive: {
    container: { backgroundColor: palette.danger },
    text: { color: '#FFFFFF' },
  },
  link: {
    container: { backgroundColor: 'transparent', minHeight: undefined, paddingVertical: 0 },
    text: { color: palette.primary, textDecorationLine: 'underline' },
  },
};

const SIZE_STYLES: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  default: {
    container: { minHeight: 44, paddingHorizontal: 24, paddingVertical: 12 },
    text: { fontSize: 15 },
  },
  sm: {
    container: { minHeight: 36, paddingHorizontal: 14, paddingVertical: 8 },
    text: { fontSize: 13 },
  },
  lg: {
    container: { minHeight: 52, paddingHorizontal: 28, paddingVertical: 14 },
    text: { fontSize: 16 },
  },
  icon: {
    container: {
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: 0,
      paddingVertical: 0,
      borderRadius: radius.full,
    },
    text: { fontSize: 15 },
  },
};

/**
 * Canonical pressable control. Use labeled variants for CTAs; `plain` for custom layouts
 * (cards, chips, rows) so every tap goes through the same scale interaction.
 */
export function Button({
  label,
  children,
  onPress,
  onLongPress,
  variant = 'primary',
  size = 'default',
  disabled,
  loading,
  scale,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  hitSlop,
  testID,
}: ButtonProps) {
  const isPlain = variant === 'plain';
  const chrome = isPlain ? null : VARIANT_STYLES[variant];
  const sizeStyle = isPlain ? null : SIZE_STYLES[size];
  const isDisabled = Boolean(disabled || loading);

  return (
    <PressableScale
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={accessibilityRole}
      accessibilityState={{
        ...accessibilityState,
        disabled: isDisabled,
        busy: Boolean(loading || accessibilityState?.busy),
      }}
      disabled={isDisabled}
      hitSlop={hitSlop}
      onLongPress={onLongPress}
      onPress={onPress}
      scale={scale}
      style={[
        !isPlain ? styles.buttonBase : null,
        sizeStyle?.container,
        chrome?.container,
        isDisabled ? styles.buttonDisabled : null,
        style,
      ]}
      testID={testID}
    >
      {children ??
        (label ? (
          <Text style={[styles.buttonLabel, sizeStyle?.text, chrome?.text, textStyle]}>
            {label}
          </Text>
        ) : null)}
    </PressableScale>
  );
}

/** Icon-only control with the default circular chrome used in headers. */
export function IconButton({
  children,
  style,
  accessibilityLabel,
  ...props
}: Omit<ButtonProps, 'label' | 'variant' | 'size' | 'children'> & {
  children: ReactNode;
  accessibilityLabel: string;
}) {
  return (
    <Button
      {...props}
      accessibilityLabel={accessibilityLabel}
      size="icon"
      style={[styles.iconButton, style]}
      variant="plain"
    >
      {children}
    </Button>
  );
}

export type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

/** Static surface card — borders/radius/shadow shared across screens. */
export function Card({ children, style, padded = true }: CardProps) {
  return <View style={[styles.card, padded ? styles.cardPadded : null, style]}>{children}</View>;
}

export type PressableCardProps = Omit<ButtonProps, 'label' | 'variant' | 'size' | 'children'> & {
  children: ReactNode;
  padded?: boolean;
};

/** Pressable surface using the shared card chrome + scale interaction. */
export function PressableCard({ children, style, padded = true, ...props }: PressableCardProps) {
  return (
    <Button
      {...props}
      style={[styles.card, padded ? styles.cardPadded : null, style]}
      variant="plain"
    >
      {children}
    </Button>
  );
}

export type ChoiceChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  accent?: string;
  soft?: string;
};

/** Selectable pill used for blood group, gender, filters, etc. */
export function ChoiceChip({
  label,
  selected = false,
  onPress,
  disabled,
  accent = palette.primary,
  soft = palette.primaryLight,
}: ChoiceChipProps) {
  return (
    <Button
      accessibilityState={{ selected }}
      disabled={disabled}
      onPress={onPress}
      scale={0.96}
      style={[
        styles.choiceChip,
        selected
          ? { backgroundColor: soft, borderColor: accent, borderWidth: 2 }
          : { backgroundColor: palette.background, borderColor: palette.divider },
      ]}
      variant="plain"
    >
      <Text
        style={[
          styles.choiceChipLabel,
          { color: selected ? accent : palette.text, fontWeight: selected ? '600' : '500' },
        ]}
      >
        {label}
      </Text>
    </Button>
  );
}

export function InputControl({
  placeholderTextColor = textColors.placeholder,
  ...props
}: TextInputProps) {
  return (
    <Input className="rounded-xl min-h-12 bg-secondary border-input">
      <InputField
        className="text-[15px] font-sans"
        placeholderTextColor={placeholderTextColor}
        {...props}
      />
    </Input>
  );
}

export { InputControl as Input };

export function PasswordInput({
  placeholderTextColor = textColors.placeholder,
  ...props
}: TextInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <Input className="rounded-xl min-h-12 bg-secondary border-input">
      <InputField
        autoCapitalize="none"
        autoCorrect={false}
        className="text-[15px] font-sans"
        secureTextEntry={!visible}
        textContentType="password"
        placeholderTextColor={placeholderTextColor}
        {...props}
      />
      <InputSlot
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setVisible((current) => !current)}
        className="h-11 w-11"
      >
        <Icon color={palette.textSecondary} size={20} strokeWidth={2.2} />
      </InputSlot>
    </Input>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <VStack className="gap-1">
      <GSText className="text-[28px] leading-[34px] font-bold text-foreground font-heading">
        {title}
      </GSText>
      {subtitle ? (
        <GSText className="text-[15px] leading-[22px] text-muted-foreground font-sans">
          {subtitle}
        </GSText>
      ) : null}
    </VStack>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonLabel: {
    fontFamily: fontFamily.semiBold,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.divider,
    ...shadow.soft,
  },
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: palette.divider,
    overflow: 'hidden',
    ...shadow.soft,
  },
  cardPadded: {
    padding: layoutSpacing.cardPadding,
  },
  choiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceChipLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
  },
});
