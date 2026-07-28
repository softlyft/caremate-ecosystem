import { Platform, TextStyle } from 'react-native';

import { palette } from '@/theme/colors';

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  fallback: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
} as const;

export const textColors = {
  primary: palette.text,
  secondary: palette.textSecondary,
  /** Matches muted-foreground; ≥4.5:1 on white for readable placeholders */
  placeholder: palette.textSecondary,
  disabled: '#D1D5DB',
  brand: palette.primary,
  inverse: '#FFFFFF',
} as const;

export const typography = {
  heroGreeting: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 25,
    letterSpacing: -0.3,
    color: textColors.primary,
  },
  welcome: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    color: textColors.primary,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    color: textColors.secondary,
  },
  searchPlaceholder: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    fontWeight: '400',
    color: textColors.placeholder,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    color: textColors.primary,
  },
  seeAll: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    fontWeight: '500',
    color: textColors.brand,
  },
  quickActionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 17,
    fontWeight: '600',
    color: textColors.primary,
  },
  quickActionSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: textColors.secondary,
  },
  categoryPill: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    fontWeight: '500',
    color: textColors.primary,
  },
  articleTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    color: textColors.primary,
  },
  articleDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 23,
    color: textColors.secondary,
  },
  readingTime: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    fontWeight: '500',
    color: textColors.secondary,
  },
  providerName: {
    fontFamily: fontFamily.semiBold,
    fontSize: 17,
    fontWeight: '600',
    color: textColors.primary,
  },
  providerMeta: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    fontWeight: '500',
    color: textColors.secondary,
  },
  dailyTipTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    fontWeight: '600',
    color: textColors.brand,
  },
  dailyTipBody: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 24,
    color: textColors.primary,
  },
  navLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    fontWeight: '500',
  },
  button: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0,
  },
  screenTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    color: textColors.primary,
  },
  cardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    color: textColors.primary,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: textColors.primary,
  },
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    fontWeight: '500',
    color: textColors.secondary,
  },
  badge: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    fontWeight: '500',
    color: textColors.brand,
  },
  link: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: textColors.brand,
  },
  formError: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    fontWeight: '500',
  },
  comingSoon: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    fontWeight: '500',
    color: textColors.secondary,
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export const typographyClasses = {
  heroGreeting:
    'text-[20px] leading-[25px] font-bold tracking-[-0.3px] text-foreground font-heading',
  welcome: 'text-lg leading-6 font-semibold text-foreground font-heading',
  subtitle: 'text-[13px] leading-[18px] text-muted-foreground font-sans',
  searchPlaceholder: 'text-base text-muted-foreground font-sans',
  sectionTitle: 'text-[18px] leading-6 font-semibold text-foreground font-heading',
  seeAll: 'text-[15px] font-medium text-primary font-sans',
  quickActionTitle: 'text-[17px] font-semibold text-foreground font-heading',
  quickActionSubtitle: 'text-sm leading-5 text-muted-foreground font-sans',
  categoryPill: 'text-sm font-medium text-foreground font-sans',
  articleTitle: 'text-lg leading-[26px] font-semibold text-foreground font-heading',
  articleDescription: 'text-[15px] leading-[23px] text-muted-foreground font-sans',
  readingTime: 'text-[13px] font-medium text-muted-foreground font-sans',
  providerName: 'text-[17px] font-semibold text-foreground font-heading',
  providerMeta: 'text-[13px] font-medium text-muted-foreground font-sans',
  dailyTipTitle: 'text-lg font-semibold text-primary font-heading',
  dailyTipBody: 'text-[15px] leading-6 text-foreground font-sans',
  navLabel: 'text-xs font-medium font-sans',
  button: 'text-base font-semibold font-heading',
  screenTitle: 'text-[28px] leading-[34px] font-bold text-foreground font-heading',
  cardTitle: 'text-lg leading-[26px] font-semibold text-foreground font-heading',
  body: 'text-[15px] leading-[22px] text-foreground font-sans',
  caption: 'text-[13px] font-medium text-muted-foreground font-sans',
  badge: 'text-xs font-medium text-primary font-sans',
  link: 'text-sm font-semibold text-primary font-sans',
  formError: 'text-[13px] font-medium font-sans',
  comingSoon: 'text-[11px] font-medium text-muted-foreground font-sans',
} as const satisfies Record<TypographyVariant, string>;

export const layoutSpacing = {
  greetingToWelcome: 4,
  welcomeToSubtitle: 6,
  sectionTitleToContent: 16,
  cardTitleToDescription: 8,
  betweenSections: 32,
  screenHorizontal: 20,
  cardPadding: 16,
} as const;
