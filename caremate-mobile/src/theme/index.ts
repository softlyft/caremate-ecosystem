import { colors } from '@/theme/colors';

export { colors, palette, primaryAlpha, radius, shadow, spacing } from '@/theme/colors';
export {
  fontFamily,
  layoutSpacing,
  textColors,
  typography,
  typographyClasses,
} from '@/theme/typography';
export type { TypographyVariant } from '@/theme/typography';

/** CareMate is light-mode only (ignores system appearance). */
export function useAppTheme() {
  return {
    isDark: false as const,
    colors: colors.light,
  };
}
