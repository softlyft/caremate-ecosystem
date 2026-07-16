import { useColorScheme } from 'react-native';

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

export function useAppTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    isDark,
    colors: isDark ? colors.dark : colors.light,
  };
}
