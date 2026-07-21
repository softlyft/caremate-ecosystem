import { Text, TextProps, TextStyle } from 'react-native';

import { textColors, TypographyVariant, typography } from '@/theme/typography';

type AppTextProps = TextProps & {
  variant: TypographyVariant;
  color?: keyof typeof textColors | string;
};

export function AppText({ variant, color, style, ...props }: AppTextProps) {
  const token = typography[variant];
  const resolvedColor =
    color && color in textColors ? textColors[color as keyof typeof textColors] : color;

  return (
    <Text {...props} style={[token, resolvedColor ? { color: resolvedColor } : null, style]} />
  );
}

export function textStyle(variant: TypographyVariant, overrides?: TextStyle): TextStyle {
  return { ...typography[variant], ...overrides };
}
