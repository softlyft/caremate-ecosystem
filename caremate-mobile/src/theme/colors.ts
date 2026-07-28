export const palette = {
  /** Clinical teal-green — trust over lifestyle vibrancy */
  primary: '#0D9488',
  primaryLight: '#CCFBF1',
  primaryDark: '#0F766E',
  /** RGB channels for rgba() borders/overlays matching `primary` */
  primaryRgb: '13, 148, 136',
  brandBlue: '#2563EB',
  brandBlueLight: '#DBEAFE',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  /** Hairline dividers / cards — keep light */
  divider: '#D1D5DB',
  /** Form field outlines — ≥3:1 on white for WCAG UI contrast */
  inputBorder: '#6B7280',
  text: '#111827',
  textSecondary: '#6B7280',
  blueAccent: '#3B82F6',
  blueLight: '#EFF6FF',
  purpleLight: '#F3E8FF',
  brandPurple: '#7C3AED',
  brandPurpleDark: '#6D28D9',
  orangeLight: '#FFF7ED',
  warning: '#F59E0B',
  danger: '#EF4444',
  shadow: 'rgba(15, 23, 42, 0.08)',
} as const;

export function primaryAlpha(alpha: number): string {
  return `rgba(${palette.primaryRgb}, ${alpha})`;
}

export const colors = {
  light: {
    background: palette.background,
    surface: palette.surface,
    text: palette.text,
    textMuted: palette.textSecondary,
    primary: palette.primary,
    primaryLight: palette.primaryLight,
    primaryDark: palette.primaryDark,
    border: palette.divider,
    inputBorder: palette.inputBorder,
    danger: palette.danger,
    warning: palette.warning,
    success: palette.primary,
    offline: palette.warning,
    blueAccent: palette.blueAccent,
    blueLight: palette.blueLight,
    purpleLight: palette.purpleLight,
    orangeLight: palette.orangeLight,
    brandBlue: palette.brandBlue,
  },
  dark: {
    background: '#0B1220',
    surface: '#111827',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    primary: '#2DD4BF',
    primaryLight: '#134E4A',
    primaryDark: '#5EEAD4',
    border: '#4B5563',
    inputBorder: '#94A3B8',
    danger: '#F87171',
    warning: '#FBBF24',
    success: '#2DD4BF',
    offline: '#F59E0B',
    blueAccent: '#60A5FA',
    blueLight: '#1E3A5F',
    purpleLight: '#3B0764',
    orangeLight: '#431407',
    brandBlue: '#60A5FA',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  screen: 20,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  xxl: 20,
  pill: 24,
  full: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  soft: {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
